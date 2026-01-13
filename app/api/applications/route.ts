import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        // @ts-ignore
        const userRole = session.user.role;

        if (userRole !== ROLES.ADMIN) {
            return NextResponse.json({ success: false, message: 'Forbidden: Admin access only' }, { status: 403 });
        }

        const { data: applicationsRaw, error } = await supabaseAdmin
            .from('applications')
            .select('*')
            //.or('deleted_by_admin.is.null,deleted_by_admin.eq.false') // Showing ALL for diagnosis/legacy support
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Fetch Applications Error:', error);
            return NextResponse.json({ success: false, message: 'Failed to fetch applications' }, { status: 500 });
        }

        // Fetch verification details from candidate_profiles
        // We link via user_id
        const userIds = applicationsRaw.map(app => app.user_id).filter(id => id);

        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('candidate_profiles')
            .select('*')
            .in('user_id', userIds);

        const profileMap = new Map();
        if (profiles) {
            profiles.forEach(p => profileMap.set(p.user_id, p));
        }

        // Generate Signed URLs and Attach Profile
        const applications = await Promise.all(applicationsRaw.map(async (app) => {
            let signedUrl = app.resume_url;
            if (app.resume_url && !app.resume_url.startsWith('http')) {
                const { data, error: signError } = await supabaseAdmin
                    .storage
                    .from('resumes')
                    .createSignedUrl(app.resume_url, 3600); // 1 hour

                if (!signError && data?.signedUrl) {
                    signedUrl = data.signedUrl;
                }
            }

            const candidateProfile = profileMap.get(app.user_id);

            return {
                ...app,
                resume_url: signedUrl,
                profiles: candidateProfile ? {
                    mobile_number: candidateProfile.phone, // Map new col to old key for frontend compatibility
                    summary: candidateProfile.summary,
                    skills: candidateProfile.skills,
                    education: candidateProfile.education,
                    preferred_job_roles: candidateProfile.preferred_roles, // Map to frontend key
                    profile_verified: candidateProfile.verified_by_admin, // Map to frontend key
                    // Add new strict fields if needed by frontend updates, but user said "Do NOT remove existing UI"
                    // Existing UI expects: mobile_number, summary, skills, education, preferred_job_roles, profile_verified
                    // We mapped them above.
                    verification_status: candidateProfile.verification_status,
                    phone_verified: candidateProfile.phone_verified,
                    email_verified: candidateProfile.email_verified

                } : null,
                // Ensure we always have a date field
                applied_at: app.created_at || app.applied_at || null
            };
        }));

        return NextResponse.json({ success: true, data: applications });

    } catch (error) {
        console.error('Unexpected Error:', error);
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
