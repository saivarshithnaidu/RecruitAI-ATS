import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { assignment_id, slot_id } = body;

        if (!assignment_id || !slot_id) {
            return NextResponse.json({ error: "Missing assignment_id or slot_id" }, { status: 400 });
        }

        // 1. Verify Assignment belongs to user
        const { data: assignment, error: assignError } = await supabaseAdmin
            .from('exam_assignments')
            .select('*')
            .eq('id', assignment_id)
            // @ts-ignore
            .eq('candidate_id', session.user.id)
            .single();

        if (assignError || !assignment) {
            return NextResponse.json({ error: "Invalid assignment" }, { status: 403 });
        }

        if (assignment.slot_id) {
            // Check reschedule limit
            if ((assignment.reschedule_count || 0) >= 2) {
                return NextResponse.json({ error: "Max rescheduling attempts (2) reached" }, { status: 400 });
            }
        }

        // 2. Check Slot Capacity
        const { count, error: countError } = await supabaseAdmin
            .from('exam_assignments')
            .select('id', { count: 'exact', head: true })
            .eq('slot_id', slot_id);

        const { data: slot, error: slotError } = await supabaseAdmin
            .from('exam_slots')
            .select('max_candidates, start_time, end_time')
            .eq('id', slot_id)
            .single();

        if (slotError || !slot) {
            return NextResponse.json({ error: "Slot not found" }, { status: 404 });
        }

        if ((count || 0) >= slot.max_candidates) {
            return NextResponse.json({ error: "Slot is full" }, { status: 409 });
        }

        // 3. Assign Slot (or Reschedule)
        const isReschedule = !!assignment.slot_id;
        const newCount = isReschedule ? (assignment.reschedule_count || 0) + 1 : 0;

        const { error: updateError } = await supabaseAdmin
            .from('exam_assignments')
            .update({
                slot_id: slot_id,
                status: 'assigned',
                reschedule_count: newCount
            })
            .eq('id', assignment_id);

        if (updateError) throw updateError;

        // 4. Send Email Notification
        if (session.user.email) {
            const dateStr = new Date(slot.start_time).toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata', // Assuming IST as per previous interactions
                dateStyle: 'full',
                timeStyle: 'short'
            });

            const subject = isReschedule ? "Exam Rescheduled" : "Exam Slot Confirmed";
            const html = `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>${subject}</h2>
                    <p>Dear Candidate,</p>
                    <p>Your exam slot has been successfully ${isReschedule ? "rescheduled" : "booked"}.</p>
                    <p><strong>New Time:</strong> ${dateStr}</p>
                    ${isReschedule ? `<p>You have used ${newCount} of 2 rescheduling attempts.</p>` : ''}
                    <p>Please log in to your dashboard to start the exam at the scheduled time.</p>
                    <br/>
                    <p>Best regards,<br/>RecruitAI Team</p>
                </div>
            `;

            // Fire and forget email to not block response
            import("@/lib/email").then(({ sendEmail }) => {
                sendEmail({
                    to: session.user.email!,
                    subject: subject,
                    html: html
                });
            });
        }

        return NextResponse.json({ success: true, rescheduled: isReschedule, attempts: newCount });

    } catch (e: any) {
        console.error("Slot Selection Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
