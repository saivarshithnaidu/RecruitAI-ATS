import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

export async function POST(
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

        // Update DB with extreme resiliency - matching the successful pattern for ATS updates
        const { error: primaryError } = await supabaseAdmin
            .from('applications')
            .update({
                manualAtsScore: numScore,
                aiAtsScore: numScore,
                ats_score: numScore,
                status: 'SCORED_AI'
            })
            .eq('id', id);

        if (primaryError) {
            console.error("Manual ATS Update Failed:", primaryError.message);
            return NextResponse.json({
                success: false,
                message: `Database error: ${primaryError.message}`
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: "Manual ATS score saved.",
            score: numScore
        });

    } catch (error: any) {
        console.error("Manual ATS Save Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
