import { NextResponse } from "next/server";
import { verifyMobileToken } from "@/lib/proctor-token";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { token } = body;

        const payload = verifyMobileToken(token);
        if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const assignmentId = payload.examId; // This IS assignmentId

        // Upsert session
        const { error } = await supabaseAdmin
            .from('exam_proctoring_sessions')
            .upsert({
                assignment_id: assignmentId,
                mobile_connected: true,
                last_ping: new Date().toISOString()
            }, { onConflict: 'assignment_id' });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("Connect Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
