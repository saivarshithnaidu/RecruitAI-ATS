import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // Strict Admin Check
        // @ts-ignore
        if (!session || session.user?.role !== ROLES.ADMIN) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data, error } = await supabaseAdmin
            .from('invites')
            .select('*')
            .order('sent_at', { ascending: false });

        if (error) {
            throw error;
        }

        return NextResponse.json({ invites: data });

    } catch (error: any) {
        console.error("Fetch Invites Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
