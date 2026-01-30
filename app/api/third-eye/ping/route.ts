import { NextResponse } from "next/server";
import { verifyMobileToken } from "@/lib/proctor-token";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { token } = body;

        const payload = verifyMobileToken(token);
        if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const assignmentId = payload.examId;

        // Update ping
        const { error } = await supabaseAdmin
            .from('exam_proctoring_sessions')
            .update({
                last_ping: new Date().toISOString(),
                mobile_connected: true // Re-affirm connection
            })
            .eq('assignment_id', assignmentId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
