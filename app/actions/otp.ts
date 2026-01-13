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

    // 1. Generate OTP
    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // 2. Store in DB (Strict Phase 4: Separate Tables)
    let channel = type === 'email' ? 'email' : 'whatsapp'; // Default
    let dbError;
    let fallbackToEmail = false;

    if (type === 'email') {
        const { error } = await supabaseAdmin
            .from('email_otps')
            .insert({
                user_id: userId,
                email: email,
                otp_hash: otpHash,
                expires_at: expiresAt,
                otp_channel: 'email'
            });
        dbError = error;
    } else {
        // Phone: We will insert AFTER attempting sending, to set correct channel (whatsapp vs email)
        // Or insert 'whatsapp' first, then update if fallback? 
        // Better: Try to send first. 
        // Prompt says: "If WhatsApp API FAILS... Automatically FALLBACK... Save otp_channel = 'email'"
        // So we delay insert until we know the channel.
        // But we need to fetch phone first.
    }

    // 3. Send OTP & Handle Phone Fallback
    if (type === 'email') {
        if (dbError) {
            console.error("OTP Store Error:", dbError);
            return { error: "Failed to generate OTP" };
        }

        try {
            const { sendEmail } = await import("@/lib/email");
            const emailResult = await sendEmail({
                to: email!,
                subject: "Your Verification Code - RecruitAI",
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                        <h1 style="color: #333;">RecruitAI Verification</h1>
                        <p>Your verification code is:</p>
                        <h2 style="color: #2563eb; font-size: 32px; letter-spacing: 5px;">${otp}</h2>
                        <p>This code is valid for 10 minutes.</p>
                        <p style="color: #666; font-size: 12px; margin-top: 20px;">If you did not request this, please ignore this email.</p>
                    </div>
                `
            });

            if (!emailResult.success) {
                console.error("Email send failed:", emailResult.error);
                return { error: "Failed to send OTP via Email. Please check server logs." };
            }
            return { success: true };

        } catch (emailError: any) {
            console.error("Failed to send OTP email (Exception):", emailError);
            return { error: `Failed to send OTP email: ${emailError.message}` };
        }
    } else {
        // WhatsApp Flow
        try {
            const { sendWhatsAppOtp } = await import("@/lib/whatsapp");

            const { data: profile } = await supabaseAdmin
                .from('candidate_profiles')
                .select('phone')
                .eq('user_id', userId)
                .single();
            const phone = profile?.phone;

            if (!phone) {
                return { error: "Phone number not found in profile. Please update your profile." };
            }

            // ATTEMPT WHATSAPP
            const whatsAppResult = await sendWhatsAppOtp({ to: phone, otp: otp });

            if (whatsAppResult.success) {
                // Success: Insert as 'whatsapp'
                const { error } = await supabaseAdmin.from('sms_otps').insert({
                    user_id: userId,
                    phone: phone,
                    otp_hash: otpHash,
                    expires_at: expiresAt,
                    otp_channel: 'whatsapp'
                });
                if (error) console.error("DB Insert Error (WhatsApp):", error);
                return { success: true, message: "OTP sent via WhatsApp" };
            } else {
                // Failure: Fallback to Email
                console.warn(`WhatsApp Failed (${whatsAppResult.error}). Falling back to Email.`);
                fallbackToEmail = true;
            }

        } catch (waError: any) {
            console.error("WhatsApp Exception:", waError);
            fallbackToEmail = true;
        }

        if (fallbackToEmail) {
            // FALLBACK: Send via Email but store in sms_otps (so verification works for phone flow)
            try {
                const { sendEmail } = await import("@/lib/email");
                const emailResult = await sendEmail({
                    to: email!, // Use user's email
                    subject: "RecruitAI: WhatsApp Fallback Verification Code",
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                            <h1 style="color: #333;">RecruitAI Verification</h1>
                            <p style="color: #d97706; font-weight: bold;">WhatsApp Delivery Failed (Test Mode Limitation or Network Error)</p>
                            <p>Here is your verification code instead:</p>
                            <h2 style="color: #2563eb; font-size: 32px; letter-spacing: 5px;">${otp}</h2>
                            <p>This code is valid for 10 minutes.</p>
                            <p style="color: #666; font-size: 12px; margin-top: 20px;">Use this code to verify your mobile number.</p>
                        </div>
                    `
                });

                if (emailResult.success) {
                    // Fetch phone again just to be safe for DB insert (or reuse variable if scope allows, fetching again is cleaner here)
                    const { data: p } = await supabaseAdmin.from('candidate_profiles').select('phone').eq('user_id', userId).single();

                    const { error } = await supabaseAdmin.from('sms_otps').insert({
                        user_id: userId,
                        phone: p?.phone || 'Fallback',
                        otp_hash: otpHash,
                        expires_at: expiresAt,
                        otp_channel: 'email' // Mark as email fallback
                    });

                    if (error) console.error("DB Insert Error (Fallback):", error);

                    return { success: true, message: "WhatsApp unavailable, OTP sent via Email" };
                } else {
                    return { error: "Failed to send OTP via WhatsApp OR Email." };
                }

            } catch (fbError: any) {
                console.error("Fallback Email Exception:", fbError);
                return { error: "Failed to send OTP." };
            }
        }
    }

    return { success: true };
}

export async function verifyOtp(type: 'email' | 'phone', code: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
        return { error: "Unauthorized" };
    }

    const userId = session.user.id;
    const inputHash = hashOtp(code);

    // 1. Find valid OTP (Strict Phase 4: Separate Tables)
    const tableName = type === 'email' ? 'email_otps' : 'sms_otps';

    const { data: otps, error: fetchError } = await supabaseAdmin
        .from(tableName)
        .select('*')
        .eq('user_id', userId)
        .eq('otp_hash', inputHash)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

    if (fetchError || !otps || otps.length === 0) {
        return { error: "Invalid or expired OTP" };
    }

    // 2. Mark as Verified in Profiles
    const updateData: any = {};
    if (type === 'email') updateData.email_verified = true;
    if (type === 'phone') updateData.phone_verified = true;

    const { error: updateError } = await supabaseAdmin
        .from('candidate_profiles')
        .update(updateData)
        .eq('user_id', userId);

    if (updateError) {
        return { error: "Failed to update profile verification status" };
    }

    // 4. Cleanup used OTP
    await supabaseAdmin.from(tableName).delete().eq('id', otps[0].id);

    return { success: true };
}
