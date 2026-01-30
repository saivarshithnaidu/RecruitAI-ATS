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

    // Upload to Supabase Storage
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

    const buffer = Buffer.from(fileBuffer);

    let parsedText = "";
    let parseStatus = "parsed";

    try {
        console.log("Starting resume parsing...");
        parsedText = await import("@/lib/parser").then(m => m.parseResume(buffer, file.type));
        console.log("Parsing successful. Text length:", parsedText.length);

    } catch (parseError: any) {
        console.error("Resume Parsing Failed completely:", parseError);
        parseStatus = "parse_failed";
    }

    // Update candidate in DB
    const { error: upsertError } = await supabaseAdmin
        .from('applications')
        .upsert({
            email: session.user.email,
            full_name: session.user.name,
            resume_path: filePath,
            resume_url: signedUrlData?.signedUrl || '',
            status: parseStatus === 'parse_failed' ? 'parse_failed' : 'parsed',
        }, { onConflict: 'email' })

    if (upsertError) {
        console.error("DB Upsert failed", upsertError)
        throw new Error("Failed to save candidate data: " + upsertError.message)
    }

    if (parseStatus === 'parse_failed') {
        console.log("Stopping flow due to parse failure");
        revalidatePath("/dashboard/profile");
        return { success: false, error: "Failed to parse resume content. Please ensure it is a valid DOC or DOCX file." };
    }

    if (parseStatus === 'parsed') {
        try {
            const { calculateATSScore } = await import("./ats")
            await calculateATSScore(parsedText, session.user.email)
        } catch (e) {
            console.error("ATS Score trigger failed", e)
        }
    }

    revalidatePath("/dashboard/profile")
    return { success: true }
}
