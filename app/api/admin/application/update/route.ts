import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ROLES } from "@/lib/roles";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        // @ts-ignore
        if (!session || session.user?.role !== ROLES.ADMIN) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { applicationId, status } = await req.json();

        if (!applicationId || !status) {
            return NextResponse.json({ success: false, message: "Missing fields" }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('applications')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', applicationId);

        if (error) throw error;

        // Send Email Notification if Rejection/Shortlist?
        // (Optional: Reuse existing email logic if specific statuses are triggered)

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, message: e.message }, { status: 500 });
    }
}
