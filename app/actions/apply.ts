"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ROLES } from "@/lib/roles";

// Validation Schema
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

    // Education - 10th
    eduTenthSchool: z.string().min(2, "School name is required"),
    eduTenthBoard: z.string().min(2, "Board is required"),
    eduTenthState: z.string().min(2, "State is required"),
    eduTenthYear: z.string().regex(/^\d{4}$/, "Invalid Year"),
    eduTenthScore: z.string().min(1, "Percentage/CGPA is required"),

    // Education - Intermediate (12th or Diploma)
    eduType: z.enum(["12th", "diploma"]),
    // We will clean these up manually in the function or use refinement if strict logic needed
    // For now, we allow optional in schema and validate manually to keep Zod simple or use stricter conditional
    eduInterInstitute: z.string().optional(),
    eduInterBoard: z.string().optional(),
    eduInterState: z.string().optional(),
    eduInterYear: z.string().optional(), // regex check manually if present
    eduInterScore: z.string().optional(),
    eduInterStream: z.string().optional(), // For 12th
    eduInterBranch: z.string().optional(), // For Diploma

    // Education - Graduation (Existing)
    educationDegree: z.string().min(1, "Degree is required"),
    educationCollege: z.string().min(1, "College is required"),
    educationYear: z.string().regex(/^\d{4}$/, "Invalid Year"),

    // Skills & Preferences
    skills: z.string().min(1, "At least one skill is required"), // Comma separated
    preferredRoles: z.string().min(1, "At least one role is required"), // Comma separated
    consent: z.string().optional(), // Checkbox sends "on" if checked, missing if not
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
        fullName: (formData.get("fullName") as string || "").trim(),
        phone: (formData.get("phone") as string || "").trim(),
        addressStreet: (formData.get("addressStreet") as string || "").trim(),
        addressCity: (formData.get("addressCity") as string || "").trim(),
        addressState: (formData.get("addressState") as string || "").trim(),
        addressPincode: (formData.get("addressPincode") as string || "").trim(),

        // 10th
        eduTenthSchool: (formData.get("eduTenthSchool") as string || "").trim(),
        eduTenthBoard: (formData.get("eduTenthBoard") as string || "").trim(),
        eduTenthState: (formData.get("eduTenthState") as string || "").trim(),
        eduTenthYear: (formData.get("eduTenthYear") as string || "").trim(),
        eduTenthScore: (formData.get("eduTenthScore") as string || "").trim(),

        // Inter
        eduType: (formData.get("eduType") as "12th" | "diploma" || "12th"),
        eduInterInstitute: (formData.get("eduInterInstitute") as string || "").trim(),
        eduInterBoard: (formData.get("eduInterBoard") as string || "").trim(),
        eduInterState: (formData.get("eduInterState") as string || "").trim(),
        eduInterYear: (formData.get("eduInterYear") as string || "").trim(),
        eduInterScore: (formData.get("eduInterScore") as string || "").trim(),
        eduInterStream: (formData.get("eduInterStream") as string || "").trim(),
        eduInterBranch: (formData.get("eduInterBranch") as string || "").trim(),

        // Graduation
        educationDegree: (formData.get("educationDegree") as string || "").trim(),
        educationCollege: (formData.get("educationCollege") as string || "").trim(),
        educationYear: (formData.get("educationYear") as string || "").trim(),

        skills: (formData.get("skills") as string || "").trim(),
        preferredRoles: (formData.get("preferredRoles") as string || "").trim(),
        consent: (formData.get("consent") as string || ""),
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

    // Custom Validation for Intermediate fields
    const data = validated.data;
    const errors: Record<string, string[]> = {};

    if (!data.eduInterInstitute) errors.eduInterInstitute = ["Institute name is required"];
    if (!data.eduInterBoard) errors.eduInterBoard = ["Board/University is required"];
    if (!data.eduInterState) errors.eduInterState = ["State is required"];
    if (!data.eduInterYear) errors.eduInterYear = ["Passing year is required"];
    if (!data.eduInterScore) errors.eduInterScore = ["Score is required"];

    if (data.eduType === '12th') {
        if (!data.eduInterStream) errors.eduInterStream = ["Stream is required"];
    } else {
        if (!data.eduInterBranch) errors.eduInterBranch = ["Branch is required"];
    }

    if (Object.keys(errors).length > 0) {
        return { success: false, message: "Please check education details.", errors };
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
            skills, preferredRoles, consent,
            eduTenthSchool, eduTenthBoard, eduTenthState, eduTenthYear, eduTenthScore,
            eduType, eduInterInstitute, eduInterBoard, eduInterState, eduInterYear, eduInterScore, eduInterStream, eduInterBranch
        } = validated.data;

        // Verify Consent (Double Check)
        if (!consent) {
            return { success: false, message: "You must agree to the Terms & Privacy Policy." };
        }

        // --- SECURITY CHECK: VERIFY PHONE OTP STATUS ---
        // We now check candidate_profiles because the unified OTP flow updates that table directly.
        // The phone_otps table is legacy/deprecated for this flow.
        const { data: profileCheck } = await supabaseAdmin
            .from('candidate_profiles')
            .select('phone, phone_verified')
            .eq('user_id', userId)
            .single();

        // Strict check: The profile must have the SAME phone number as submitted, AND be verified.
        // If the user changed the number in the form, they must have verified it (which updates the profile).
        if (!profileCheck || profileCheck.phone !== phone || !profileCheck.phone_verified) {
            console.warn(`⚠️ Blocked submission: Profile phone '${profileCheck?.phone}' vs Form '${phone}', Verified: ${profileCheck?.phone_verified}`);
            return { success: false, message: "Please verify your mobile number before submitting." };
        }
        // -----------------------------------------------

        // 4. Construct Complex Objects
        const educationJSON = {
            tenth: {
                school: eduTenthSchool,
                board: eduTenthBoard,
                state: eduTenthState,
                year: eduTenthYear,
                score: eduTenthScore
            },
            intermediate: {
                type: eduType,
                institute: eduInterInstitute,
                board: eduInterBoard,
                state: eduInterState,
                year: eduInterYear,
                score: eduInterScore,
                // Include stream OR branch based on type
                ...(eduType === '12th' ? { stream: eduInterStream } : { branch: eduInterBranch })
            },
            graduation: {
                degree: educationDegree,
                college: educationCollege,
                year: educationYear
            }
        };
        const skillsArray = skills.split(',').map(s => s.trim()).filter(Boolean);
        const rolesArray = preferredRoles.split(',').map(r => r.trim()).filter(Boolean);

        // --- NEW: Profile Photo Upload ---
        const profilePhoto = formData.get("profilePhoto") as File;
        let profilePhotoUrl = null;

        if (profilePhoto && profilePhoto.size > 0) {
            const photoPath = `photos/${userId}/${Date.now()}-${profilePhoto.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const { error: photoError } = await supabaseAdmin.storage
                .from('profile-photos')
                .upload(photoPath, profilePhoto, {
                    contentType: profilePhoto.type,
                    upsert: false
                });

            if (photoError) {
                console.error("Photo Upload Error:", photoError);
                // Non-blocking error, but ideally should notify
            } else {
                const { data: publicData } = supabaseAdmin
                    .storage
                    .from('profile-photos')
                    .getPublicUrl(photoPath);
                profilePhotoUrl = publicData.publicUrl;
            }
        }
        // ---------------------------------

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

        // Add photo data if available
        if (profilePhotoUrl) {
            // @ts-ignore
            profileData.profile_photo_url = profilePhotoUrl;
            // @ts-ignore
            profileData.photo_status = 'PENDING';
        }

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
        const terminalStatuses = ['WITHDRAWN', 'REJECTED', 'EXAM_FAILED', 'DELETED', 'HIRED', 'EXAM_EXPIRED', 'EXPIRED'];
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

        // --- SELF-HEALING: Ensure 'profiles' table has this user (Fixes applications_profile_id_fkey) ---
        // Some users might be missing from the legacy 'profiles' table if triggers failed.
        // We sync basic info from candidate_profiles data to profiles to satisfy the FK.
        const { error: profileSyncError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: userId,
                // user_id: userId, // Some schemas use user_id col, some use id. upsert usually safe if PK is id.
                full_name: fullName,
                email: email,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

        if (profileSyncError) {
            console.warn("⚠️ Warning: Could not sync to 'profiles' table:", profileSyncError.message);
            // Proceeding... assuming maybe it exists but upsert failed on unrelated col?
            // Or if it fails completely, the next app insert will fail too, catching it below.
        }
        // --------------------------------------------------------------------------------------------------

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
                profile_id: userId, // Fixed: Schema expects user_id here (confirmed via debug)
                full_name: fullName,
                email: email,
                phone: phone,
                resume_url: resumePath,
                status: 'APPLIED',
                ats_score: 0,
                // accepted_terms_at: new Date().toISOString() // Temporarily commented out until DB migration is confirmed
                // NOTE to USER: Uncomment the line below after running migration:
                accepted_terms_at: new Date().toISOString()
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
