import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

/**
 * ========================
 * STEP 3: APPLY FOR JOB (BACKEND FLOW)
 * Route: POST /api/apply
 * ========================
 */
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ success: false, message: 'Unauthorized: Please log in first' }, { status: 401 });
        }

        // @ts-ignore
        if (session.user.role !== ROLES.CANDIDATE) {
            return NextResponse.json({ success: false, message: 'Only candidates can apply' }, { status: 403 });
        }

        const formData = await request.formData();
        const fullName = formData.get('fullName') as string;
        const email = formData.get('email') as string;
        const phone = formData.get('phone') as string;
        const resume = formData.get('resume') as File;

        // 1. Validation
        if (!fullName || !email || !phone || !resume) {
            return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
        }

        // 1.5 Verify Email & Get Profile
        let { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, email_verified')
            .eq('id', session.user.id)
            .single();

        if (profileError && profileError.code !== 'PGRST116') {
            // Real DB error, not just 'no rows returned'
            console.error("Profile fetch error:", profileError);
            return NextResponse.json({ success: false, message: 'Profile fetch error. Please contact support.' }, { status: 500 });
        }

        if (!profile) {
            // Auto-create profile as UNVERIFIED (Default state for new system)
            // User requirement: Never block users with "Profile not found"

            const { error: createError } = await supabaseAdmin
                .from('profiles')
                .upsert({
                    id: session.user.id,
                    user_id: session.user.id,
                    email: session.user.email,
                    full_name: fullName,
                    mobile_number: phone,
                    email_verified: false
                }, { onConflict: 'id' });

            if (createError) {
                console.error("Failed to auto-create/upsert profile:", JSON.stringify(createError));
                return NextResponse.json({
                    success: false,
                    message: `Failed to initialize profile: ${createError.message}`
                }, { status: 500 });
            }

            // Set ephemeral profile object to proceed
            profile = { id: session.user.id, email_verified: false };
        }

        // REMOVED: Blocking check for email_verified. 
        // Candidate CAN submit application without verification.
        // if (!profile.email_verified) ...

        // 2. Upload to Supabase Storage
        if (!profile) throw new Error("Unexpected profile state");

        const timestamp = Date.now();
        // sanitize filename
        const safeFilename = resume.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const filePath = `applications/${session.user.id}/${timestamp}-${safeFilename}`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from('resumes')
            .upload(filePath, resume, {
                contentType: resume.type,
                upsert: false
            });

        if (uploadError) {
            console.error('Storage Upload Error:', uploadError);
            return NextResponse.json({
                success: false,
                message: `Failed to upload resume: ${uploadError.message}`
            }, { status: 500 });
        }

        // 3. Store File Path (Not Public URL) - for private bucket access
        // const { data: { publicUrl } } = supabaseAdmin.storage.from('resumes').getPublicUrl(filePath);
        const resumePath = filePath;

        // 4. Insert or Update 'applications' table

        // 4. Insert New Application (History Support)

        // Check for ACTIVE application
        // User cannot have two active applications at once.
        // Terminal states allow re-application: WITHDRAWN, REJECTED, EXAM_FAILED, DELETED.
        // Active states: APPLIED, SCORED, SCORED_AI, SCORED_FALLBACK, SHORTLISTED, EXAM_ASSIGNED, INTERVIEW_SCHEDULED, PASSED_EXAM, etc.

        const terminalStatuses = ['WITHDRAWN', 'REJECTED', 'EXAM_FAILED', 'DELETED', 'HIRED']; // HIRED usually shouldn't re-apply but technically terminal

        const { data: activeApps, error: fetchError } = await supabaseAdmin
            .from('applications')
            .select('id, status')
            .eq('user_id', session.user.id)
            .is('deleted_at', null) // Ignore soft-deleted
            .not('status', 'in', `(${terminalStatuses.join(',')})`) // Supabase syntax for NOT IN

        if (fetchError) {
            console.error("Error checking active apps:", fetchError);
            return NextResponse.json({ success: false, message: "Database check failed" }, { status: 500 });
        }

        // Note: Supabase .not with 'in' might be tricky in some client versions. 
        // Safer to fetch latest app and check status in JS if logic is complex, but let's try strict filter.
        // Actually, let's fetch ALL non-deleted apps and check JS side to be safe and clear.

        const { data: existingApps } = await supabaseAdmin
            .from('applications')
            .select('status')
            .eq('user_id', session.user.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(1);

        if (existingApps && existingApps.length > 0) {
            const lastStatus = existingApps[0].status;
            if (!terminalStatuses.includes(lastStatus)) {
                return NextResponse.json({
                    success: false,
                    message: `You have an active application (Status: ${lastStatus}). Please withdraw or wait for a decision.`
                }, { status: 400 });
            }
        }

        // Create New Application
        const { error: insertError } = await supabaseAdmin
            .from('applications')
            .insert({
                user_id: session.user.id,
                profile_id: profile.id,
                full_name: fullName,
                email: email,
                phone: phone,
                resume_url: resumePath,
                status: 'APPLIED',
                ats_score: 0,
                // defaults: withdrawn=false, deleted_by_admin=false, ats_score_locked=false
            });

        let dbError = insertError;

        if (dbError) {
            console.error('Database Operation Error:', dbError);
            return NextResponse.json({
                success: false,
                message: `Database Error: ${dbError.message}`
            }, { status: 500 });
        }

        // 5. Update Profile with latest contact info
        // User wants profile updated when application is submitted successfully.
        const { error: profileUpdateError } = await supabaseAdmin
            .from('profiles')
            .update({
                full_name: fullName,
                mobile_number: phone
            })
            .eq('id', session.user.id);

        if (profileUpdateError) {
            console.error("Failed to sync profile:", profileUpdateError);
            // Non-blocking warning
        }

        return NextResponse.json({ success: true, message: 'Application submitted successfully' });

    } catch (error: any) {
        console.error('Unexpected Error in /api/apply:', error);
        return NextResponse.json({
            success: false,
            message: `Internal Server Error: ${error.message}`
        }, { status: 500 });
    }
}
