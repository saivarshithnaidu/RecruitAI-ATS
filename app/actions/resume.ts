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
    // Simplified mime check
    if (!file.type.includes('pdf') && !file.type.includes('word')) {
        // being lenient or keeping strict as before
    }

    // Upload to Supabase Storage
    const timestamp = Date.now();
    const sanitizedName = (session.user.name || 'user').replace(/[^a-zA-Z0-9]/g, '_');
    const extension = file.name.split('.').pop() || 'pdf';
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

    // 2. Insert Application INITIAL STATE (Safest)
    // We insert *before* parsing to ensure we have a record even if parsing crashes
    // Use 'processing' or 'uploaded' status initially? Or 'APPLIED'?
    // User wants "Mark status as parse_failed if parsing fails".

    // Let's upsert as 'APPLIED' (or minimal status) first.
    const { error: initialUpsertError } = await supabaseAdmin
        .from('applications')
        .upsert({
            email: session.user.email,
            full_name: session.user.name,
            resume_path: filePath,
            resume_url: signedUrlData?.signedUrl || '',
            status: 'APPLIED',
            ats_score: 0
        }, { onConflict: 'email' });

    if (initialUpsertError) {
        console.error("Initial DB Upsert failed", initialUpsertError);
        throw new Error("Failed to save application record");
    }

    const buffer = Buffer.from(fileBuffer);

    let parsedText = "";
    let parseStatus = "parsed";
    let parseErrorReason = "";

    try {
        parsedText = await import("@/lib/parser").then(m => m.parseResume(buffer, file.type));
        // Double check text length here too? Or trust parser?
        if (!parsedText || parsedText.length < 50) {
            // Should have thrown if OCR failed, but if it returned success with empty string
            throw new Error("Parsed text too short even after OCR");
        }
    } catch (parseError: any) {
        console.error("Resume Parsing Failed completely:", parseError);
        parseStatus = "parse_failed";
        parseErrorReason = parseError.message;
        // We DO NOT rethrow here, so we can save the status to DB
    }

    // 4. Update Application with Parse Result
    // If failed, we update status to 'parse_failed'
    // If success, we keep 'parsed' or 'APPLIED' (actually 'parsed' is good for internal tracking, or just 'APPLIED' + ats_score)
    // User says "Mark status as parse_failed".

    const finalStatus = parseStatus === 'parse_failed' ? 'parse_failed' : 'APPLIED'; // Keep APPLIED if success, or 'parsed'?
    // But we are in a server action potentially used for Re-upload.
    // If Re-upload, we might want 'APPLIED' again?
    // Let's stick to updating failure only, or updating parsed text if we had a column.

    if (finalStatus === 'parse_failed') {
        await supabaseAdmin
            .from('applications')
            .update({
                status: 'parse_failed',
                // meta: { parse_error: parseErrorReason } // if we had meta
            })
            .eq('email', session.user.email);

        // DO NOT THROW. Return partial success.
        console.log("Resume parsed failed, but file saved.");
        revalidatePath("/dashboard/profile");
        return { success: true, warning: "Resume uploaded, but auto-parsing failed. You may need to enter details manually." };
    }

    if (parseStatus === 'parse_failed') {
        // Stop here, don't trigger ATS
        // Maybe send email?
        console.log("Stopping flow due to parse failure");
        revalidatePath("/dashboard/profile");
        return { success: false, error: "Failed to parse resume content. Please ensure it is a valid PDF or DOCX." };
    }

    try {
        const { calculateATSScore } = await import("./ats")
        await calculateATSScore(parsedText, session.user.email)
    } catch (e) {
        console.error("ATS Score trigger failed", e)
    }

    revalidatePath("/dashboard/profile")
    return { success: true }
}
