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
            return NextResponse.json({ error: "Slot already selected" }, { status: 400 });
        }

        // 2. Check Slot Capacity
        const { count, error: countError } = await supabaseAdmin
            .from('exam_assignments')
            .select('id', { count: 'exact', head: true })
            .eq('slot_id', slot_id);

        const { data: slot, error: slotError } = await supabaseAdmin
            .from('exam_slots')
            .select('max_candidates')
            .eq('id', slot_id)
            .single();

        if (slotError || !slot) {
            return NextResponse.json({ error: "Slot not found" }, { status: 404 });
        }

        if ((count || 0) >= slot.max_candidates) {
            return NextResponse.json({ error: "Slot is full" }, { status: 409 });
        }

        // 3. Assign Slot
        const { error: updateError } = await supabaseAdmin
            .from('exam_assignments')
            .update({ slot_id: slot_id, status: 'assigned' }) // Ensure status is assigned
            .eq('id', assignment_id);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true });

    } catch (e: any) {
        console.error("Slot Selection Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
