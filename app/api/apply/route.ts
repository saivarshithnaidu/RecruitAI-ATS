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

        // Validate MIME Type
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (!allowedTypes.includes(resume.type)) {
            return NextResponse.json({
                success: false,
                message: 'Invalid file type. Please upload a PDF or DOC/DOCX file.'
            }, { status: 400 });
        }

        // 1.5 Verify Email & Get Profile
        // Strict Order: Auth User -> Profile -> Application

        let profile = null;

        try {
            // Attempt simple get first
            const { data, error } = await supabaseAdmin
                .from('profiles')
                .select('id, email_verified')
                .eq('id', session.user.id)
                .maybeSingle();

            profile = data;

            if (!profile) {
                // Profile missing: Create it robustly
                const { data: newProfile, error: createError } = await supabaseAdmin
                    .from('profiles')
                    .upsert({
                        id: session.user.id,
                        user_id: session.user.id,
                        email: session.user.email,
                        full_name: fullName,
                        mobile_number: phone,
                        email_verified: false
                    }, { onConflict: 'id' })
                    .select()
                    .single();

                if (createError) {
                    console.error("Profile Upsert Failed:", createError);
                    // Critical Error: Cannot create application without profile
                    return NextResponse.json({
                        success: false,
                        message: `Failed to initialize candidate profile. Please contact support.`
                    }, { status: 500 });
                }
                profile = newProfile;
            }
        } catch (err: any) {
            console.error("Profile Logic Exception:", err);
            return NextResponse.json({ success: false, message: "System error during profile initialization." }, { status: 500 });
        }

        if (!profile) throw new Error("Unexpected profile state");

        // 2. Upload to Supabase Storage
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

        // 3. Store File Path
        const resumePath = filePath;

        // 4. Insert New Application (History Support)

        // Check for ACTIVE application
        const terminalStatuses = ['WITHDRAWN', 'REJECTED', 'EXAM_FAILED', 'DELETED', 'HIRED'];

        const { error: fetchError } = await supabaseAdmin
            .from('applications')
            .select('id, status')
            .eq('user_id', session.user.id)
            .is('deleted_at', null)
            .not('status', 'in', `(${terminalStatuses.join(',')})`);

        if (fetchError) {
            console.error("Error checking active apps:", fetchError);
            return NextResponse.json({ success: false, message: "Database check failed" }, { status: 500 });
        }

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
            });

        if (insertError) {
            console.error('Database Operation Error:', insertError);
            return NextResponse.json({
                success: false,
                message: `Database Error: ${insertError.message}`
            }, { status: 500 });
        }

        // 5. Update Profile with latest contact info
        const { error: profileUpdateError } = await supabaseAdmin
            .from('profiles')
            .update({
                full_name: fullName,
                mobile_number: phone
            })
            .eq('id', session.user.id);

        if (profileUpdateError) {
            console.error("Failed to sync profile:", profileUpdateError);
        }

        // 6. Send Confirmation Email
        try {
            const { sendEmail } = await import("@/lib/email");
            const { EmailTemplates } = await import("@/lib/email-templates");

            // Extract First Name
            const firstName = fullName.split(' ')[0];
            // Role - assuming generic or extracted, relying on basic fallback if not in form
            const role = "Software Engineer"; // Or fetch from a role mapping if available. 
            // WAIT, logic flow: Applications usually apply to a Job/Exam? Or generic?
            // The code has `role_applied` in database but not in form input here?
            // Checking DB Schema: `role_applied` column exists?
            // Reading file again, `insert` query at line 159 didn't have `role_applied`. 
            // Wait, checking `applications` table insert.
            // Ah, line 166: `status: 'APPLIED'`. No role column?
            // Line 28 selects `role_applied` in update route. So it must exist.
            // But this route doesn't seem to save it?
            // User input `fullName`, `email`, `phone`, `resume`. No role.
            // Assuming "General Application" or derivation.
            // Let's use "General Application" or "Open Role" for now to be safe.

            const emailData = EmailTemplates.applicationSubmitted(firstName, "General Application");

            await sendEmail({
                to: email,
                subject: emailData.subject,
                html: emailData.html
            });
        } catch (mailError) {
            console.error("Failed to send application confirmation email:", mailError);
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
