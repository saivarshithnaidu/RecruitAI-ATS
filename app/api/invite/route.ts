import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const assignmentId = searchParams.get('id');

    if (!assignmentId) {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/candidate/dashboard?error=invalid_link`);
    }

    try {
        // 1. Log Click
        console.log(`[InviteRoute] processing click for assignmentId: ${assignmentId}`);
        const { error, count } = await supabaseAdmin
            .from('exam_assignments')
            .update({
                invite_status: 'clicked',
                invite_clicked_at: new Date().toISOString()
            })
            .eq('id', assignmentId)
            .select();

        if (error) {
            console.error("[InviteRoute] DB Update Error:", error);
        } else {
            console.log(`[InviteRoute] DB Update Success. Rows affected: ${count}`);

            // Log Analytics
            try {
                const { logInviteClick } = await import("@/lib/analytics");
                await logInviteClick({
                    source: 'exam_invite',
                    assignment_id: assignmentId
                });
            } catch (aErr) {
                console.error("[InviteRoute] Analytics Error:", aErr);
            }
        }

        // 2. Redirect to Exam
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/candidate/exam`);

    } catch (e) {
        console.error("Invite Tracking Error:", e);
        // Fallback redirect
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/candidate/exam`);
    }
}
