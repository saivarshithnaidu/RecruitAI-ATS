
import { generateExamQuestionsBackground } from "@/lib/examGenerator";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { config } from "dotenv";
config();

async function verifyFlow() {
    console.log("Creating Test Exam...");
    const { data: exam, error } = await supabaseAdmin
        .from('exams')
        .insert({
            title: "Robustness Test Exam",
            role: "Frontend Developer",
            difficulty: "Medium",
            duration_minutes: 60,
            pass_mark: 70,
            status: 'DRAFT',
            created_by: '00000000-0000-0000-0000-000000000000' // Ensure this UUID allows insert or is valid, or use an existing user id if RLS blocks. 
            // Admin inserts bypass RLS usually if using service role, but 'created_by' FK might fail if user doesn't exist.
            // Let's assume we can just use a dummy ID or fetch one.
        })
        .select()
        .single();

    if (error) {
        console.error("Failed to create exam:", error);
        return;
    }

    console.log("Exam Created:", exam.id);
    console.log("Triggering Background Generation...");

    await generateExamQuestionsBackground(exam.id, exam.role, exam.difficulty);

    // Check finalized status
    const { data: finalExam } = await supabaseAdmin
        .from('exams')
        .select('status, questions:exam_questions(count)')
        .eq('id', exam.id)
        .single();

    console.log("Final Exam Status:", finalExam?.status);
    console.log("Question Count:", finalExam?.questions[0].count);
}

verifyFlow();
