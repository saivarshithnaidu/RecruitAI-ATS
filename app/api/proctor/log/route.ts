import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { exam_assignment_id, candidate_id, event_type, details } = body;

        if (!exam_assignment_id || !event_type) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('exam_proctor_logs')
            .insert({
                exam_assignment_id,
                candidate_id,
                event_type,
                details: details || {}
            });

        if (error) {
            console.error('Proctor Log Error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
