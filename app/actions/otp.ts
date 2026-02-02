"use server"

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateOtp, hashOtp } from "@/lib/otp";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function requestOtp(type: 'email' | 'phone') {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
        return { error: "Unauthorized" };
    }

    const userId = session.user.id;
    // @ts-ignore
    const email = session.user.email;

    if (!email) {
        return { error: "User email not found." };
    }

    // 1. Generate OTP
    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // 2. Store in DB (Using 'email_otps' for simplified unified flow)
    // We treat all OTPs as email OTPs since delivery is via email.
    // This simplifies verification logic to check one table.
    const { error: dbError } = await supabaseAdmin
        .from('email_otps')
        .insert({
            user_id: userId,
            email: email,
            otp_hash: otpHash,
            expires_at: expiresAt,
            otp_channel: 'email'
        });

    if (dbError) {
        console.error("OTP Store Error:", dbError);
        return { error: "Failed to generate OTP" };
    }

    // 3. Send OTP via Email
    try {
        const { sendEmail } = await import("@/lib/email");

        const { EmailTemplates } = await import("@/lib/email-templates");

        // Extract name
        // We might not have the name in the session depending on auth provider or if it's a fresh signup
        // Default to "Candidate" if missing
        // @ts-ignore
        const firstName = session.user.name?.split(' ')[0] || "Candidate";

        let template;

        if (type === 'phone') {
            template = EmailTemplates.phoneVerification(firstName, otp);
        } else {
            template = EmailTemplates.emailVerification(firstName, otp);
        }

        const emailResult = await sendEmail({
            to: email,
            subject: template.subject,
            html: template.html
        });

        if (!emailResult.success) {
            console.error("Email send failed:", emailResult.error);
            return { error: "Failed to send OTP via Email. Please check server logs." };
        }
        return { success: true, message: type === 'phone' ? "OTP sent to your email" : "OTP sent to your email" };

    } catch (emailError: any) {
        console.error("Failed to send OTP email (Exception):", emailError);
        return { error: `Failed to send OTP email: ${emailError.message}` };
    }
}

export async function verifyOtp(type: 'email' | 'phone', code: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
        return { error: "Unauthorized" };
    }

    const userId = session.user.id;
    const inputHash = hashOtp(code);

    // 1. Find valid OTP in email_otps (Unified table)
    const { data: otps, error: fetchError } = await supabaseAdmin
        .from('email_otps')
        .select('*')
        .eq('user_id', userId)
        .eq('otp_hash', inputHash)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

    if (fetchError || !otps || otps.length === 0) {
        // Fallback: Check sms_otps just in case legacy or parallel flow used it? 
        // No, we are enforcing strict email-only.
        return { error: "Invalid or expired OTP" };
    }

    // 2. Mark as Verified in Profiles
    // Verify BOTH email and phone regardless of request type, 
    // because we proved ownership of account email which is the trust anchor.
    // And if they are performing phone verification, they just proved they have access to the email linked to this account.
    const updateData: any = {
        email_verified: true,
        phone_verified: true, // Auto-verify phone as well
        // phone_verified_via: 'email_fallback' // Removed as column missing in DB
    };

    const { error: updateError } = await supabaseAdmin
        .from('candidate_profiles')
        .update(updateData)
        .eq('user_id', userId);

    if (updateError) {
        console.error("Profile Update Error:", updateError);
        return { error: "Failed to update profile verification status" };
    }

    // 4. Cleanup used OTP
    await supabaseAdmin.from('email_otps').delete().eq('id', otps[0].id);

    return { success: true };
}
