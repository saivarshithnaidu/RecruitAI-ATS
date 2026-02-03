"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ROLES } from "@/lib/roles";

// Validation Schema
const applicationSchema = z.object({
    // Personal Details
    fullName: z.string().min(2, "Full name is required"),
    phone: z.string().min(10, "Valid phone number is required"),

    // Address
    addressStreet: z.string().min(5, "Street address is required"),
    addressCity: z.string().min(2, "City is required"),
    addressState: z.string().min(2, "State is required"),
    addressPincode: z.string().regex(/^\d{6}$/, "Invalid Pincode (6 digits required)"),

    // Education
    educationDegree: z.string().min(1, "Degree is required"),
    educationCollege: z.string().min(1, "College is required"),
    educationYear: z.string().regex(/^\d{4}$/, "Invalid Year"),

    // Skills & Preferences
    skills: z.string().min(1, "At least one skill is required"), // Comma separated
    preferredRoles: z.string().min(1, "At least one role is required"), // Comma separated

    // Resume (File validation handled separately as it comes as FormData Entry)
});

export type ApplicationState = {
    success?: boolean;
    message?: string;
    errors?: Record<string, string[]>;
    step?: number;
};

export async function submitUnifiedApplication(
    prevState: ApplicationState,
    formData: FormData
): Promise<ApplicationState> {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
        return { success: false, message: "Unauthorized: Please log in." };
    }

    // @ts-ignore
    if (session.user.role !== ROLES.CANDIDATE) {
        return { success: false, message: "Only candidates can apply." };
    }

    // 1. Extract Data
    const rawData = {
        fullName: (formData.get("fullName") as string)?.trim(),
        phone: (formData.get("phone") as string)?.trim(),
        addressStreet: (formData.get("addressStreet") as string)?.trim(),
        addressCity: (formData.get("addressCity") as string)?.trim(),
        addressState: (formData.get("addressState") as string)?.trim(),
        addressPincode: (formData.get("addressPincode") as string)?.trim(),
        educationDegree: (formData.get("educationDegree") as string)?.trim(),
        educationCollege: (formData.get("educationCollege") as string)?.trim(),
        educationYear: (formData.get("educationYear") as string)?.trim(),
        skills: (formData.get("skills") as string)?.trim(),
        preferredRoles: (formData.get("preferredRoles") as string)?.trim(),
    };

    const resumeFile = formData.get("resume") as File;

    // 2. Validate Fields
    const validated = applicationSchema.safeParse(rawData);
    if (!validated.success) {
        const errors = validated.error.flatten().fieldErrors;
        console.error("❌ Application Validation Failed:", errors);
        return {
            success: false,
            message: "Validation failed. Please check all fields.",
            errors: errors,
        };
    }

    // 3. Validate Resume
    if (!resumeFile || resumeFile.size === 0) {
        return { success: false, message: "Resume is required." };
    }
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowedTypes.includes(resumeFile.type)) {
        return { success: false, message: "Invalid file type. Only PDF and DOC/DOCX allowed." };
    }

    try {
        const userId = session.user.id;
        const email = session.user.email;
        const {
            fullName, phone,
            addressStreet, addressCity, addressState, addressPincode,
            educationDegree, educationCollege, educationYear,
            skills, preferredRoles
        } = validated.data;

        // --- SECURITY CHECK: VERIFY PHONE OTP STATUS ---
        const { data: otpRecord } = await supabaseAdmin
            .from('phone_otps')
            .select('verified')
            .eq('phone', phone)
            .single();

        // Allow if running in dev/test without strict OTP, OR enforce it?
        // Requirement said "Disable submit until phone is verified".
        // Use strict check.
        if (!otpRecord?.verified) {
            console.warn(`⚠️ Blocked submission for unverified phone: ${phone}`);
            return { success: false, message: "Please verify your mobile number before submitting." };
        }
        // -----------------------------------------------

        // 4. Construct Complex Objects
        const educationJSON = {
            degree: educationDegree,
            college: educationCollege,
            year: educationYear
        };
        const skillsArray = skills.split(',').map(s => s.trim()).filter(Boolean);
        const rolesArray = preferredRoles.split(',').map(r => r.trim()).filter(Boolean);

        // 5. UPSERT PROFILE
        // We update the 'candidate_profiles' table (Source of Truth)
        const profileData = {
            user_id: userId,
            email: email,
            full_name: fullName,
            phone: phone,
            address_street: addressStreet,
            address_city: addressCity,
            address_state: addressState,
            address_pincode: addressPincode,
            education: educationJSON,
            skills: skillsArray,
            preferred_roles: rolesArray,
            // profile_completed: true // Checking if column exists -> Safest to include if requested
        };

        // Perform Upsert
        const { error: profileError } = await supabaseAdmin
            .from('candidate_profiles')
            .upsert(profileData, { onConflict: 'user_id' });

        if (profileError) {
            console.error("Profile Upsert Error:", profileError);
            return { success: false, message: "Failed to update profile details. Please try again." };
        }

        // 6. Upload Resume
        const timestamp = Date.now();
        const safeFilename = resumeFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const resumePath = `applications/${userId}/${timestamp}-${safeFilename}`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from('resumes')
            .upload(resumePath, resumeFile, {
                contentType: resumeFile.type,
                upsert: false
            });

        if (uploadError) {
            console.error("Resume Upload Error:", uploadError);
            return { success: false, message: "Failed to upload resume." };
        }

        // 7. Check for Existing Active Application
        const terminalStatuses = ['WITHDRAWN', 'REJECTED', 'EXAM_FAILED', 'DELETED', 'HIRED'];
        const { data: existingApps } = await supabaseAdmin
            .from('applications')
            .select('status')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(1);

        if (existingApps && existingApps.length > 0) {
            if (!terminalStatuses.includes(existingApps[0].status)) {
                return { success: false, message: "You already have an active application." };
            }
        }

        // 8. Create Application
        const { data: profile } = await supabaseAdmin
            .from('candidate_profiles')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (!profile) {
            return { success: false, message: "System Error: Profile not found after update." };
        }

        const { error: appError } = await supabaseAdmin
            .from('applications')
            .insert({
                user_id: userId,
                profile_id: profile.id,
                full_name: fullName,
                email: email,
                phone: phone,
                resume_url: resumePath,
                status: 'APPLIED',
                ats_score: 0
            });

        if (appError) {
            console.error("Application Insert Error:", appError);
            return { success: false, message: "Failed to submit application record." };
        }

        revalidatePath('/dashboard');
        revalidatePath('/candidate/application');

        return { success: true, message: "Application submitted successfully!" };

    } catch (err: any) {
        console.error("Submit Unified App Error:", err);
        return { success: false, message: "An unexpected error occurred." };
    }
}
