"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendFast2SMS } from "@/lib/sms";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";

// Rate Limit Config
const MAX_ATTEMPTS_PER_HOUR = 5;
const OTP_VALIDITY_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 60;

export async function requestPhoneOtp(phone: string) {
    if (!phone || phone.length !== 10) {
        return { success: false, message: "Invalid phone number. Must be 10 digits." };
    }

    try {
        // 1. Check existing record for Rate Limiting
        const { data: existing } = await supabaseAdmin
            .from('phone_otps')
            .select('*')
            .eq('phone', phone)
            .single();

        const now = new Date();

        if (existing) {
            // Check Rate Limit (Reset attempts if older than 1 hour)
            const lastUpdated = new Date(existing.updated_at);
            const isHourPassed = (now.getTime() - lastUpdated.getTime()) > 3600000;

            if (!isHourPassed && existing.attempts >= MAX_ATTEMPTS_PER_HOUR) {
                return { success: false, message: "Too many attempts. Try again in an hour." };
            }

            // Check Cooldown (Prevent spamming send button)
            const secondsSinceLast = (now.getTime() - lastUpdated.getTime()) / 1000;
            if (secondsSinceLast < RESEND_COOLDOWN_SECONDS && !isHourPassed) {
                return { success: false, message: `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceLast)}s before resending.` };
            }
        }

        // 2. Generate OTP
        const otp = randomInt(100000, 999999).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(now.getTime() + OTP_VALIDITY_MINUTES * 60000);

        // 3. Store/Update in DB
        let newAttempts = 1;
        if (existing) {
            const lastUpdated = new Date(existing.updated_at);
            const isHourPassed = (now.getTime() - lastUpdated.getTime()) > 3600000;
            if (!isHourPassed) {
                newAttempts = (existing.attempts || 0) + 1;
            }
        }

        const { error: dbError } = await supabaseAdmin
            .from('phone_otps')
            .upsert({
                phone,
                otp_hash: otpHash,
                expires_at: expiresAt.toISOString(),
                attempts: newAttempts,
                verified: false,
                updated_at: new Date().toISOString()
            }, { onConflict: 'phone' });

        if (dbError) {
            console.error("DB Error saving OTP:", dbError);
            return { success: false, message: "Database error. Please try again." };
        }

        // 4. Send SMS
        // Note: For dev/testing without API Key, lib/sms.ts should mock it.
        const sent = await sendFast2SMS(phone, otp);
        if (!sent) {
            // Should we rollback attempts? maybe not, to prevent abuse of "failed" sends.
            return { success: false, message: "Failed to send SMS. Check number or try later." };
        }

        return { success: true, message: `OTP sent to ${phone}` };

    } catch (err) {
        console.error("Request OTP Error:", err);
        return { success: false, message: "Internal server error." };
    }
}

export async function verifyPhoneOtp(phone: string, otp: string) {
    if (!phone || !otp) return { success: false, message: "Missing phone or OTP" };

    try {
        const { data: record } = await supabaseAdmin
            .from('phone_otps')
            .select('*')
            .eq('phone', phone)
            .single();

        if (!record) {
            return { success: false, message: "No OTP request found for this number." };
        }

        if (new Date() > new Date(record.expires_at)) {
            return { success: false, message: "OTP has expired. Request a new one." };
        }

        if (record.verified) {
            return { success: true, message: "Already verified." };
        }

        const isValid = await bcrypt.compare(otp, record.otp_hash);
        if (!isValid) {
            return { success: false, message: "Invalid OTP." };
        }

        // Success!
        // 1. Mark OTP record as verified
        await supabaseAdmin.from('phone_otps').update({ verified: true }).eq('phone', phone);

        return { success: true, message: "Phone verified successfully!" };

    } catch (err) {
        console.error("Verify OTP Error:", err);
        return { success: false, message: "Verification failed." };
    }
}
