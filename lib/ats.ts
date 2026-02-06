import { supabaseAdmin } from "@/lib/supabaseAdmin";
import mammoth from "mammoth";

export async function scoreApplication(applicationId: string) {
    try {
        console.log(`Starting ATS Scoring for Application: ${applicationId}`);

        // 1. Fetch Application + Profile
        const { data: application, error: fetchError } = await supabaseAdmin
            .from('applications')
            .select('*, profiles(*)')
            .eq('id', applicationId)
            .single();

        if (fetchError || !application) {
            console.error("Application not found:", fetchError);
            return { success: false, message: "Application not found" };
        }

        // LOCK: Prevent Re-Scoring
        if (application.ats_score > 0 || application.ats_score_locked) {
            console.log("ATS Score LOCKED (or Legacy Score exists). Returning existing score.");
            return {
                success: true,
                score: application.ats_score,
                status: application.status,
                ats_summary: application.ats_summary,
                message: "Score already generated (Locked)"
            };
        }

        const resumeUrl = application.resume_url;
        let fileBuffer: Buffer | null = null;
        let resumeText = "";

        // 2. Download Resume
        if (resumeUrl) {
            try {
                let bucketName = "resumes";
                let filePath = resumeUrl;

                if (resumeUrl.startsWith('http')) {
                    const urlParts = resumeUrl.split('/resumes/');
                    if (urlParts.length > 1) filePath = urlParts[1];
                }
                filePath = decodeURIComponent(filePath);

                const { data: signedData, error: signError } = await supabaseAdmin
                    .storage
                    .from(bucketName)
                    .createSignedUrl(filePath, 60);

                if (!signError && signedData?.signedUrl) {
                    const response = await fetch(signedData.signedUrl);
                    if (response.ok) {
                        const arrayBuffer = await response.arrayBuffer();
                        fileBuffer = Buffer.from(arrayBuffer);
                    }
                }
            } catch (err) {
                console.warn(`Download failed for App ${applicationId}`, err);
            }
        }

        // 3. Parsing Logic
        let parseFailed = false;
        if (fileBuffer && resumeUrl) {
            const lowerUrl = resumeUrl.toLowerCase();
            try {
                if (lowerUrl.endsWith('.pdf')) {
                    const mod = await import("pdf-parse") as any;
                    const pdfParse = typeof mod === "function" ? mod : typeof mod.default === "function" ? mod.default : typeof mod.default?.default === "function" ? mod.default.default : null;

                    if (pdfParse) {
                        const pdfData = await pdfParse(fileBuffer);
                        resumeText = pdfData?.text?.trim() || "";
                    }
                } else if (lowerUrl.match(/\.docx?$/)) {
                    const result = await mammoth.extractRawText({ buffer: fileBuffer });
                    resumeText = result?.value?.trim() || "";
                }
            } catch (err) {
                console.error("Parsing Error:", err);
                parseFailed = true;
            }
        } else {
            parseFailed = true;
        }

        let atsScore = 0;
        let atsSummary = "";
        let finalStatus = "";

        // 5. AI Scoring Only (OpenRouter Priority)
        atsScore = 0;
        atsSummary = "";
        finalStatus = "";

        const prompt = `You are an ATS resume evaluator. Evaluate the following resume and return ONLY valid JSON.\nScoring rules:\n- Skills match: 40%\n- Experience relevance: 30%\n- Education & certifications: 20%\n- Resume clarity: 10%\n\nReturn JSON EXACTLY like this:\n{\n  "score": number,\n  "summary": "one line feedback"\n}\n\nResume Text:\n${resumeText.substring(0, 10000)}`;

        const models = [
            "deepseek/deepseek-chat",
            "qwen/qwen-2.5-7b-instruct",
            "mistralai/mistral-7b-instruct"
        ];

        let aiSuccess = false;

        // Try AI ONLY if parse succeeded
        if (!parseFailed && resumeText.length >= 50) {
            for (const model of models) {
                try {
                    console.log(`Attempting ATS Score with model: ${model}`);
                    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                            "Content-Type": "application/json",
                            "HTTP-Referer": "https://recruitai.com",
                        },
                        body: JSON.stringify({
                            model: model,
                            messages: [{ role: "user", content: prompt }],
                            response_format: { type: "json_object" }
                        }),
                        signal: AbortSignal.timeout(45000) // 45s Timeout per model
                    });

                    if (aiRes.ok) {
                        const data = await aiRes.json();
                        const content = data.choices?.[0]?.message?.content;
                        if (!content) throw new Error("Empty AI Response");

                        let result;
                        try {
                            result = JSON.parse(content);
                        } catch (e) {
                            // Try cleaning markdown code blocks if present
                            const clean = content.replace(/```json/g, '').replace(/```/g, '').trim();
                            result = JSON.parse(clean);
                        }

                        if (typeof result.score === 'number') {
                            atsScore = result.score;
                            atsSummary = result.summary || "Evaluation completed.";
                            aiSuccess = true;
                            console.log(`Success with ${model}`);
                            break; // Stop if success
                        }
                    } else {
                        console.warn(`Model ${model} failed: ${aiRes.status}`);
                    }
                } catch (err) {
                    console.warn(`Error with ${model}:`, err);
                }
            }
        }

        let fallbackUsed = false;
        let parseStatus = aiSuccess ? 'success' : (parseFailed ? 'failed' : 'ai_failed');

        if (aiSuccess) {
            // Clamp Score
            if (atsScore < 0) atsScore = 0;
            if (atsScore > 100) atsScore = 100;

            const initialStages = ['APPLIED', 'applied', 'SUBMITTED', 'submitted', 'PARSE_FAILED', 'parse_failed'];
            if (initialStages.includes(application.status)) {
                finalStatus = atsScore >= 70 ? "SHORTLISTED" : "REJECTED";
            } else {
                finalStatus = application.status; // Preserve existing status
            }
        } else {
            console.warn("Using Fallback Scoring Strategy (Parse Failed or AI Unavailable)");

            // FALLBACK STRATEGY
            // Use profile data from the joined query
            const profile = application.profiles || {};
            atsScore = calculateFallbackScore(profile);
            atsSummary = "Estimated score (resume parse failed)";
            fallbackUsed = true;

            const initialStages = ['APPLIED', 'applied', 'SUBMITTED', 'submitted', 'PARSE_FAILED', 'parse_failed'];
            if (initialStages.includes(application.status)) {
                // If the estimated score is high enough, we can shortlist, but maybe safer to keep as SCORED_FALLBACK
                // The requirement says "Allow application submission".
                // We'll use SCORED_FALLBACK to indicate it needs attention / verify.
                finalStatus = "SCORED_FALLBACK";
            } else {
                finalStatus = application.status;
            }
        }

        if (!atsSummary || atsSummary.trim() === "") {
            atsSummary = "Evaluation completed. (No detailed feedback generated)";
        }

        // Update DB
        await supabaseAdmin.from("applications").update({
            ats_score: atsScore,
            ats_summary: atsSummary,
            status: finalStatus,
            ats_score_locked: true,
            ats_scored_at: new Date().toISOString(),
            fallback_used: fallbackUsed,
            resume_parse_status: parseStatus === 'success' ? 'SUCCESS' : 'FAILED'
        }).eq("id", applicationId);

        // Send Success Email ONLY if valid status (skip for fallback usually, or send generic?)
        if (finalStatus !== 'SCORED_FALLBACK') {
            const normalizedStatus = finalStatus.toLowerCase();
            await sendResultEmail(application.email, application.full_name, normalizedStatus, atsScore);
        }

        return { success: true, status: finalStatus, score: atsScore, summary: atsSummary, fallback: fallbackUsed };

    } catch (err) {
        console.error("Critical ATS Error:", err);
        return { success: false, message: "Critical System Error" };
    }
}

function calculateFallbackScore(profile: any): number {
    let score = 0;

    // 1. Skills (if ≥3): +25
    const skills = profile.skills || [];
    // Handle if skills is string or array
    const skillCount = Array.isArray(skills) ? skills.length : (typeof skills === 'string' ? skills.split(',').length : 0);
    if (skillCount >= 3) score += 25;

    // 2. Degree present: +20
    // education is usually jsonb { degree, college, year }
    const edu = profile.education || {};
    if (edu.degree && edu.degree.trim().length > 0) score += 20;

    // 3. Graduation Year valid: +15
    if (edu.year && /^\d{4}$/.test(String(edu.year))) score += 15;

    // 4. Preferred Job Roles selected: +20
    const roles = profile.preferred_job_roles || profile.preferred_roles || [];
    const roleCount = Array.isArray(roles) ? roles.length : (typeof roles === 'string' ? roles.split(',').length : 0);
    if (roleCount > 0) score += 20;

    // 5. College provided (selected or manual): +10
    if (edu.college && edu.college.trim().length > 0) score += 10;

    // 6. Location provided: +10
    // Check fields on profile: address_city, address_state
    if (profile.address_city || profile.address_state || profile.location) score += 10;

    // Limits
    if (score < 50) score = 50;
    if (score > 100) score = 100;

    return score;
}

async function sendParseFailedEmail(to: string, name: string) {
    try {
        const { sendEmail } = await import("@/lib/email");
        const firstName = name?.split(' ')[0] || "Candidate";
        await sendEmail({
            to,
            subject: "Action Required: Please Re-upload Your Resume",
            html: `<p>Dear ${firstName},</p><p>Your resume could not be processed by our system.</p><p>Please <strong>log in and upload your resume again</strong> to continue evaluation.</p>`
        });
    } catch (e) { console.error("Email Error:", e); }
}

async function sendResultEmail(to: string, name: string, status: string, score: number) {
    try {
        const { sendEmail } = await import("@/lib/email");
        const firstName = name?.split(' ')[0] || "Candidate";
        let subject = "", html = "";

        if (status === 'shortlisted') {
            subject = "You’ve been shortlisted – RecruitAI";
            html = `<h1>Congratulations!</h1><p>Dear ${firstName},</p><p>We are pleased to inform you that your profile has been <strong>shortlisted</strong>.</p><p>ATS Score: ${score}%</p>`;
        } else {
            subject = "Application Update – RecruitAI";
            html = `<p>Dear ${firstName},</p><p>Thank you for your interest. After review, we have decided not to proceed.</p>`;
        }
        await sendEmail({ to, subject, html });
    } catch (e) { console.error("Email Error:", e); }
}
