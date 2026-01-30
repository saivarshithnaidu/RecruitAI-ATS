import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { assignmentId, action, remarks } = await req.json();

        // Map action to status
        let newStatus = '';
        if (action === 'pause') newStatus = 'paused';
        if (action === 'resume') newStatus = 'active';
        if (action === 'terminate') newStatus = 'terminated'; // Or 'failed' depending on logic

        // Update assignment
        const { error } = await supabaseAdmin
            .from('exam_assignments')
            .update({
                admin_status: newStatus,
                admin_remarks: remarks, // Append if needed, but overwrite for now or use JSONB log
                last_admin_action_at: new Date().toISOString()
            })
            .eq('id', assignmentId);

        if (error) throw error;

        // Log event
        await supabaseAdmin.from('exam_proctor_logs').insert({
            exam_assignment_id: assignmentId,
            event_type: `ADMIN_${action.toUpperCase()}`,
            details: { remarks, admin_id: session.user.id }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Proctor control error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
