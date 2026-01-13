import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
// @ts-ignore
import { generateExamQuestionsBackground } from "@/lib/examGenerator";

export async function POST(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions);

        // @ts-ignore
        if (!session || session.user?.role !== 'ADMIN') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const examId = params.id;

        // 1. Get Exam Status
        const { data: exam, error } = await supabaseAdmin
            .from('exams')
            .select('status, role, difficulty')
            .eq('id', examId)
            .single();

        if (error || !exam) {
            return NextResponse.json({ error: "Exam not found" }, { status: 404 });
        }

        if (exam.status === 'READY') {
            return NextResponse.json({ error: "Exam is already READY." }, { status: 400 });
        }

        if (exam.status === 'GENERATING') {
            return NextResponse.json({ error: "Exam is currently generating. Please wait." }, { status: 400 });
        }

        // 2. Trigger Background Generation (Fire & Forget)
        // Note: In Next.js App Router, strictly speaking, we shouldn't fire-and-forget without waiting entirely, 
        // or using `waitUntil` (vercel specific) or proper queues. 
        // But for this local/VPS context, valid per prompt instructions.
        generateExamQuestionsBackground(examId, exam.role, exam.difficulty).catch((err: any) =>
            console.error("Retry Background trigger failed:", err)
        );

        return NextResponse.json({ success: true, message: "Generation retried successfully." });

    } catch (error: any) {
        console.error("Retry API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
