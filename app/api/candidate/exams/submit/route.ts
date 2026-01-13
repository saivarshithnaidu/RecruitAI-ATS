import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) return NextResponse.json({ success: false }, { status: 401 });

        const { examId, answers } = await request.json(); // answers: { 0: "A", 1: "B" }

        // 1. Fetch Exam & Questions
        const { data: exam, error } = await supabaseAdmin
            .from('exams')
            .select('*')
            .eq('id', examId)
            .single();

        if (error || !exam) return NextResponse.json({ success: false, message: 'Exam not found' }, { status: 404 });

        // 2. Grade Exam
        const questions = exam.questions;
        let correctCount = 0;
        const total = questions.length;

        questions.forEach((q: any, idx: number) => {
            // Compare answer string
            const userAnswer = answers[idx];
            if (userAnswer === q.answer) {
                correctCount++;
            }
        });

        const score = Math.round((correctCount / total) * 100);
        const passed = score >= 60; // 60% Passing

        // 3. Update Exam
        await supabaseAdmin
            .from('exams')
            .update({
                answers: answers, // Store user answers
                score: score,
                passed: passed
            })
            .eq('id', examId);

        // 4. Update Application Status if Passed
        if (passed) {
            await supabaseAdmin
                .from('applications')
                .update({ status: 'INTERVIEW' })
                .eq('id', exam.application_id);
        }

        return NextResponse.json({
            success: true,
            data: { score, passed }
        });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ success: false, message: 'Grading Error' }, { status: 500 });
    }
}
