import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: slots, error } = await supabaseAdmin
            .from('exam_slots')
            .select('*')
            .eq('exam_id', id)
            .order('start_time', { ascending: true });

        if (error) throw error;

        // Also fetch counts of assigned candidates per slot
        const { data: assignments } = await supabaseAdmin
            .from('exam_assignments')
            .select('slot_id, id')
            .eq('exam_id', id)
            .not('slot_id', 'is', null);

        const slotUsage = (assignments || []).reduce((acc: any, curr: any) => {
            acc[curr.slot_id] = (acc[curr.slot_id] || 0) + 1;
            return acc;
        }, {});

        const slotsWithCount = slots.map(s => ({
            ...s,
            filled: slotUsage[s.id] || 0
        }));

        return NextResponse.json({ slots: slotsWithCount });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        // @ts-ignore
        if (!session || session.user?.role !== 'ADMIN') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { start_time, end_time, max_candidates } = body;

        if (!start_time || !end_time) {
            return NextResponse.json({ error: "Start and end time required" }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('exam_slots')
            .insert({
                exam_id: id,
                start_time,
                end_time,
                max_candidates: max_candidates || 10
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, slot: data });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
