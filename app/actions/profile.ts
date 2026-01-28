"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// Inline schema if file missing, or ensuring consistency.
// Ideally should be in lib/validations/profile.ts but to save tools I'll reuse or inline.
// I'll assume usage of the existing import if valid, but to be safe and fast I'll define here or expects specific shape.
// The prompted fields: full_name, mobile_number, education (json), skills (array), preferred_job_roles, summary
const profileUpdateSchema = z.object({
    full_name: z.string().min(2),
    mobile_number: z.string().optional(),
    education: z.any().optional(), // JSONB
    skills: z.string().optional(), // Comma separated input from form, converted to array
    preferred_job_roles: z.string().optional(), // Comma separated
    summary: z.string().optional(),
})

export async function getProfile() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return null
    }

    // Try finding by ID first
    let profile = null;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(session.user.id);

    if (isUUID) {
        const { data } = await supabaseAdmin
            .from('candidate_profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single();
        profile = data;
    }

    // Fallback: Find by Email if ID failed
    if (!profile) {
        console.log(`[getProfile] Profile not found by ID (UUID valid: ${isUUID}). Trying email: ${session.user.email}`);
        const { data: dataByEmail } = await supabaseAdmin
            .from('candidate_profiles')
            .select('*')
            .eq('email', session.user.email)
            .single();

        profile = dataByEmail;
    }

    if (profile) {
        return profile;
    }

    // If still no profile, and we have a valid UUID, create one.
    // If we DON'T have a valid UUID, we cannot create a profile linked to Auth.
    if (!isUUID) {
        console.error("[getProfile] Cannot auto-create profile: Session ID is not a valid UUID", session.user.id);
        return null;
    }

    // Auto-create logic if missing
    console.log(`Auto-creating profile for ${session.user.email}`);
    const newProfile = {
        user_id: session.user.id,
        email: session.user.email,
        // @ts-ignore
        full_name: session.user.name || 'Candidate',
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
        console.error("Failed to auto-create profile", insertError);
        return null;
    }

    return createdProfile;
}

export async function updateProfile(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    const rawData = {
        full_name: formData.get('full_name'),
        phone: formData.get('phone'), // Changed from mobile_number
        education: formData.get('education') ? JSON.parse(formData.get('education') as string) : [],
        skills: formData.get('skills'),
        preferred_roles: formData.get('preferred_roles'),
        summary: formData.get('summary')
    }

    // Convert comma-separated strings to arrays
    const skillsArray = (rawData.skills as string)?.split(',').map(s => s.trim()).filter(Boolean) || [];
    const rolesArray = (rawData.preferred_roles as string)?.split(',').map(r => r.trim()).filter(Boolean) || [];

    const { error } = await supabaseAdmin
        .from('candidate_profiles')
        .upsert({
            user_id: session.user.id,
            email: session.user.email,
            full_name: rawData.full_name,
            phone: rawData.phone,
            education: rawData.education,
            skills: skillsArray,
            preferred_roles: rolesArray,
            summary: rawData.summary,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })

    if (error) {
        console.error("Profile update error", error)
        return { error: "Failed to update profile" }
    }

    revalidatePath("/candidate/profile")
    return { success: true }
}
