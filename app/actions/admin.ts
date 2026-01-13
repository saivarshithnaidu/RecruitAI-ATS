"use server"

import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { ROLES } from "@/lib/roles"

// Verify if user is admin
async function checkAdmin() {
    const session = await getServerSession(authOptions)
    // @ts-ignore
    if (!session || session.user?.role !== ROLES.ADMIN) {
        throw new Error("Unauthorized: Admin access required")
    }
    return session;
}

export async function approveCandidateProfile(candidateId: string) {
    try {
        await checkAdmin();

        const { error } = await supabaseAdmin
            .from('candidate_profiles')
            .update({
                verified_by_admin: true,
                verification_status: 'verified'
            })
            .eq('user_id', candidateId);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error("Admin approval error:", error);
        return { error: error.message };
    }
}

export async function rejectCandidateProfile(candidateId: string) {
    try {
        await checkAdmin();

        const { error } = await supabaseAdmin
            .from('candidate_profiles')
            .update({
                verified_by_admin: false,
                verification_status: 'rejected'
            })
            .eq('user_id', candidateId);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error("Admin rejection error:", error);
        return { error: error.message };
    }
}

export async function getAdminCandidateProfile(candidateId: string) {
    try {
        await checkAdmin();

        // Fetch profile with all verification fields using USER_ID
        const { data: profile, error } = await supabaseAdmin
            .from('candidate_profiles')
            .select(`
                *,
                email_verified,
                verified_by_admin,
                verification_status
            `)
            .eq('user_id', candidateId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
            console.error("Supabase Profile Fetch Error:", error);
            throw new Error("Database error fetching profile");
        }

        if (profile) {
            return { profile };
        }

        // --- Auto-Create Profile Logic (Recovery) ---
        console.warn(`Profile not found for user_id ${candidateId}. Auto-creating...`);

        // 1. Fetch User Data from Auth to get Email
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(candidateId);

        if (userError || !userData.user) {
            console.error("Auth User Fetch Error:", userError);
            throw new Error(`User not found in Auth system for ID: ${candidateId}`);
        }

        const userEmail = userData.user.email;

        // 2. Insert Empty Profile
        const newProfile = {
            user_id: candidateId,
            email: userEmail,
            full_name: userData.user.user_metadata?.full_name || 'Candidate', // Fallback name
            email_verified: false,
            phone_verified: false,
            verified_by_admin: false,
            verification_status: 'pending'
        };

        const { data: createdProfile, error: insertError } = await supabaseAdmin
            .from('candidate_profiles')
            .insert(newProfile)
            .select()
            .single();

        if (insertError) {
            console.error("Profile Auto-Creation Error:", insertError);
            throw new Error("Failed to auto-create missing profile.");
        }

        return { profile: createdProfile };

    } catch (error: any) {
        console.error("Admin fetch profile error [FULL]:", error);
        return { error: error.message || "An unexpected error occurred fetching profile." };
    }
}
