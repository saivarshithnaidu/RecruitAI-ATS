import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
// @ts-ignore
import { generateExamPaper } from "@/lib/ai";

export async function POST(req: NextRequest) {
    console.log("POST /api/admin/exams/create - Received request");

    try {
        const session = await getServerSession(authOptions);

        // @ts-ignore
        if (!session || session.user?.role !== 'ADMIN') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { title, description, role, difficulty, duration_minutes, pass_mark } = body;

        console.log(`Generating exam for ${role}...`);

        // 1. Generate Questions (Synchronous)
        let sections: any[] = [];
        try {
            const aiResult = await generateExamPaper(role, [role], difficulty);
            sections = aiResult; // generateExamPaper returns array directly

            if (!Array.isArray(sections) || sections.length === 0) {
                throw new Error("No sections generated from AI.");
            }
        } catch (aiError: any) {
            console.error("AI Generation Failed:", aiError);
            return NextResponse.json({ error: "Exam generation failed. Please retry." }, { status: 500 });
        }

        // 2. Insert Exam Record (READY status) with JSON Data
        const { data: exam, error: examError } = await supabaseAdmin
            .from('exams')
            .insert({
                title,
                description,
                role,
                difficulty,
                duration_minutes: Number(duration_minutes),
                pass_mark: Number(pass_mark),
                created_by: session.user.id,
                status: 'DRAFT',
                questions_data: sections // Store full AI structure
            })
            .select()
            .single();

        if (examError || !exam) {
            console.error("DB Insert Exam Error:", examError?.message);
            return NextResponse.json({ error: "Failed to create exam record." }, { status: 500 });
        }

        // 3. (Legacy Support Optional) We SKIP inserting into 'exam_questions' since we use 'questions_data' now.
        // If backward compatibility is needed, we'd map MCQs only, but it's redundant.
        // Assuming frontend will leverage 'questions_data' for new exams.

        return NextResponse.json({
            success: true,
            exam_id: exam.id,
            message: "Exam created successfully."
        });

    } catch (error: any) {
        console.error("Create Exam API Critical Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

