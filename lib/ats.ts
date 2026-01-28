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

        // 4. Handle Parse Failure
        if (parseFailed || !resumeText || resumeText.length < 50) {
            const { error: updateError } = await supabaseAdmin.from("applications").update({
                status: 'parse_failed',
                ats_summary: "Resume parsing failed. Please re-upload resume.",
            }).eq("id", applicationId);

            if (updateError) {
                console.error("Failed to update status to parse_failed:", updateError);
                return { success: false, message: "DB Error: " + updateError.message };
            }

            await sendParseFailedEmail(application.email, application.full_name);
            return { success: true, status: 'parse_failed' };
        }

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
            console.error("All AI models failed. Using fixed fallback.");
            atsScore = 65;
            atsSummary = "AI service unavailable. Application marked for manual review (Fallback Score).";

            const initialStages = ['APPLIED', 'applied', 'SUBMITTED', 'submitted', 'PARSE_FAILED', 'parse_failed'];
            if (initialStages.includes(application.status)) {
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
            ats_scored_at: new Date().toISOString()
        }).eq("id", applicationId);

        // Send Success Email ONLY if valid status (skip for fallback usually, or send generic?)
        // User didn't specify strict email rule for fallback, but safe to send Result Email if shortlisted/rejected.
        // If SCORED_FALLBACK, maybe don't send "Shortlisted" email yet?
        // Logic below sends based on status 'shortlisted' vs other.
        // 'SCORED_FALLBACK' will trigger the 'else' branch -> "Application Update... decided not to proceed" which might be wrong for fallback (65).
        // 65 is usually "Hold".
        // I will SKIP email for Fallback to avoid sending "Rejected" prematurely.
        if (finalStatus !== 'SCORED_FALLBACK') {
            const normalizedStatus = finalStatus.toLowerCase();
            await sendResultEmail(application.email, application.full_name, normalizedStatus, atsScore);
        }

        return { success: true, status: finalStatus, score: atsScore, summary: atsSummary };

    } catch (err) {
        console.error("Critical ATS Error:", err);
        return { success: false, message: "Critical System Error" };
    }
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
