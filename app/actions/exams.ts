"use server"

import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
// @ts-ignore
import { generateExamPaper } from "@/lib/ai";

export type ExamInput = {
    role: string;
    skills: string[];
    difficulty: 'Easy' | 'Medium' | 'Hard';
    duration_minutes: number;
    pass_mark: number;
    title: string;
    description: string;
}

export async function createExam(data: ExamInput) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== 'ADMIN') {
        throw new Error("Unauthorized");
    }

    try {
        console.log(`[CreateExam] Starting for role: ${data.role}`);
        let sections: any[] = [];

        // Define topics based on Role (Technical ONLY - Aptitude/Verbal are hardcoded in AI strict prompt)
        const roleKey = data.role.toLowerCase();
        let topics: string[] = ['Coding Logic', 'Technical Concepts']; // Defaults

        if (roleKey.includes('frontend') || roleKey.includes('ui')) {
            topics = ['HTML/CSS', 'JavaScript', 'React', 'Frontend Architecture', 'Web Performance'];
        } else if (roleKey.includes('backend') || roleKey.includes('api')) {
            topics = ['Database Design', 'SQL', 'Node.js', 'API Security', 'Server Logic', 'System Design'];
        } else if (roleKey.includes('full') || roleKey.includes('stack')) {
            topics = ['Frontend Basics', 'Backend Logic', 'Database', 'API Design', 'DevOps Basics'];
        } else if (roleKey.includes('data') || roleKey.includes('analyst')) {
            topics = ['Statistics', 'SQL', 'Python Data Science', 'Machine Learning Basics', 'Data Visualization'];
        }

        console.log(`[CreateExam] Generating for Role: ${data.role}, Topics: ${topics.join(', ')}`);
        sections = await generateExamPaper(data.role, topics, data.difficulty);

        if (!sections || sections.length === 0) {
            throw new Error("No sections generated.");
        }

        // 2. Resolve Creator UUID
        let creatorId = session.user.id;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (!uuidRegex.test(creatorId)) {
            console.log(`[CreateExam] Invalid UUID ${creatorId}. Resolving via email: ${session.user.email}`);

            // Strategy A: Try creating user (Most reliable if missing)
            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: session.user.email || undefined,
                email_confirm: true,
                user_metadata: { role: 'ADMIN', full_name: session.user.name }
            });

            if (newUser?.user) {
                console.log(`[CreateExam] Created new user: ${newUser.user.id}`);
                creatorId = newUser.user.id;
            } else if (createError?.message?.includes("already registered") || createError) {
                console.log(`[CreateExam] User exists (Error: ${createError.message}). Searching...`);

                // Strategy B: Find existing user
                // @ts-ignore
                const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }); // Increase limit
                // @ts-ignore
                const validUser = listData?.users?.find((u: any) => u.email?.toLowerCase() === session.user.email?.toLowerCase());

                if (validUser?.id) {
                    console.log(`[CreateExam] Found existing user: ${validUser.id}`);
                    creatorId = validUser.id;
                } else {
                    // Strategy C: Check Profile as last resort
                    const { data: profile } = await supabaseAdmin.from('profiles').select('id').eq('email', session.user.email).single();
                    if (profile?.id) {
                        console.log(`[CreateExam] Found profile: ${profile.id}`);
                        creatorId = profile.id;
                    } else {
                        throw new Error("Failed to resolve Admin UUID. User exists but cannot be found.");
                    }
                }
            } else {
                throw new Error("Failed to create Admin User.");
            }
        }

        // Final Safety Check
        if (!uuidRegex.test(creatorId)) {
            throw new Error(`CRITICAL: Failed to resolve valid UUID. Current ID: ${creatorId}`);
        }

        // 3. Create Exam Record
        const { data: exam, error: examError } = await supabaseAdmin
            .from('exams')
            .insert({
                title: data.title,
                description: data.description,
                role: data.role,
                difficulty: data.difficulty,
                duration_minutes: data.duration_minutes,
                pass_mark: data.pass_mark,
                created_by: creatorId,
                status: 'DRAFT',
                questions_data: sections
            })
            .select()
            .single();

        if (examError) throw examError;

        revalidatePath('/admin/exams');
        return { success: true, examId: exam.id };

    } catch (error: any) {
        console.error("Create Exam Error:", error);
        return { error: error.message || "Failed to create exam" };
    }
}

export async function assignExam(
    examId: string,
    candidateIds: string[],
    scheduled_start_time: string | null = null,
    proctoring_config: any = { camera: false, mic: false, tab_switch: true, copy_paste: true }
) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== 'ADMIN') {
        return { error: "Unauthorized" };
    }

    try {
        for (const cid of candidateIds) {
            await systemAssignExam(examId, cid, scheduled_start_time, proctoring_config);
        }
        revalidatePath('/admin/exams');
        return { success: true };
    } catch (error: any) {
        console.error("Assign Exam Error:", error);
        return { error: error.message };
    }
}

/**
 * Automated Exam Assignment (No Session Check)
 * Used by ATS Auto-Decision logic.
 */
export async function systemAssignExam(
    examId: string,
    candidateId: string,
    scheduled_start_time: string | null = null,
    proctoring_config: any = { camera: false, mic: false, tab_switch: true, copy_paste: true }
) {
    console.log(`[SystemAssignExam] Assigning exam ${examId} to candidate ${candidateId}`);

    // Check if Exam is READY
    const { data: examData } = await supabaseAdmin
        .from('exams')
        .select('status, title, duration_minutes')
        .eq('id', examId)
        .single();

    if (!examData || (examData.status !== 'READY' && examData.status !== 'READY_FALLBACK')) {
        throw new Error(`Exam is not verified (Status: ${examData?.status || 'Unknown'}).`);
    }

    // 🚀 NEW: AUTO SLOT BOOKING
    let assignedSlotId = scheduled_start_time ? null : null; // if time provided manually, don't auto-book unless matched
    let autoStartTime = scheduled_start_time;

    if (!scheduled_start_time) {
        console.log(`[AutoAutomation] Attempting auto-slot booking for exam ${examId}`);
        // 1. Fetch upcoming slots for this exam
        const { data: slots } = await supabaseAdmin
            .from('exam_slots')
            .select('id, start_time, max_candidates')
            .eq('exam_id', examId)
            .gt('start_time', new Date().toISOString())
            .order('start_time', { ascending: true });

        if (slots && slots.length > 0) {
            // Find first slot with capacity
            for (const slot of slots) {
                // Check capacity
                const { count } = await supabaseAdmin
                    .from('exam_assignments')
                    .select('id', { count: 'exact', head: true })
                    .eq('slot_id', slot.id);

                if ((count || 0) < slot.max_candidates) {
                    assignedSlotId = slot.id;
                    autoStartTime = slot.start_time;
                    console.log(`[AutoAutomation] Auto-booked Slot ${slot.id} starting at ${slot.start_time}`);
                    break;
                }
            }
        }
    }

    // 1. Create Assignment
    const { data: assignment, error } = await supabaseAdmin
        .from('exam_assignments')
        .insert({
            exam_id: examId,
            candidate_id: candidateId,
            status: 'assigned',
            scheduled_start_time: autoStartTime, // Use auto-time if booked
            slot_id: assignedSlotId, // [NEW] Link Slot
            proctoring_config: proctoring_config
        })
        .select()
        .single();

    if (error) throw error;

    // 2. Fetch Candidate Details
    const { data: user } = await supabaseAdmin.auth.admin.getUserById(candidateId);
    if (!user || !user.user || !user.user.email) {
        throw new Error("Candidate user record not found.");
    }

    const email = user.user.email;

    // 3. Update Application Status
    await supabaseAdmin
        .from('applications')
        .update({ status: 'EXAM_ASSIGNED' })
        .eq('email', email);

    // 4. Send Invite Email
    try {
        const { sendEmail } = await import("@/lib/email");
        const { EmailTemplates } = await import("@/lib/email-templates");

        // @ts-ignore
        const firstName = user.user.user_metadata?.full_name?.split(' ')[0] || user.user.name?.split(' ')[0] || "Candidate";

        const template = EmailTemplates.examAssigned(
            firstName,
            examData.title || "Technical Assessment",
            autoStartTime, 
            examData.duration_minutes || 60,
            `https://recruitaitech.in/auth/login`,
            assignment.id
        );

        await sendEmail({
            to: email,
            subject: template.subject,
            html: template.html
        });

        // Update tracking
        await supabaseAdmin
            .from('exam_assignments')
            .update({ invite_status: 'sent', invite_sent_at: new Date().toISOString() })
            .eq('id', assignment.id);

    } catch (emailErr) {
        console.error("Failed to send invite email:", emailErr);
    }

    return { success: true, assignmentId: assignment.id };
}

/**
 * Finds the first READY exam matching the role or a general one.
 */
export async function findReadyExamForRole(role: string) {
    const { data: exams } = await supabaseAdmin
        .from('exams')
        .select('id, role')
        .in('status', ['READY', 'READY_FALLBACK'])
        .order('created_at', { ascending: false });

    if (!exams || exams.length === 0) return null;

    // Try finding by role match
    const roleMatch = exams.find(e => e.role.toLowerCase().includes(role.toLowerCase()));
    if (roleMatch) return roleMatch.id;

    // Fallback to most recent READY exam
    return exams[0].id;
}

export async function verifyExam(examId: string) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== 'ADMIN') {
        return { error: "Unauthorized" };
    }

    try {
        const { error } = await supabaseAdmin
            .from('exams')
            .update({ status: 'READY' })
            .eq('id', examId);

        if (error) throw error;

        revalidatePath('/admin/exams');
        revalidatePath(`/admin/exams/${examId}`);
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}

// ----------------------------------------------------------------------------
// CANDIDATE ACTIONS
// ----------------------------------------------------------------------------

export async function getCandidateExam(assignmentIdOverride?: string, token?: string) {
    let candidateId = "";
    let targetAssignmentId = assignmentIdOverride;

    if (token) {
        const { verifyExamToken } = await import("@/lib/seb");
        const payload = verifyExamToken(token);
        if (!payload) return { error: "Invalid secure token." };
        candidateId = payload.candidateId;
        targetAssignmentId = payload.assignmentId;
    } else {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return { error: "Unauthorized" };
        }
        // @ts-ignore
        candidateId = session.user.id;
    }

    try {
        // Find assigned exam
        const { data: assignment, error } = await supabaseAdmin
            .from('exam_assignments')
            .select(`
                id,
                created_at,
                exam_id,
                candidate_id,
                status,
                started_at,
                submitted_at,
                score,
                proctoring_config,
                scheduled_start_time,
                slot_id,
                exam_slots (
                    start_time,
                    end_time
                ),
                exams (
                    id,
                    title,
                    description,
                    duration_minutes,
                    pass_mark,
                    status,
                    questions_data
                )
            `)
            .eq('candidate_id', candidateId)
            // If targetAssignmentId provided (SEB flow), filter by it exactly
            .filter('id', targetAssignmentId ? 'eq' : 'neq', targetAssignmentId || '00000000-0000-0000-0000-000000000000') 
            .in('status', ['assigned', 'in_progress', 'completed', 'passed', 'failed', 'EXAM_SUBMITTED'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !assignment) {
            console.error("[GetCandidateExam] DB Error or Null:", error);
            return { error: "No active exam found." };
        }

        // --- EXPIRY CHECK ---
        // Default 24h expiry if not specified. 
        // In a real app, we'd store 'expires_at' in the DB.
        const expiryHrs = 24; 
        const createdAt = new Date(assignment.created_at).getTime();
        const now = new Date().getTime();
        const isExpired = (now - createdAt) > (expiryHrs * 3600 * 1000);

        if (isExpired && assignment.status === 'assigned') {
            // Auto mark as expired in DB
            await supabaseAdmin
                .from('exam_assignments')
                .update({ status: 'expired' })
                .eq('id', assignment.id);
            
            return { error: "This exam assignment has expired." };
        }

        if (assignment.status === 'expired') {
            return { error: "This exam assignment has expired." };
        }

        // @ts-ignore
        const examStatus = assignment.exams?.status;

        // Handle Generation / Error States
        if (examStatus === 'DRAFT' || examStatus === 'GENERATING') {
            // Return success so UI can show "Preparing..." screen
            return { success: true, exam: assignment };
        }

        if (examStatus === 'AI_FAILED') {
            return { error: "This exam failed to generate. Please contact admin." };
        }

        // Check for Questions (New JSON vs Legacy Table)
        // @ts-ignore
        const hasJsonQuestions = assignment.exams?.questions_data && Array.isArray(assignment.exams.questions_data) && assignment.exams.questions_data.length > 0;

        if (!hasJsonQuestions) {
            // Fallback: Check Legacy Table
            const { count } = await supabaseAdmin
                .from('exam_questions')
                .select('*', { count: 'exact', head: true })
                .eq('exam_id', assignment.exam_id);

            if (!count || count === 0) {
                return { error: "This exam is supposed to be ready but has 0 questions. Please contact the administrator." };
            }
        }

        // SECURITY: Remove questions_data (contains answers) before returning to client
        // @ts-ignore
        if (assignment.exams) {
            // @ts-ignore
            delete assignment.exams.questions_data;
        }

        return { success: true, exam: assignment };

    } catch (error: any) {
        return { error: error.message };
    }
}

export async function startExam(assignmentId: string, token?: string) {
    let candidateId = "";

    if (token) {
        const { verifyExamToken } = await import("@/lib/seb");
        const payload = verifyExamToken(token);
        if (!payload) return { error: "Invalid secure token." };
        if (payload.assignmentId !== assignmentId) return { error: "Token assignment mismatch." };
        candidateId = payload.candidateId;
    } else {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) return { error: "Unauthorized" };
        candidateId = session.user.id;
    }

    const { data: assignment } = await supabaseAdmin
        .from('exam_assignments')
        .select(`
            *,
            exams (
                questions_data
            )
        `)
        .eq('id', assignmentId)
        .single();

    if (!assignment || assignment.candidate_id !== candidateId) {
        return { error: "Access denied" };
    }

    if (assignment.status === 'assigned') {
        const { error } = await supabaseAdmin
            .from('exam_assignments')
            .update({
                status: 'in_progress',
                started_at: new Date().toISOString()
            })
            .eq('id', assignmentId);

        if (error) throw error;

        // Initialize Proctoring Session
        await supabaseAdmin.from('exam_proctoring_sessions').upsert({
            assignment_id: assignmentId,
            status: 'active',
            last_heartbeat: new Date().toISOString(),
        });
    }

    // Sanitize and return questions...
    const questionsData = assignment.exams?.questions_data;
    if (questionsData && Array.isArray(questionsData)) {
        const sanitizedSections = questionsData.map((section: any) => ({
            ...section,
            questions: section.questions.map((q: any) => {
                const { correct_answer, ...safeQuestion } = q;
                return safeQuestion;
            })
        }));

        return {
            success: true,
            sections: sanitizedSections,
            started_at: assignment.started_at || new Date().toISOString(),
            isComplex: true
        };
    }

    const { data: questions } = await supabaseAdmin
        .from('exam_questions')
        .select('id, question, options, type, marks')
        .eq('exam_id', assignment.exam_id);

    const parsedQuestions = questions?.map(q => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
    }));

    return { success: true, questions: parsedQuestions, started_at: assignment.started_at || new Date().toISOString() };
}

export async function submitExam(assignmentId: string, answers: Record<string, string>, proctoringData?: any, token?: string) {
    let candidateId = "";

    if (token) {
        const { verifyExamToken } = await import("@/lib/seb");
        const payload = verifyExamToken(token);
        if (!payload) return { error: "Invalid secure token." };
        if (payload.assignmentId !== assignmentId) return { error: "Token assignment mismatch." };
        candidateId = payload.candidateId;
    } else {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) return { error: "Unauthorized" };
        candidateId = session.user.id;
    }

    try {
        const { data: assignment } = await supabaseAdmin
            .from('exam_assignments')
            .select('*, exams(pass_mark, questions_data)')
            .eq('id', assignmentId)
            .single();

        if (!assignment || assignment.candidate_id !== candidateId) {
            return { error: "Access denied" };
        }
        // ... rest of evaluation logic remains same

        if (['completed', 'passed', 'failed', 'submitted', 'EXAM_SUBMITTED'].includes(assignment.status)) {
            return { success: true, status: assignment.status, message: "Exam already submitted." };
        }

        let totalScore = 0;
        // @ts-ignore
        const questionsData = assignment.exams?.questions_data;

        // ---------------------------------------------------------
        // NEW EVALUATION LOGIC (3-Section JSONB)
        // ---------------------------------------------------------
        if (questionsData && Array.isArray(questionsData)) {
            console.log("Evaluating 3-Section Exam...");

            // 1. Evaluate MCQs (Aptitude & Verbal)
            questionsData.forEach((section: any) => {
                section.questions.forEach((q: any) => {
                    if (q.type === 'mcq') {
                        const userAnswer = answers[q.id];
                        if (userAnswer && userAnswer.trim() === q.correct_answer.trim()) {
                            totalScore += (q.marks || 1);
                        }
                    }
                });
            });

            // 2. Evaluate Coding (Fetch from coding_submissions table)
            // We assume 2 coding questions, e.g., 20 marks each? 
            // Need to know marks per question from structure.
            const { data: codingSubs } = await supabaseAdmin
                .from('coding_submissions')
                .select('*')
                .eq('assignment_id', assignmentId);

            // Map submissions to questions to get marks
            questionsData.forEach((section: any) => {
                section.questions.forEach((q: any) => {
                    if (q.type === 'coding') {
                        // Fix: coding_submissions uses 'question_idx' to store the Question ID
                        const sub = codingSubs?.find(s => s.question_idx === q.id);
                        if (sub && sub.status === 'passed') {
                            totalScore += (q.marks || 10);
                        }
                    } else if (q.type === 'code-analysis') {
                        // Simple Evaluation: Check if answer contains expected fix or matches output
                        const userAns = answers[q.id]?.trim().toLowerCase();
                        const expected = q.expected_answer?.trim().toLowerCase();

                        if (userAns && expected) {
                            if (q.subtype === 'predict-output') {
                                // Exact match for output prediction
                                if (userAns === expected) totalScore += (q.marks || 10);
                            } else {
                                // Contains match for logic/bug fix (lenient)
                                if (userAns.includes(expected)) totalScore += (q.marks || 10);
                            }
                        }
                    }
                });
            });

        } else {
            // ---------------------------------------------------------
            // LEGACY EVALUATION LOGIC (exam_questions table)
            // ---------------------------------------------------------
            console.log("Evaluating Legacy Exam...");
            const { data: questions } = await supabaseAdmin
                .from('exam_questions')
                .select('id, correct_answer, type, marks')
                .eq('exam_id', assignment.exam_id);

            questions?.forEach(q => {
                const userAnswer = answers[q.id];
                if (!userAnswer) return;

                if (q.type === 'mcq') {
                    if (userAnswer.trim() === q.correct_answer.trim()) {
                        totalScore += q.marks;
                    }
                } else if (q.type === 'short') {
                    const keywords = q.correct_answer.split(',').map((k: string) => k.trim().toLowerCase());
                    const userText = userAnswer.toLowerCase();
                    if (keywords.some((k: string) => userText.includes(k))) {
                        totalScore += q.marks;
                    }
                }
            });
        }

        // Pass/Fail Logic -> CHANGED to Manual Review
        // @ts-ignore
        const passMark = assignment.exams?.pass_mark || 0;

        // We still calculate MCQ score for Admin reference
        const resultStatus = 'completed';
        const appStatus = 'EXAM_SUBMITTED';

        console.log(`Exam Submitted: MCQ Score=${totalScore} (To be reviewed)`);

        // Update assignment
        const { error: updateError } = await supabaseAdmin
            .from('exam_assignments')
            .update({
                status: resultStatus,
                score: totalScore, // Store internal MCQ score
                submitted_at: new Date().toISOString(),
                answers: answers
                // proctoring_data column might not exist, so we log it separately below
            })
            .eq('id', assignmentId);

        if (updateError) throw updateError;

        // Log Proctoring Summary
        if (proctoringData) {
            await supabaseAdmin.from('exam_proctor_logs').insert({
                exam_assignment_id: assignmentId,
                candidate_id: candidateId,
                event_type: 'SUMMARY',
                details: proctoringData
            });
        }

        // Update Application Status
        const { data: user } = await supabaseAdmin.auth.admin.getUserById(candidateId);
        if (user && user.user) {
            // AUTO-PASS/FAIL LOGIC
            const passed = totalScore >= passMark;
            
            // Check for high violations (Auto Flagged)
            const isFlagged = proctoringData?.flagged || (proctoringData?.tab_switches > 3);
            
            // If heavily flagged, we might keep status as 'EXAM_SUBMITTED' or 'UNDER_REVIEW' 
            // instead of auto-passing to the next round.
            let newStatus = passed ? 'INTERVIEW' : 'EXAM_FAILED';
            
            if (isFlagged && passed) {
                console.log(`[AutoAutomation] Candidate ${user.user.email} passed but is FLAGGED. Setting to UNDER_REVIEW.`);
                newStatus = 'EXAM_SUBMITTED'; // Admin needs to verify proctoring
            }

            await supabaseAdmin
                .from('applications')
                .update({ 
                    status: newStatus,
                    ats_summary: isFlagged ? `PASSED (${totalScore}) but FLAGGED for violations. Please review logs.` : `Passed assessment with score ${totalScore}.`
                })
                .eq('email', user.user.email);

            // 🚀 Send Results Email
            if (user.user.email) {
                try {
                    const { sendEmail } = await import("@/lib/email");
                    const { EmailTemplates } = await import("@/lib/email-templates");
                    
                    // @ts-ignore
                    const firstName = user.user.user_metadata?.full_name?.split(' ')[0] || user.user.name?.split(' ')[0] || "Candidate";
                    const examTitle = assignment.exams?.title || "Technical Assessment";

                    if (newStatus === 'INTERVIEW') {
                        const template = EmailTemplates.examPassed(firstName, examTitle);
                        await sendEmail({ to: user.user.email, subject: template.subject, html: template.html });
                    } else if (newStatus === 'EXAM_FAILED') {
                        const template = EmailTemplates.examFailed(firstName, examTitle);
                        await sendEmail({ to: user.user.email, subject: template.subject, html: template.html });
                    }
                } catch (emailErr) {
                    console.error("Failed to send result email:", emailErr);
                }
            }

            console.log(`[SubmitExam] User ${user.user.email} -> ${newStatus} (Score: ${totalScore}/${passMark}, Flagged: ${isFlagged})`);
        }

        revalidatePath('/candidate/dashboard');
        return { success: true, score: totalScore, status: resultStatus, message: "Exam submitted for review." };

    } catch (e: any) {
        console.error("Submit Exam Error:", e);
        return { error: e.message || "Failed to submit exam." };
    }
}

export async function getActiveExamSessions() {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== 'ADMIN') {
        return { error: "Unauthorized" };
    }

    try {
        const { data: assignments, error } = await supabaseAdmin
            .from('exam_assignments')
            .select(`
                id,
                status,
                started_at,
                candidate_id,
                exams (title),
                candidate_profiles (full_name, email)
            `)
            .in('status', ['in_progress', 'assigned'])
            .order('started_at', { ascending: false, nullsFirst: false });

        if (error) throw error;

        return { success: true, sessions: assignments };
    } catch (e: any) {
        return { error: e.message };
    }
}
export async function saveAiExamTemplate(data: {
    title: string;
    description: string;
    role: string;
    difficulty: string;
    questions: any[];
}) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== 'ADMIN') {
        return { error: "Unauthorized" };
    }

    try {
        const { title, description, role, difficulty, questions } = data;

        // Resolve Creator UUID
        const creatorId = session.user.id;

        const { data: exam, error } = await supabaseAdmin
            .from('exams')
            .insert({
                title,
                description,
                role,
                difficulty: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
                duration_minutes: 60, // Default for AI generated
                pass_mark: 40,        // Default
                created_by: creatorId,
                status: 'READY',       // Auto-ready since it's from AI Studio
                questions_data: questions
            })
            .select()
            .single();

        if (error) throw error;

        revalidatePath('/admin/exams');
        return { success: true, examId: exam.id };

    } catch (error: any) {
        console.error("[SaveAiTemplate] Error:", error);
        return { error: error.message || "Failed to save template" };
    }
}
