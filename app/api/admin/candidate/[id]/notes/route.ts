import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { revalidatePath } from 'next/cache';

// Support both POST and PATCH for singular route to ensure legacy compatibility
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    return handleNotesUpdate(request, context);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    return handleNotesUpdate(request, context);
}

async function handleNotesUpdate(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
            console.warn("Primary Notes Save Failed (Singular Route), trying fallback:", primaryError.message);
            const { error: legacyError } = await supabaseAdmin
                .from('applications')
                .update({ admin_notes: notes })
                .eq('id', id);

            if (legacyError) {
                return NextResponse.json({
                    success: false,
                    message: `Database error: ${legacyError.message}`
                }, { status: 500 });
            }
        }

        revalidatePath(`/admin/candidates/${id}`);
        return NextResponse.json({ success: true, message: "Notes saved successfully." });

    } catch (error: any) {
        return NextResponse.json({ success: false, message: "Server Error: " + error.message }, { status: 500 });
    }
}
