
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateExamPaper } from "@/lib/ai";

export async function generateExamQuestionsBackground(examId: string, role: string, difficulty: string) {
    console.log(`[ExamGen] Starting background generation for Exam ID: ${examId}`);

    try {
        // 1. Fetch skills from DB since we only have role/difficulty passed
        // We know the exam exists because the caller checked, but we need 'skills'
        const { data: exam, error: fetchError } = await supabaseAdmin
            .from('exams')
            .select('skills')
            .eq('id', examId)
            .single();

        if (fetchError || !exam) {
            throw new Error(`Failed to fetch exam details: ${fetchError?.message}`);
        }

        const skills = exam.skills || [];

        // 2. Generate Questions via AI
        // generateExamPaper returns the "sections" array directly
        const sections = await generateExamPaper(role, skills, difficulty); // Returns array

        if (!Array.isArray(sections)) {
            console.error("[ExamGen] AI returned invalid sections structure:", sections);
            throw new Error("AI response not an array");
        }

        // 3. Update Exam Record
        const { error: updateError } = await supabaseAdmin
            .from('exams')
            .update({
                questions_data: sections,
                status: 'DRAFT', // DRAFT means "Generated but not Verified"
                updated_at: new Date().toISOString()
            })
            .eq('id', examId);

        if (updateError) {
            throw new Error(`Failed to save exam questions: ${updateError.message}`);
        }

        console.log(`[ExamGen] Successfully generated and saved exam ${examId}`);

    } catch (error: any) {
        console.error(`[ExamGen] Error generating exam ${examId}:`, error);

        // Attempt to set status to ERROR
        const { error: statusError } = await supabaseAdmin
            .from('exams')
            .update({
                status: 'ERROR',
            })
            .eq('id', examId);

        if (statusError) {
            console.error("Failed to update status to ERROR:", statusError);
        }
    }
}
