import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ROLES } from "@/lib/roles";
import { scoreApplication } from "@/lib/ats";

export async function POST(request: Request) {
    let userId = "unknown";
    let appId = "unknown";

    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        userId = session.user.id;
        console.log(`[Reupload] Starting for User: ${userId}`);

        const formData = await request.formData();
        const resume = formData.get('resume') as File;

        if (!resume) {
            return NextResponse.json({ success: false, message: 'Resume file missing' }, { status: 400 });
        }

        // 1. FETCH APPLICATION FIRST (Strict Check)
        const { data: app, error: appError } = await supabaseAdmin
            .from('applications')
            .select('id')
            .eq('user_id', userId)
            .in('status', ['parse_failed', 'PARSE_FAILED', 'Parse Failed']) // Robust Check
            .single();

        if (appError || !app) {
            console.warn(`[Reupload] No parse_failed application found for User: ${userId}`);
            return NextResponse.json({ success: false, message: 'No re-uploadable application found' }, { status: 404 });
        }

        appId = app.id;
        console.log(`[Reupload] Found Application: ${appId}`);

        // 2. Upload File
        const timestamp = Date.now();
        const safeFilename = resume.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const filePath = `applications/${userId}/reupload-${timestamp}-${safeFilename}`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from('resumes')
            .upload(filePath, resume, {
                contentType: resume.type,
                upsert: false
            });

        if (uploadError) {
            console.error(`[Reupload] Upload Error (App: ${appId}):`, uploadError);
            return NextResponse.json({ success: false, message: "Resume upload failed" }, { status: 500 });
        }

        // 3. DATABASE UPDATE (Strict Fields)
        const { error: dbError } = await supabaseAdmin
            .from('applications')
            .update({
                resume_url: filePath,
                status: 'submitted',
                ats_score: 0,        // Reset to 0
                ats_score_locked: false, // Ensure unlocked
                ats_summary: null
            })
            .eq('id', appId);

        if (dbError) {
            console.error(`[Reupload] DB Update Failed (App: ${appId}):`, dbError);
            return NextResponse.json({
                success: false,
                message: "Database update failed",
                internal: dbError.message
            }, { status: 500 });
        }

        console.log(`[Reupload] Success. Triggering Auto-Score (App: ${appId})`);

        // 4. Auto-Score (Background)
        // We do NOT await this to return fast, per user request "Return Strict Response"
        // Actually, user didn't say "don't await", but usually for responsiveness we might not.
        // But previously we awaited. The user request says "Trigger existing ATS scoring logic".
        // Use 'await' to ensure we capture any immediate start errors? 
        // Logic: "Status moves parse_failed -> submitted". Scoring happens after.
        // I will await it to be safe and consistent with previous flow, unless "Return Strict Response" implies immediate.
        // User "On success: { success: true }". Doesn't mention data.
        // I will await scoring to ensure it starts, but strictly return { success: true }.

        await scoreApplication(appId);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error(`[Reupload] Critical Error (User: ${userId}, App: ${appId}):`, error);
        return NextResponse.json({
            success: false,
            message: "Database update failed",
            internal: error.message
        }, { status: 500 });
    }
}
