"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ROLES } from "@/lib/roles";

/**
 * WITHDRAW APPLICATION
 * Candidate can withdraw if not already in terminal state.
 */
export async function withdrawApplication(applicationId: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return { success: false, message: "Unauthorized" };
    }

    try {
        // 1. Verify Ownership & Status
        const { data: app, error: fetchError } = await supabaseAdmin
            .from('applications')
            .select('user_id, status')
            .eq('id', applicationId)
            .single();

        if (fetchError || !app) {
            return { success: false, message: "Application not found" };
        }

        if (app.user_id !== session.user.id) {
            return { success: false, message: "Unauthorized: You can only withdraw your own applications" };
        }

        // Terminal states where withdrawal is redundant or not allowed
        const terminalStates = ['WITHDRAWN', 'REJECTED', 'HIRED', 'DELETED', 'EXAM_FAILED'];
        if (terminalStates.includes(app.status)) {
            return { success: false, message: `Application is already ${app.status.toLowerCase().replace('_', ' ')}` };
        }

        // 2. Perform Withdraw (Soft)
        const { error: updateError } = await supabaseAdmin
            .from('applications')
            .update({
                status: 'WITHDRAWN',
                withdrawn_at: new Date().toISOString() // Ensure schema supports this, or ignore if error
            })
            .eq('id', applicationId);

        if (updateError) throw updateError;

        // 3. Cancel any active exam assignments
        await supabaseAdmin
            .from('exam_assignments')
            .update({ status: 'cancelled' })
            .eq('application_id', applicationId)
            .eq('status', 'assigned'); // Only cancel pending assignments

        revalidatePath('/dashboard');
        revalidatePath('/admin/applications');
        return { success: true, message: "Application withdrawn successfully" };

    } catch (error: any) {
        console.error("Withdraw Error:", error);
        return { success: false, message: error.message || "Failed to withdraw" };
    }
}

/**
 * DELETE APPLICATION (ADMIN)
 * Soft delete for audit purposes.
 */
export async function deleteApplication(applicationId: string) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== ROLES.ADMIN) {
        return { success: false, message: "Unauthorized Action" };
    }

    try {
        const { error } = await supabaseAdmin
            .from('applications')
            .update({
                status: 'DELETED',
                deleted_at: new Date().toISOString()
            })
            .eq('id', applicationId);

        if (error) throw error;

        revalidatePath('/admin/applications');
        return { success: true, message: "Application deleted successfully" };
    } catch (error: any) {
        console.error("Delete Error:", error);
        return { success: false, message: error.message || "Failed to delete" };
    }
}
