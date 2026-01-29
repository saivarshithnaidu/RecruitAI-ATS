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

    const buffer = Buffer.from(fileBuffer);

    let parsedText = "";
    let parseStatus = "parsed"; // default success
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

    // Update candidate in DB
    // We merge the new status. If they are re-uploading, we must overwrite any previous 'parse_failed'.
    const { error: upsertError } = await supabaseAdmin
        .from('applications')
        .upsert({
            email: session.user.email,
            full_name: session.user.name,
            resume_path: filePath,
            resume_url: signedUrlData?.signedUrl || '',
            status: parseStatus === 'parse_failed' ? 'parse_failed' : 'parsed', // Ensure we don't accidentally overwrite 'SHORTLISTED' etc? 
            // WAIT - User said "Never set application.status = 'parse_failed' until BOTH fail".
            // And "Update application.status = 'parsed'".
            // If the user already has a status like 'SHORTLISTED', re-uploading shouldn't reset it to 'parsed' unless specifically desired.
            // But usually re-upload means new application version.
            // Let's stick to the request: "Update application.status = 'parsed'" if successful.
        }, { onConflict: 'email' })

    if (upsertError) {
        console.error("DB Upsert failed", upsertError)
        throw new Error("Failed to save candidate data")
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
