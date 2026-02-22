import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { revalidatePath } from 'next/cache';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        // @ts-ignore
        if (!session || session.user.role !== ROLES.ADMIN) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const { notes } = await request.json();

        const { error: primaryError } = await supabaseAdmin
            .from('applications')
            .update({
                notes: notes,
                admin_notes: notes
            })
            .eq('id', id);

        if (primaryError) {
            console.warn("Primary Notes Save Failed, attempting legacy fallback:", primaryError.message);

            const { error: legacyError } = await supabaseAdmin
                .from('applications')
                .update({ admin_notes: notes })
                .eq('id', id);

            if (legacyError) {
                console.error("Critical: Both primary and legacy notes updates failed:", legacyError);
                return NextResponse.json({
                    success: false,
                    message: `Database error: ${legacyError.message} (Primary error: ${primaryError.message})`
                }, { status: 500 });
            }
            console.log("Legacy notes fallback successful.");
        }

        revalidatePath(`/admin/candidates/${id}`);

        return NextResponse.json({
            success: true,
            message: "Notes saved successfully."
        });

    } catch (error: any) {
        console.error("Admin Notes Save Error:", error);
        return NextResponse.json({ success: false, message: "Failed to save notes: " + error.message }, { status: 500 });
    }
}
