"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { generateInterviewQuestions } from "@/lib/ai";
import { sendEmail } from "@/lib/email";

export async function getInteviewCandidates() {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== 'ADMIN') {
        throw new Error("Unauthorized");
    }

    // Fetch candidates who PASSED the exam
    // We also need to check verification status.
    // Fetch candidates who PASSED the exam
    const { data: candidates, error } = await supabaseAdmin
        .from('applications')
        .select('id, user_id, full_name, email, status')
        .eq('status', 'EXAM_PASSED');

    if (error) {
        console.error("Error fetching interview candidates:", error);
        return [];
    }

    if (!candidates || candidates.length === 0) return [];

    // Manual Join for Verification Status
    const userIds = candidates.map(c => c.user_id);
    const { data: profiles } = await supabaseAdmin
        .from('candidate_profiles')
        .select('user_id, phone_verified, email_verified, verified_by_admin')
        .in('user_id', userIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    // Filter strictly for verified candidates (Admin verification overrides system verification)
    return candidates.filter(c => {
        const profile = profileMap.get(c.user_id);
        // Only return if verified by admin
        return profile && profile.verified_by_admin;
    });
}

export async function getInterviews() {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== 'ADMIN') {
        throw new Error("Unauthorized");
    }

    const { data: interviews, error } = await supabaseAdmin
        .from('interviews')
        .select('*')
        .order('scheduled_at', { ascending: true });

    if (error) throw error;

    if (!interviews || interviews.length === 0) return [];

    // Manual Join with Profiles (Since FK is to auth.users, not public.profiles)
    const candidateIds = Array.from(new Set(interviews.map(i => i.candidate_id)));

    const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .in('id', candidateIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    // Attach profile data
    return interviews.map(i => ({
        ...i,
        candidate_profiles: profileMap.get(i.candidate_id) || { full_name: 'Unknown', email: 'N/A' }
    }));
}

export async function scheduleInterview(data: {
    applicationId: string;
    candidateId: string;
    scheduledAt: string; // ISO string
    duration: number;
    mode: 'AI' | 'MANUAL';
    role: string; // For AI generation context
    skills: string[]; // For AI generation context
}) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== 'ADMIN') {
        return { error: "Unauthorized" };
    }

    try {
        console.log("Scheduling interview for:", data.candidateId);

        // 1. Create Interview Record
        const { data: interview, error: insertError } = await supabaseAdmin
            .from('interviews')
            .insert({
                application_id: data.applicationId,
                candidate_id: data.candidateId,
                scheduled_at: data.scheduledAt,
                duration_minutes: data.duration,
                mode: data.mode,
                status: 'scheduled',
                created_by: session.user.id
            })
            .select()
            .single();

        if (insertError) throw insertError;

        // 2. Generate Questions via AI (if AI mode)
        if (data.mode === 'AI') {
            console.log("Generating AI questions...");
            try {
                // We need role and skills. If not passed, we might need to fetch them from profile application
                // Assuming they are passed or we fetch them here.
                // For now relying on passed data or generic fallback.
                // @ts-ignore
                const questions = await generateInterviewQuestions(data.role, data.skills || []);

                if (questions && questions.length > 0) {
                    const questionsPayload = questions.map((q: any) => {
                        const isString = typeof q === 'string';
                        return {
                            interview_id: interview.id,
                            question: isString ? q : q.question || "Unknown Question",
                            type: isString ? 'technical' : q.type || 'technical',
                            expected_keywords: isString ? [] : q.expected_keywords || [],
                            marks: 10 // Default
                        };
                    });

                    const { error: qError } = await supabaseAdmin
                        .from('interview_questions')
                        .insert(questionsPayload);

                    if (qError) console.error("Failed to insert questions:", qError);
                }
            } catch (aiError) {
                console.error("AI Question Generation Failed:", aiError);
                // Non-blocking? Or warning? 
                // We'll proceed but log it. Maybe update status to 'setup_failed' if strict?
            }
        }

        // 3. Update Application Status
        await supabaseAdmin
            .from('applications')
            .update({ status: 'INTERVIEW_SCHEDULED' })
            .eq('id', data.applicationId);

        // 4. Send Email Notification
        const { data: user } = await supabaseAdmin.auth.admin.getUserById(data.candidateId);
        if (user && user.user?.email) {
            const dateStr = new Date(data.scheduledAt).toLocaleString();
            await sendEmail({
                to: user.user.email,
                subject: "Interview Scheduled - RecruitAI",
                html: `
                    <h1>Interview Scheduled</h1>
                    <p>Dear Candidate,</p>
                    <p>Your AI interview has been scheduled for <strong>${dateStr}</strong>.</p>
                    <p>Duration: ${data.duration} minutes.</p>
                    <p>Please log in to your dashboard at the scheduled time to begin.</p>
                    <p>Ensure you have a working camera and microphone.</p>
                    <br/>
                    <p>Best Regards,<br/>RecruitAI Team</p>
                `
            });
        }

        revalidatePath('/admin/dashboard');
        return { success: true };

    } catch (error: any) {
        console.error("Schedule Error:", error);
        return { error: error.message };
    }
}

export async function getInterviewQuestions(interviewId: string) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || !session.user) throw new Error("Unauthorized");

    // Verify interview ownership
    const { data: interview } = await supabaseAdmin
        .from('interviews')
        .select('*')
        .eq('id', interviewId)
        .eq('candidate_id', session.user.id)
        .single();

    if (!interview) throw new Error("Interview not found or unauthorized");

    if (interview.status === 'completed') throw new Error("Interview already completed");

    // Fetch questions
    const { data: questions, error } = await supabaseAdmin
        .from('interview_questions')
        .select('id, question, type, expected_keywords')
        .eq('interview_id', interviewId)
        .order('id', { ascending: true }); // Ensure consistent order

    if (error) throw error;
    return questions || [];
}

export async function submitInterviewResponse(data: {
    interviewId: string;
    questionId: string;
    answer: string;
    videoUrl?: string;
}) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || !session.user) return { error: "Unauthorized" };

    console.log(`Submitting response for Interview: ${data.interviewId}, Question: ${data.questionId}`);

    // Check if response already exists? Or just insert?
    // Reverting to insert to avoid potential unique constraint issues with upsert
    const { error } = await supabaseAdmin
        .from('interview_responses')
        .insert({
            interview_id: data.interviewId,
            question_id: data.questionId,
            // candidate_id removed as it doesn't exist in schema
            answer_text: data.answer,
            answer_audio_url: data.videoUrl, // Assuming videoUrl maps to audio_url or we need to add video_url column later 
            score: 0
        });

    if (error) {
        console.error("Submit Response Error:", error);
        return { error: `Failed to save response: ${error.message}` };
    }

    return { success: true };
}

export async function completeInterview(interviewId: string) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || !session.user) return { error: "Unauthorized" };

    const { error } = await supabaseAdmin
        .from('interviews')
        .update({ status: 'completed' })
        .eq('id', interviewId)
        .eq('candidate_id', session.user.id);

    if (error) return { error: error.message };

    // 1. Get Interview to find Application ID
    const { data: interview } = await supabaseAdmin
        .from('interviews')
        .select('application_id')
        .eq('id', interviewId)
        .single();

    if (!interview) return { error: "Interview not found" };

    // 2. Update Application Status
    const { error: appError } = await supabaseAdmin
        .from('applications')
        .update({ status: 'INTERVIEW_COMPLETED' })
        .eq('id', interview.application_id);

    if (appError) console.error("Failed to update app status on complete:", appError);

    return { success: true };
}

export async function getInterviewDetails(interviewId: string) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== 'ADMIN') {
        throw new Error("Unauthorized");
    }

    // Fetch interview with candidate details
    const { data: interview, error } = await supabaseAdmin
        .from('interviews')
        .select('*')
        .eq('id', interviewId)
        .single();

    if (error || !interview) throw new Error("Interview not found");

    // Fetch candidate profile manually
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email')
        .eq('id', interview.candidate_id)
        .single();

    // Fetch Application Status
    const { data: application } = await supabaseAdmin
        .from('applications')
        .select('status')
        .eq('id', interview.application_id)
        .single();

    // Fetch questions and responses
    const { data: questions } = await supabaseAdmin
        .from('interview_questions')
        .select('*')
        .eq('interview_id', interviewId)
        .order('id', { ascending: true });

    const { data: responses } = await supabaseAdmin
        .from('interview_responses')
        .select('*')
        .eq('interview_id', interviewId);

    // Combine data
    const detailedQuestions = (questions || []).map(q => {
        const response = (responses || []).find(r => r.question_id === q.id);
        return {
            ...q,
            response: response ? {
                answer: response.answer_text, // CORRECTED FIELD NAME
                score: response.score,
                feedback: response.ai_feedback, // CORRECTED FIELD NAME (schema says ai_feedback, not feedback)
                video_url: response.answer_audio_url // CORRECTED FIELD NAME
            } : null
        };
    });

    return {
        ...interview,
        candidate: profile || { full_name: 'Unknown', email: 'N/A' },
        application: application || { status: 'UNKNOWN' },
        questions: detailedQuestions
    };
}

export async function updateResponseScore(questionId: string, interviewId: string, score: number) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== 'ADMIN') {
        throw new Error("Unauthorized");
    }

    // 1. Update the specific response score
    const { error } = await supabaseAdmin
        .from('interview_responses')
        .update({ score })
        .eq('question_id', questionId) // Matches the specific question
        .eq('interview_id', interviewId);

    if (error) {
        console.error("Score Update Error:", error);
        throw new Error("Failed to update score");
    }

    // 2. Recalculate Total Interview Score
    // Fetch all questions to get max marks
    const { data: questions } = await supabaseAdmin
        .from('interview_questions')
        .select('id, marks')
        .eq('interview_id', interviewId);

    // Fetch all responses to get current scores
    const { data: responses } = await supabaseAdmin
        .from('interview_responses')
        .select('question_id, score')
        .eq('interview_id', interviewId);

    if (questions && responses) {
        let totalMaxScore = 0;
        let totalObtainedScore = 0;

        questions.forEach(q => {
            const max = q.marks || 10;
            totalMaxScore += max;

            const response = responses.find(r => r.question_id === q.id);
            if (response && response.score !== null) {
                totalObtainedScore += response.score;
            }
        });

        // Calculate percentage (0-100)
        // Avoid division by zero
        const finalScore = totalMaxScore > 0
            ? Math.round((totalObtainedScore / totalMaxScore) * 100)
            : 0;

        // 3. Update the parent interview record
        await supabaseAdmin
            .from('interviews')
            .update({ score: finalScore })
            .eq('id', interviewId);
    }

    return { success: true };
}

export async function finalizeInterviewDecision(interviewId: string, decision: 'HIRED' | 'REJECTED') {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== 'ADMIN') {
        throw new Error("Unauthorized");
    }

    // 1. Get Interview to find Application ID
    const { data: interview } = await supabaseAdmin
        .from('interviews')
        .select('application_id')
        .eq('id', interviewId)
        .single();

    if (!interview) throw new Error("Interview not found");

    console.log(`[Finalize] Interview ID: ${interviewId}, App ID: ${interview.application_id}, Decision: ${decision}`);

    if (!interview.application_id) {
        console.error("[Finalize] CRITICAL: Interview has no application_id linked!");
        throw new Error("Interview record is missing application_id link");
    }

    // 2. Update Application Status
    const status = decision === 'HIRED' ? 'HIRED' : 'REJECTED';
    const { error: appError } = await supabaseAdmin
        .from('applications')
        .update({ status: status })
        .eq('id', interview.application_id);

    if (appError) {
        console.error("[Finalize] App update failed:", appError);
        throw new Error("Failed to update application status");
    } else {
        console.log("[Finalize] App status updated successfully");
    }

    // 3. Update Interview Status if needed (ensure it's completed)
    await supabaseAdmin
        .from('interviews')
        .update({ status: 'completed' })
        .eq('id', interviewId);

    // 4. Send Email Notification
    // Fetch candidate details from application or profiles
    const { data: application } = await supabaseAdmin
        .from('applications')
        .select('email, full_name')
        .eq('id', interview.application_id)
        .single();

    if (application) {
        try {
            await import('@/lib/mail').then(mod =>
                mod.sendStatusUpdateEmail(application.email, application.full_name, decision)
            );
        } catch (e) {
            console.error("Email dispatch failed:", e);
        }
    }

    return { success: true };
}

// ------------------------------------------------------------------
// NEW: Strict Scheduling Validation
// ------------------------------------------------------------------

export async function validateInterviewAccess(interviewId: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return { error: "Unauthorized" };

    const { data: interview } = await supabaseAdmin
        .from('interviews')
        .select('*')
        .eq('id', interviewId)
        .single();

    if (!interview) return { error: "Interview not found" };
    if (interview.candidate_id !== session.user.id && session.user.role !== 'ADMIN') {
        return { error: "Access denied" };
    }

    if (interview.status === 'completed') {
        return { error: "Interview already completed", status: 'completed' };
    }

    // TIME VALIDATION (UTC)
    const now = new Date();
    const scheduledAt = new Date(interview.scheduled_at);
    // Allow join 15 mins before
    const joinTime = new Date(scheduledAt.getTime() - 15 * 60 * 1000);
    // End time = Scheduled + Duration + Buffer (e.g. 15 mins grace? or strict duration?)
    // Let's assume strict end time based on duration for now, maybe small buffer.
    const durationMins = interview.duration_minutes || 60;
    const endTime = new Date(scheduledAt.getTime() + durationMins * 60 * 1000);

    /* 
       DEBUG LOGS (Remove in prod if noisy)
       console.log(`[Validation] Now: ${now.toISOString()}`);
       console.log(`[Validation] Join: ${joinTime.toISOString()}`);
       console.log(`[Validation] End: ${endTime.toISOString()}`);
    */

    if (now < joinTime) {
        return {
            error: "Too early to join.",
            status: 'future',
            scheduledAt: scheduledAt.toISOString(),
            joinTime: joinTime.toISOString()
        };
    }

    if (now > endTime) {
        return {
            error: "Interview session has expired.",
            status: 'expired'
        };
    }

    return { success: true, status: 'active' };
}

export async function startInterviewSession(interviewId: string) {
    // Re-use validation
    const check = await validateInterviewAccess(interviewId);
    if (check.error && check.status !== 'active') { // If active, we might just be re-joining
        // If it's technically "active" (within time window) but they haven't "started" DB-wise, proceed.
        if (check.status !== 'active') return check;
    }

    // Update status to 'in_progress' if not already
    await supabaseAdmin
        .from('interviews')
        .update({ status: 'in_progress' }) // We don't change start time here, we use scheduled_at as reference
        .eq('id', interviewId);

    return { success: true };
}
