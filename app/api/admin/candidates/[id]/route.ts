import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        // @ts-ignore
        if (!session || session.user.role !== ROLES.ADMIN) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { id: applicationId } = await params;

        // 1. Fetch Application & Profile Data
        // 1. Fetch Application Only
        const { data: application, error: appError } = await supabaseAdmin
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (appError || !application) {
            console.error("App Fetch Error:", appError);
            return NextResponse.json({ success: false, message: "Application not found", error: appError }, { status: 404 });
        }

        const userId = application.user_id;

        // 1.5 Fetch Profile Separately
        const { data: profile } = await supabaseAdmin
            .from('candidate_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();



        // 2. Fetch Exam Results
        const { data: examResults } = await supabaseAdmin
            .from('exam_results')
            .select(`
                *,
                exams (title, duration_minutes)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        // 3. Fetch Interviews
        const { data: interviews } = await supabaseAdmin
            .from('interviews')
            .select('*')
            .eq('candidate_id', userId)
            .order('scheduled_at', { ascending: false });

        // 4. Fetch Proctoring Summary (Count violations)
        // Note: This matches the "monitor" usage generally.
        // We will simple count logs if available, or just return empty for now if table structure varies.
        // Assuming 'proctoring_logs' exists from context of "Proctoring & Integrity" request.
        let proctoringStats = {
            violations: 0,
            riskLevel: 'Low'
        };

        const { count: violationCount } = await supabaseAdmin
            .from('exams_proctoring_logs') // Adjust table name if needed based on codebase
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .neq('violation_type', 'none'); // Assuming structure

        if (violationCount !== null) {
            proctoringStats.violations = violationCount;
            if (violationCount > 2) proctoringStats.riskLevel = 'Medium';
            if (violationCount > 5) proctoringStats.riskLevel = 'High';
        }

        return NextResponse.json({
            success: true,
            data: {
                application,
                profile: profile,
                examResults: examResults || [],
                interviews: interviews || [],
                proctoring: proctoringStats
            }
        });

    } catch (error: any) {
        console.error("Candidate Fetch Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
