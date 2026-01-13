import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { evaluateInterviewResponses } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ success: false }, { status: 401 });

    const { interviewId, responses } = await request.json(); // responses: string[]

    // 1. Fetch Interview
    const { data: interview } = await supabaseAdmin
        .from('interviews')
        .select('*')
        .eq('id', interviewId)
        .single();

    if (!interview) return NextResponse.json({ success: false, message: 'Interview not found' }, { status: 404 });

    // 2. AI Evaluation
    const questions = interview.questions; // string[]
    const evalResult = await evaluateInterviewResponses(questions, responses);

    // 3. Update Interview
    await supabaseAdmin
        .from('interviews')
        .update({
            responses: responses, // Store answer text
            ai_score: evalResult.score,
            result: evalResult.result
        })
        .eq('id', interviewId);

    // 4. Update Application Status
    const newStatus = evalResult.result === 'PASSED' ? 'HIRED' : 'REJECTED';
    await supabaseAdmin
        .from('applications')
        .update({ status: newStatus })
        .eq('id', interview.application_id);

    return NextResponse.json({ success: true, data: evalResult });
}
