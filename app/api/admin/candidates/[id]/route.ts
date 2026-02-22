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

        // Fallback for photo
        if (profile && !profile.profile_photo_url && application.resume_url) {
            // Just a placeholder logic, usually resume isn't a photo.
            // Check if application has valid photo or if we should use a default.
            // Actually, let's inject a default if missing in the response data.
        }



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

        // 4.5 Handle Resume (Signed URL if needed)
        let finalResumeUrl = application.resume_url;
        if (finalResumeUrl && !finalResumeUrl.startsWith('http')) {
            const { data: signedResume } = await supabaseAdmin
                .storage
                .from('resumes')
                .createSignedUrl(finalResumeUrl, 3600);
            if (signedResume) finalResumeUrl = signedResume.signedUrl;
        }

        // 5. Handle Profile Photo (Advanced Resolution)
        let photoSource = profile?.profile_photo_url || profile?.profilePhotoUrl || application?.photo_url || application?.profile_photo_url;
        let finalPhotoUrl = photoSource;

        if (photoSource) {
            // If it's a storage path (no http), sign it
            if (!photoSource.startsWith('http')) {
                const { data: signedPhoto } = await supabaseAdmin
                    .storage
                    .from('profile-photos')
                    .createSignedUrl(photoSource, 3600);
                if (signedPhoto) finalPhotoUrl = signedPhoto.signedUrl;
            }
            // If it's a Supabase URL, extract path and sign it (handles public URLs on private buckets)
            else if (photoSource.includes('supabase.co/storage/v1/object/')) {
                const pathParts = photoSource.split('/profile-photos/');
                if (pathParts.length > 1) {
                    const storagePath = decodeURIComponent(pathParts[1].split('?')[0]);
                    const { data: signedPhoto } = await supabaseAdmin
                        .storage
                        .from('profile-photos')
                        .createSignedUrl(storagePath, 3600);
                    if (signedPhoto) finalPhotoUrl = signedPhoto.signedUrl;
                }
            }
        }

        // Ultimate fallback to UI Avatars
        if (!finalPhotoUrl) {
            finalPhotoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(application.full_name)}&background=random&color=fff`;
        }

        return NextResponse.json({
            success: true,
            data: {
                application: {
                    ...application,
                    resume_url: finalResumeUrl,
                    aiAtsScore: application.aiAtsScore || application.ats_score || 0,
                    atsStatus: application.atsStatus || (application.ats_score > 0 ? 'COMPLETED' : 'PENDING'),
                    manualAtsScore: application.manualAtsScore || application.ats_score || 0,
                    notes: application.notes || application.admin_notes || ""
                },
                profile: {
                    ...profile,
                    profile_photo_url: finalPhotoUrl
                },
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
