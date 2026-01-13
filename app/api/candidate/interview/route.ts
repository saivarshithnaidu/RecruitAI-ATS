import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateInterviewQuestions } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ success: false }, { status: 401 });

    // 1. Get Application
    const { data: app } = await supabaseAdmin
        .from('applications')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

    if (!app) return NextResponse.json({ success: false, message: 'No application' }, { status: 404 });

    // 2. Get Interview
    const { data: interview } = await supabaseAdmin
        .from('interviews')
        .select('*')
        .eq('application_id', app.id)
        .single();

    return NextResponse.json({ success: true, data: { application: app, interview } });
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ success: false }, { status: 401 });

    const { applicationId, slotTime } = await request.json();

    // 1. Verify Application
    const { data: app } = await supabaseAdmin
        .from('applications')
        .select('*')
        .eq('id', applicationId)
        .single();

    if (!app || app.status !== 'INTERVIEW') {
        return NextResponse.json({ success: false, message: 'Not eligible for interview' }, { status: 400 });
    }

    // 2. Generate Questions (AI)
    // We assume 'Full Stack Developer' or similar role, or derive from resume skills.
    // For MVP, using generic role + skills if available (but skills are in Exams table not App table directly efficiently).
    // Let's assume generic or fetched from exam.

    const questions = await generateInterviewQuestions("Software Engineer", ["General Technical"]);

    // 3. Create Interview
    const { data: interview, error } = await supabaseAdmin
        .from('interviews')
        .insert({
            application_id: applicationId,
            slot_time: slotTime, // e.g., ISO string
            questions: questions,
            ai_score: 0,
            result: 'PENDING'
        })
        .select()
        .single();

    if (error) return NextResponse.json({ success: false, message: 'Booking failed' }, { status: 500 });

    return NextResponse.json({ success: true, data: interview });
}
