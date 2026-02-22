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
        const { score } = await request.json();

        // Validate Score
        const numScore = Number(score);
        if (isNaN(numScore) || numScore < 0 || numScore > 100) {
            return NextResponse.json({ success: false, message: "Invalid score. Must be 0-100." }, { status: 400 });
        }

        console.log(`Manual ATS Update for ${id}: score=${numScore}`);

        // Update DB with extreme resiliency
        console.log(`Attempting Manual ATS update for ${id} with score ${numScore}`);

        const { error: primaryError } = await supabaseAdmin
            .from('applications')
            .update({
                manualAtsScore: numScore,
                aiAtsScore: numScore,
                ats_score: numScore,
                status: 'SCORED_FALLBACK'
            })
            .eq('id', id);

        if (primaryError) {
            console.warn("Primary Update Failed, attempting legacy fallback:", primaryError.message);

            // Aggressive fallback for ANY error that might be schema-related
            const { error: legacyError } = await supabaseAdmin
                .from('applications')
                .update({
                    ats_score: numScore,
                    status: 'SCORED_FALLBACK'
                })
                .eq('id', id);

            if (legacyError) {
                console.error("Critical: Both primary and legacy updates failed:", legacyError);
                return NextResponse.json({
                    success: false,
                    message: `Database error: ${legacyError.message} (Primary error: ${primaryError.message})`
                }, { status: 500 });
            }
            console.log("Legacy fallback successful.");
        }

        // Fetch updated candidate
        const { data: updatedCandidate, error: fetchError } = await supabaseAdmin
            .from('applications')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        revalidatePath(`/admin/candidates/${id}`);
        revalidatePath('/admin/dashboard');

        return NextResponse.json({
            success: true,
            message: "Manual ATS score saved.",
            data: updatedCandidate
        });

    } catch (error: any) {
        console.error("Manual ATS Save Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
