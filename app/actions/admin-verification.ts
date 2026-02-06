"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { revalidatePath } from "next/cache";

export async function getPendingPhotos() {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user.role !== ROLES.ADMIN) {
        return [];
    }

    const { data, error } = await supabaseAdmin
        .from('candidate_profiles')
        .select('user_id, full_name, email, profile_photo_url, photo_status, created_at')
        .eq('photo_status', 'PENDING')
        .not('profile_photo_url', 'is', null)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching pending photos:", error);
        return [];
    }

    return data;
}

export async function verifyPhoto(userId: string) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user.role !== ROLES.ADMIN) {
        return { success: false, message: "Unauthorized" };
    }

    const { error } = await supabaseAdmin
        .from('candidate_profiles')
        .update({
            photo_status: 'VERIFIED',
            photo_rejection_reason: null
        })
        .eq('user_id', userId);

    if (error) return { success: false, message: error.message };

    revalidatePath('/admin/verification');
    return { success: true, message: "Photo Verified Successfully" };
}

export async function rejectPhoto(userId: string, reason: string) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user.role !== ROLES.ADMIN) {
        return { success: false, message: "Unauthorized" };
    }

    const { error } = await supabaseAdmin
        .from('candidate_profiles')
        .update({
            photo_status: 'REJECTED',
            photo_rejection_reason: reason
        })
        .eq('user_id', userId);

    if (error) return { success: false, message: error.message };

    // TODO: Send Email Notification via Nodemailer (Leaving placeholder as requested simplicity)
    // await sendEmail(userEmail, "Photo Rejected", `Reason: ${reason}`);

    revalidatePath('/admin/verification');
    return { success: true, message: "Photo Rejected" };
}
