import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ success: false }, { status: 401 });

    // 1. Get Application ID
    const { data: app } = await supabaseAdmin
        .from('applications')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

    if (!app) return NextResponse.json({ success: true, data: [] });

    // 2. Get Exams
    const { data: exams } = await supabaseAdmin
        .from('exams')
        .select('*')
        .eq('application_id', app.id);

    return NextResponse.json({ success: true, data: exams || [] });
}
