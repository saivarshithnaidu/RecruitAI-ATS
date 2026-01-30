"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function uploadResume(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        throw new Error("Unauthorized")
    }

    const file = formData.get("file") as File
    if (!file) {
        throw new Error("No file provided")
    }

    if (file.size > 5 * 1024 * 1024) throw new Error("File too large (max 5MB)")

    // Strict mime check for DOC/DOCX
    if (!file.type.includes('word') && !file.type.includes('officedocument') && !file.name.match(/\.(doc|docx)$/i)) {
        throw new Error("Invalid file type. Please upload a DOC or DOCX file.")
    }

    // 1. Upload to Supabase Storage
    const timestamp = Date.now();
    const sanitizedName = (session.user.name || 'user').replace(/[^a-zA-Z0-9]/g, '_');
    const extension = file.name.split('.').pop() || 'docx';
    const fileName = `${timestamp}_${sanitizedName}.${extension}`;
    const filePath = `resumes/${fileName}`;

    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabaseAdmin.storage
        .from('resumes')
        .upload(fileName, fileBuffer, {
            contentType: file.type,
            upsert: false
        });

    if (uploadError) throw new Error("Upload failed: " + uploadError.message);

    const { data: signedUrlData } = await supabaseAdmin.storage
        .from('resumes')
        .createSignedUrl(fileName, 3600 * 24 * 365);

    // 2. Ensure Profile Exists FIRST (Mandatory Architecture)
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('candidate_profiles')
        .upsert({
            user_id: session.user.id,
            email: session.user.email,
            full_name: session.user.name || 'Candidate',
            resume_url: signedUrlData?.signedUrl || '',
            // Do not block on parsing
        }, { onConflict: 'user_id' })
        .select()
        .single();

    if (profileError) {
        console.error("Profile Upsert failed", profileError);
        throw new Error("Failed to create profile: " + profileError.message);
    }

    // 3. Create Application Record (Mandatory Architecture)
    // We use email as the linker or use the profile.id if available.
    const { error: appError } = await supabaseAdmin
        .from('applications')
        .upsert({
            email: session.user.email,
            full_name: session.user.name,
            resume_path: filePath,
            resume_url: signedUrlData?.signedUrl || '',
            status: 'pending', // Initial status
        }, { onConflict: 'email' });

    if (appError) {
        console.error("Application Upsert failed", appError);
        throw new Error("Failed to create application: " + appError.message);
    }

    // 4. Async Parsing (Non-blocking)
    // We do NOT block the main response. We return success while parsing happens.
    // However, in a Server Action, we should try to complete the work but wrap in try/catch.
    try {
        const buffer = Buffer.from(fileBuffer);
        const parsedText = await import("@/lib/parser").then(m => m.parseResume(buffer, file.type));

        const parseStatus = parsedText ? 'parsed' : 'parse_failed';

        // Update records with results
        await supabaseAdmin
            .from('candidate_profiles')
            .update({
                // @ts-ignore
                resume_text: parsedText,
                // @ts-ignore
                parse_status: parseStatus
            })
            .eq('user_id', session.user.id);

        await supabaseAdmin
            .from('applications')
            .update({ status: parseStatus })
            .eq('email', session.user.email);

        if (parseStatus === 'parsed' && parsedText) {
            const { calculateATSScore } = await import("./ats");
            await calculateATSScore(parsedText, session.user.email).catch(e => console.error("ATS failed:", e));
        }

    } catch (parseError: any) {
        console.error("Non-blocking parsing failed:", parseError);
        // We already have the records, so we just set status to failed.
        await supabaseAdmin
            .from('applications')
            .update({ status: 'parse_failed' })
            .eq('email', session.user.email);
    }

    revalidatePath("/dashboard/profile")
    return { success: true }
}
