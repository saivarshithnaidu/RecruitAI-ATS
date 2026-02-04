import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { assignmentId, candidateId, eventType, details } = body;

        if (!assignmentId || !eventType) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        // 1. Log the event
        const { error: logError } = await supabaseAdmin
            .from('exam_proctor_logs')
            .insert({
                exam_assignment_id: assignmentId,
                candidate_id: candidateId,
                event_type: eventType,
                details: details || {}
            });

        if (logError) console.error("Proctor Log Error:", logError);

        // 2. Update Real-time State
        const updatePayload: any = {
            last_heartbeat: new Date().toISOString()
        };

        if (eventType === 'TAB_SWITCH') {
            // Increment violation count (requires getting current count first or manual increment usually, 
            // but supabase 'rpc' is better. For now doing fetch-update for simplicity or just a raw query)
            // Simplified: We accept we might race, or we assume this API is hit sequentially enough per user.
            // Better: use rpc. For now, we will just log it. The analytics view can sum logs.
            // But we do want to store a cached count.

            // Let's rely on logs for count, but update status flags here.
        }

        if (eventType === 'CAMERA_CONNECTED') updatePayload.camera_active = true;
        if (eventType === 'CAMERA_DISCONNECTED') updatePayload.camera_active = false;

        // Update session
        await supabaseAdmin
            .from('exam_proctoring_sessions')
            .update(updatePayload)
            .eq('assignment_id', assignmentId);


        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
