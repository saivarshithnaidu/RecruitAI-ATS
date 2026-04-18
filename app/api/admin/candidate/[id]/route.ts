import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        // @ts-ignore
        if (!session || session.user.role !== ROLES.ADMIN) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { id: applicationId } = await params;

        // Fetch Application Only
        const { data: application, error: appError } = await supabaseAdmin
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (appError || !application) {
            return NextResponse.json({ success: false, message: "Application not found" }, { status: 404 });
        }

        const userId = application.user_id;

        // Fetch Profile
        const { data: profile } = await supabaseAdmin
            .from('candidate_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        // Fetch Exam Results
        const { data: examResults } = await supabaseAdmin
            .from('exam_results')
            .select(`*, exams (title)`)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        // Fetch Interviews
        const { data: interviews } = await supabaseAdmin
            .from('interviews')
            .select('*')
            .eq('candidate_id', userId)
            .order('scheduled_at', { ascending: false });

        // Proctoring
        const { count: violationCount } = await supabaseAdmin
            .from('exams_proctoring_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .neq('violation_type', 'none');

        let proctoringStats = {
            violations: violationCount || 0,
            riskLevel: (violationCount || 0) > 5 ? 'High' : (violationCount || 0) > 2 ? 'Medium' : 'Low'
        };

        // Resume Signed URL
        let resumeUrl = application.resume_url;
        if (resumeUrl && !resumeUrl.startsWith('http')) {
            const { data: signed } = await supabaseAdmin.storage.from('resumes').createSignedUrl(resumeUrl, 3600);
            if (signed) resumeUrl = signed.signedUrl;
        }

        // Photo Resolve
        let photoUrl = profile?.profile_photo_url || application?.photo_url || "";
        if (photoUrl && !photoUrl.startsWith('http')) {
            const { data: signed } = await supabaseAdmin.storage.from('profile-photos').createSignedUrl(photoUrl, 3600);
            if (signed) photoUrl = signed.signedUrl;
        }
        if (!photoUrl) photoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(application.full_name)}&background=random&color=fff`;

        return NextResponse.json({
            success: true,
            data: {
                application: {
                    ...application,
                    resume_url: resumeUrl,
                    notes: application.notes || application.admin_notes || ""
                },
                profile: {
                    ...profile,
                    profile_photo_url: photoUrl
                },
                examResults: examResults || [],
                interviews: interviews || [],
                proctoring: proctoringStats
            }
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
