import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        // @ts-ignore
        if (!session || session.user.role !== ROLES.ADMIN) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { applicationId, score } = await request.json();

        // Validate Score
        const numScore = Number(score);
        if (isNaN(numScore) || numScore < 0 || numScore > 100) {
            return NextResponse.json({ success: false, message: "Invalid score. Must be 0-100." }, { status: 400 });
        }

        // Check Permissions (Only update if status is NOT SUCCESS/SCORED)
        // Actually, requirement says "Unless parse failed".
        // Let's check current status.
        const { data: app } = await supabaseAdmin
            .from('applications')
            .select('resume_parse_status, ats_score')
            .eq('id', applicationId)
            .single();

        if (!app) return NextResponse.json({ success: false, message: "App not found" }, { status: 404 });

        // Allow update if status is FAILED or PENDING or if score is 0.
        // Block if SUCCESS (unless score is 0, which implies logical failure).
        const canUpdate = app.resume_parse_status === 'FAILED'
            || app.resume_parse_status === 'PENDING'
            || app.ats_score === 0;

        if (!canUpdate) {
            return NextResponse.json({ success: false, message: "Cannot overwrite AI-generated score." }, { status: 403 });
        }

        // Update
        const { error } = await supabaseAdmin
            .from('applications')
            .update({
                manual_ats_score: numScore,
                ats_score: numScore,
                resume_parse_status: 'FAILED', // Explicitly mark as failed/manual override
                status: 'SCORED_FALLBACK' // Or keep existing status? Let's use custom status.
            })
            .eq('id', applicationId);

        if (error) throw error;

        return NextResponse.json({ success: true, message: "Score updated manually." });

    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
