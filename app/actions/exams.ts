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

        // 1. Generate Sections (Synchronous)
        let sections: any[] = [];
        try {
            // Define topics based on Role
            const roleKey = data.role.toLowerCase();
            let topics: string[] = ['Aptitude', 'Verbal Reasoning', 'Coding Logic']; // Defaults

            if (roleKey.includes('frontend') || roleKey.includes('ui')) {
                topics = ['Aptitude', 'Verbal Reasoning', 'HTML/CSS', 'JavaScript/React', 'Frontend Coding'];
            } else if (roleKey.includes('backend') || roleKey.includes('api')) {
                topics = ['Aptitude', 'Verbal Reasoning', 'Database/SQL', 'Node.js/API', 'Backend Coding'];
            } else if (roleKey.includes('full') || roleKey.includes('stack')) {
                topics = ['Aptitude', 'Verbal Reasoning', 'Frontend Basics', 'Backend Logic', 'Full Stack Coding'];
            } else if (roleKey.includes('data') || roleKey.includes('analyst')) {
                topics = ['Aptitude', 'Verbal Reasoning', 'Statistics', 'SQL/Data', 'Python Coding'];
            }

            console.log(`[CreateExam] Generating for Role: ${data.role}, Topics: ${topics.join(', ')}`);
            sections = await generateExamPaper(data.role, topics, data.difficulty);

            if (!sections || sections.length === 0) {
                throw new Error("No sections generated.");
            }
        } catch (aiError: any) {
            console.error("AI Generation Failed:", aiError);
            return { error: "Exam generation failed. Please retry." };
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
        // Check if Exam is READY
        const { data: examData } = await supabaseAdmin
            .from('exams')
            .select('status, title, duration_minutes')
            .eq('id', examId)
            .single();

        if (!examData || (examData.status !== 'READY' && examData.status !== 'READY_FALLBACK')) {
            return { error: `Exam is not verified (Status: ${examData?.status || 'Unknown'}). Please verify the exam first.` };
        }

        const assignments = candidateIds.map(cid => ({
            exam_id: examId,
            candidate_id: cid,
            status: 'assigned',
            scheduled_start_time: scheduled_start_time,
            proctoring_config: proctoring_config
        }));

        const { error } = await supabaseAdmin
            .from('exam_assignments')
            .insert(assignments);

        if (error) throw error;

        // Update application status for these candidates
        for (const cid of candidateIds) {
            const { data: user } = await supabaseAdmin.auth.admin.getUserById(cid);
            if (user && user.user && user.user.email) {
                // 1. Update App Status
                await supabaseAdmin
                    .from('applications')
                    .update({ status: 'EXAM_ASSIGNED' })
                    .eq('email', user.user.email);

                // 2. Send Invite Email
                const assignment = assignments.find(a => a.candidate_id === cid);
                // Use assignment ID as the unique token for simplicity and reliability
                // In a real scenario, we might use a separate hash.
                // We point to a tracking URL: /api/invite?token=ASSIGNMENT_ID
                const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/api/invite?token=${assignment?.exam_id}_${cid}`;
                // Note: We need the specific assignment ID, but we just bulk inserted. 
                // We should have returned data from insert. 

                // Let's rely on fetching the specific assignment ID or just generic link for now to avoid complexity without refetching.
                // BETTER: Fetch the specific assignment ID we just created.
                const { data: specificAssignment } = await supabaseAdmin
                    .from('exam_assignments')
                    .select('id')
                    .eq('exam_id', examId)
                    .eq('candidate_id', cid)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (specificAssignment) {
                    const trackedLink = `${process.env.NEXT_PUBLIC_APP_URL}/api/invite?id=${specificAssignment.id}`;

                    try {
                        const { sendEmail } = await import("@/lib/email");
                        await sendEmail({
                            to: user.user.email,
                            subject: "Skill Assessment Invite - RecruitAI",
                            html: `
                                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
                                    <h2>Coding Assessment Invitation</h2>
                                    <p>Hello,</p>
                                    <p>You have been invited to take the <strong>${examData.title || 'Technical Assessment'}</strong>.</p>
                                    
                                    <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                        <p><strong>Duration:</strong> ${examData.duration_minutes || 60} minutes</p>
                                        <p><strong>Start Time:</strong> ${scheduled_start_time ? new Date(scheduled_start_time).toLocaleString() : 'Any time'}</p>
                                    </div>

                                    <a href="${trackedLink}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                                        Start Assessment
                                    </a>
                                    
                                    <p style="font-size: 12px; color: #666; margin-top: 20px;">
                                        Note: This link is unique to you. Do not share it.
                                    </p>
                                </div>
                            `
                        });

                        // Update tracking status
                        await supabaseAdmin
                            .from('exam_assignments')
                            .update({ invite_status: 'sent', invite_sent_at: new Date().toISOString() })
                            .eq('id', specificAssignment.id);

                    } catch (emailErr) {
                        console.error("Failed to send invite email:", emailErr);
                    }

                    // B. Send WhatsApp (If phone exists)
                    try {
                        const { data: profile } = await supabaseAdmin
                            .from('candidate_profiles')
                            .select('phone')
                            .eq('user_id', cid)
                            .single();

                        const phone = profile?.phone || user.user.phone;

                        // Only try sending if we have a phone number
                        if (phone) {
                            const { sendExamInvite } = await import("@/lib/whatsapp");
                            const waRes = await sendExamInvite(
                                phone,
                                examData.title || "Technical Assessment",
                                trackedLink
                            );

                            if (!waRes.success) {
                                console.warn(`WhatsApp Invite Failed for ${cid}: ${waRes.error}`);
                            } else {
                                console.log(`WhatsApp Invite Sent to ${cid}`);
                            }
                        }
                    } catch (waErr) {
                        console.error("WhatsApp Dispatch Error:", waErr);
                    }
                }
            }
        }

        revalidatePath('/admin/exams');
        return { success: true };

    } catch (error: any) {
        console.error("Assign Exam Error:", error);
        return { error: error.message };
    }
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

export async function getCandidateExam() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return { error: "Unauthorized" };
    }

    try {
        // Find assigned exam
        const { data: assignment, error } = await supabaseAdmin
            .from('exam_assignments')
            .select(`
                id,
                exam_id,
                status,
                started_at,
                submitted_at,
                score,
                proctoring_config,
                scheduled_start_time,
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
            .eq('candidate_id', session.user.id)
            .in('status', ['assigned', 'in_progress', 'completed', 'passed', 'failed'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !assignment) {
            return { error: "No exam assigned." };
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

export async function startExam(assignmentId: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return { error: "Unauthorized" };

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

    if (!assignment || assignment.candidate_id !== session.user.id) {
        return { error: "Access denied" };
    }

    if (assignment.status === 'assigned') {
        // SCHEDULING CHECK
        if (assignment.scheduled_start_time) {
            const scheduledInfo = new Date(assignment.scheduled_start_time);
            const now = new Date();
            const timeDiff = scheduledInfo.getTime() - now.getTime();
            const minutesUntilStart = timeDiff / (1000 * 60);

            // Allow 15 mins early
            if (minutesUntilStart > 15) {
                return { error: `This exam is scheduled for ${scheduledInfo.toLocaleString()}. You can enter 15 minutes before the start time.` };
            }

            // SCHEDULING CHECK: LATE ENTRY / EXAM CLOSED
            // Calculate Duration (Override > Exam Default > 60)
            const durationMins = assignment.duration_override_minutes || assignment.exams?.duration_minutes || 60;
            const endTime = new Date(scheduledInfo.getTime() + (durationMins * 60 * 1000));

            if (now > endTime) {
                return { error: "This exam session has ended. Please contact the administrator." };
            }
        }

        const { error } = await supabaseAdmin
            .from('exam_assignments')
            .update({
                status: 'in_progress',
                started_at: new Date().toISOString()
            })
            .eq('id', assignmentId);

        if (error) throw error;
    }

    // 1. Check for New JSON Structure (3 Sections)
    // @ts-ignore
    const questionsData = assignment.exams?.questions_data;
    if (questionsData && Array.isArray(questionsData)) {
        // SANITIZE: Remove correct answers
        const sanitizedSections = questionsData.map((section: any) => ({
            ...section,
            questions: section.questions.map((q: any) => {
                const { correct_answer, ...safeQuestion } = q;
                return safeQuestion; // Return question WITHOUT correct_answer
            })
        }));

        return {
            success: true,
            sections: sanitizedSections,
            started_at: assignment.started_at || new Date().toISOString(),
            isComplex: true // Flag for frontend to use new UI
        };
    }

    // 2. Legacy Fallback
    const { data: questions } = await supabaseAdmin
        .from('exam_questions')
        .select('id, question, options, type, marks')
        .eq('exam_id', assignment.exam_id);

    // Parse options if they are strings
    const parsedQuestions = questions?.map(q => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
    }));

    return { success: true, questions: parsedQuestions, started_at: assignment.started_at || new Date().toISOString() };
}

export async function submitExam(assignmentId: string, answers: Record<string, string>, proctoringData?: any) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return { error: "Unauthorized" };

    // Fetch assignment + exam data
    const { data: assignment } = await supabaseAdmin
        .from('exam_assignments')
        .select('*, exams(pass_mark, questions_data)')
        .eq('id', assignmentId)
        .single();

    if (!assignment || assignment.candidate_id !== session.user.id) {
        return { error: "Access denied" };
    }

    if (['completed', 'passed', 'failed'].includes(assignment.status)) {
        return { error: "Exam already submitted." };
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

    // Pass/Fail Logic
    // @ts-ignore
    const passMark = assignment.exams?.pass_mark || 0;
    const resultStatus = totalScore >= passMark ? 'passed' : 'failed';
    const appStatus = totalScore >= passMark ? 'EXAM_PASSED' : 'EXAM_FAILED';

    console.log(`Exam Result: Score=${totalScore}, PassMark=${passMark}, Status=${resultStatus}`);

    // Update assignment
    const { error: updateError } = await supabaseAdmin
        .from('exam_assignments')
        .update({
            status: resultStatus,
            score: totalScore,
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
            candidate_id: session.user.id,
            event_type: 'SUMMARY',
            details: proctoringData
        });
    }

    if (updateError) throw updateError;

    // Update Application Status
    const { data: user } = await supabaseAdmin.auth.admin.getUserById(session.user.id);
    if (user && user.user) {
        await supabaseAdmin
            .from('applications')
            .update({ status: appStatus })
            .eq('email', user.user.email);
    }

    // SEND RESULT EMAIL
    try {
        const { sendEmail } = await import("@/lib/email");
        const subject = resultStatus === 'passed' ? "You Passed! Next Steps - RecruitAI" : "Exam Result - RecruitAI";
        const html = resultStatus === 'passed'
            ? `<h1>Congratulations!</h1><p>You scored ${totalScore} and <strong>PASSED</strong> the assessment.</p><p>We will schedule your interview shortly.</p>`
            : `<p>Thank you for taking the assessment.</p><p>Unfortunately, you scored ${totalScore} (Pass Mark: ${passMark}) and did not clear the round.</p>`;

        if (user.user?.email) {
            await sendEmail({ to: user.user.email, subject, html });
        }
    } catch (e) {
        console.error("Failed to send exam result email:", e);
    }

    revalidatePath('/candidate/dashboard');
    return { success: true, score: totalScore, status: resultStatus };
}
