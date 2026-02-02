"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requestOtp, verifyOtp } from "./otp";

export async function requestPhoneOtp(phone: string) {
    if (!phone || phone.length < 10) {
        return { success: false, message: "Invalid phone number. Must be at least 10 digits." };
    }

    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
        return { success: false, message: "Unauthorized" };
    }

    const userId = session.user.id;

    try {
        // 1. Store Phone Number immediately (as per requirements)
        // We update the profile with the new phone number (marking as unverified implicitly via verifyOtp flow later)
        // Note: verifyOtp will set phone_verified=true upon success.
        // We should probably ensure phone_verified is false if we change the number?
        // But the requirements say "Store phone number in DB immediately".
        const { error: updateError } = await supabaseAdmin
            .from('candidate_profiles')
            .update({
                phone: phone,
                phone_verified: false // Reset verification since it's a new number request
            })
            .eq('user_id', userId);

        if (updateError) {
            console.error("Profile Phone Update Error:", updateError);
            return { success: false, message: "Failed to update phone number." };
        }

        // 2. Request OTP (logic handled in otp.ts -> sends via Email)
        const otpResult = await requestOtp('phone');

        if (otpResult.error) {
            return { success: false, message: otpResult.error };
        }

        return { success: true, message: `Verification code sent to your registered email (${session.user.email})` };

    } catch (err) {
        console.error("Request Phone OTP Error:", err);
        return { success: false, message: "Internal server error." };
    }
}

export async function verifyPhoneOtp(phone: string, otp: string) {
    if (!otp) return { success: false, message: "Missing OTP" };

    // We delegate verification to the unified OTP logic
    // The phone argument is technically redundant for the verification process (which relies on session + otp + table),
    // but useful for UI consistency.
    const result = await verifyOtp('phone', otp);

    if (result.error) {
        return { success: false, message: result.error };
    }

    return { success: true, message: "Phone verified successfully!" };
}
