"use server"

import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"
import bcrypt from "bcryptjs"

const signupSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(10),
    password: z.string().min(6),
    role: z.enum(["candidate", "recruiter"]).default("candidate")
})

export async function signup(formData: FormData) {
    const data = Object.fromEntries(formData.entries())
    const parsed = signupSchema.safeParse(data)

    if (!parsed.success) {
        return { error: "Invalid data", details: parsed.error.flatten() }
    }

    const { name, phone, password: rawPassword, role } = parsed.data
    // 2. FIX EMAIL CASE & TRIMMING
    const email = parsed.data.email.trim().toLowerCase();
    const password = rawPassword.trim();

    console.log(`[Signup Debug] Email: '${email}' (Len: ${email.length})`);

    try {
        console.log(`[Auth] Creating user & hash: ${email}`);

        // Hash password manually
        const passwordHash = await bcrypt.hash(password, 10);

        // 1. USE SUPABASE ADMIN TO CREATE USER (For ID generation)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password, // We still set it in Supabase for fallback/dashboard usage if needed
            email_confirm: true, // AUTO-CONFIRMATION
            user_metadata: {
                full_name: name,
                phone: phone,
                role: role
            }
        });

        if (authError) {
            console.error("[Auth] Supabase Admin CreateUser Error:", authError);
            return { error: authError.message };
        }

        if (!authData.user) {
            throw new Error("Signup failed. No user returned.");
        }

        console.log(`[Auth] User created: ${authData.user.id}`);

        // 2. CREATE PROFILE WITH PASSWORD HASH
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: authData.user.id,
                user_id: authData.user.id,
                email: email,
                full_name: name,
                mobile_number: phone,
                email_verified: true,
                verification_token: null,
                password_hash: passwordHash, // STORE MANUAL HASH
                role: role
            }, { onConflict: 'id' });

        if (profileError) {
            console.error("Failed to create profile:", profileError);
        } else {
            console.log("Profile initialized with hash.");
        }

        return { success: true }
    } catch (error: any) {
        console.error("[Auth] Signup error:", error);
        return { error: error.message || "An unexpected error occurred" };
    }
}

export async function verifyEmail(token: string) {
    if (!token) return { error: "Missing token" };

    try {
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update({
                email_verified: true,
                verification_token: null // Clear token after usage
            })
            .eq('verification_token', token)
            .select()
            .single();

        if (error || !data) {
            return { error: "Invalid or expired token." };
        }

        return { success: true };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function resetPasswordAction(token: string, password: string) {
    if (!token || !password || password.length < 6) {
        return { error: "Invalid input" };
    }

    try {
        // Hash Password (BCRYPT)
        const passwordHash = await bcrypt.hash(password.trim(), 10);

        // Verify User via Supabase
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

        if (userError || !user) {
            console.error("Reset Password Action: Invalid Token", userError);
            return { error: "Session expired. Please click the reset link again." };
        }

        // Update Supabase Auth User
        const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
            password: password
        });

        if (updateAuthError) {
            console.error("Failed to update Supabase Auth User:", updateAuthError);
            return { error: "Failed to update account credentials." };
        }

        // Update Profiles Table (CRITICAL for CredentialsProvider)
        const { error: updateProfileError } = await supabaseAdmin
            .from('profiles')
            .update({ password_hash: passwordHash })
            .eq('id', user.id);

        if (updateProfileError) {
            console.error("Failed to update Profile hash:", updateProfileError);
            return { error: "Failed to sync password. Please try again." };
        }

        return { success: true };

    } catch (e: any) {
        console.error("Reset Password Exception:", e);
        return { error: e.message };
    }
}
