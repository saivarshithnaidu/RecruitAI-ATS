"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { revalidatePath } from "next/cache";

export type InactiveCandidate = {
    user_id: string;
    email: string;
    full_name: string;
    last_login_at: string | null;
    reminder_sent_at: string | null;
    computed_status: 'LOGGED_IN_ONLY' | 'PROFILE_INCOMPLETE' | 'APPLICATION_INCOMPLETE' | 'EXAM_ASSIGNED_NOT_STARTED' | 'EXAM_STARTED_NOT_SUBMITTED' | 'UNKNOWN';
}

export async function getInactiveCandidates(): Promise<{ success: boolean; candidates?: InactiveCandidate[]; error?: string }> {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== ROLES.ADMIN) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        console.log("Fetching Inactive Candidates...");

        // 1. Fetch ALL Profiles (Base of users)
        // We filter somewhat by existing logins if possible, but let's just get all role=candidate (metadata) or profiles table.
        // Assuming 'profiles' table has candidates.
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, email, full_name, last_login_at, reminder_sent_at')
            .not('last_login_at', 'is', null) // Only those who logged in at least once
            .order('last_login_at', { ascending: false });

        if (profileError) throw profileError;

        // 2. Fetch Applications
        const { data: applications } = await supabaseAdmin
            .from('applications')
            .select('user_id, status');

        // 3. Fetch Exam Assignments
        const { data: exams } = await supabaseAdmin
            .from('exam_assignments')
            .select('candidate_id, status');

        // 4. Compute Status
        const inactiveList: InactiveCandidate[] = [];
        const appMap = new Map((applications || []).map(a => [a.user_id, a]));
        const examMap = new Map((exams || []).map(e => [e.candidate_id, e]));

        for (const p of profiles) {
            const app = appMap.get(p.id);
            const exam = examMap.get(p.id);

            // Exclude Completed/Terminal States
            if (app) {
                if (['EXAM_PASSED', 'HIRED', 'REJECTED', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED'].includes(app.status)) {
                    continue; // Active or Completed
                }
            }

            // Also exclude if Exam Passed/Failed (redundant check but safe)
            if (exam) {
                if (['passed', 'failed', 'completed'].includes(exam.status)) {
                    continue;
                }
            }

            let status: InactiveCandidate['computed_status'] = 'UNKNOWN';

            if (!app) {
                // No Application
                if (!p.full_name) {
                    // Very basic check for profile completeness.
                    status = 'PROFILE_INCOMPLETE';
                } else {
                    status = 'LOGGED_IN_ONLY'; // Or APPLICATION_INCOMPLETE
                    // If they logged in and have name but no app -> App Incomplete
                    status = 'APPLICATION_INCOMPLETE';
                }
            } else {
                // Has Application
                if (app.status === 'APPLIED') {
                    // Applied but no Exam? Usually Admin needs to assign exam.
                    // THIS IS NOT A CANDIDATE ACTION. Admin needs to assign exam.
                    // So candidate is WAITING. Not strictly "Inactive" in terms of "dropped off".
                    // But requirements say "Did not complete... Assigned exam attempt".
                    // So if they are 'APPLIED' they are waiting.
                    // Only if 'EXAM_ASSIGNED' we track.
                    continue; // Waiting for Admin
                } else if (app.status === 'EXAM_ASSIGNED') {
                    if (exam?.status === 'assigned') {
                        status = 'EXAM_ASSIGNED_NOT_STARTED';
                    } else if (exam?.status === 'in_progress') {
                        status = 'EXAM_STARTED_NOT_SUBMITTED';
                    }
                }
            }

            if (status !== 'UNKNOWN') {
                inactiveList.push({
                    user_id: p.id,
                    email: p.email,
                    full_name: p.full_name || "Unknown",
                    last_login_at: p.last_login_at,
                    reminder_sent_at: p.reminder_sent_at,
                    computed_status: status
                });
            }
        }

        return { success: true, candidates: inactiveList };

    } catch (e: any) {
        console.error("Fetch Inactive Error:", e);
        return { success: false, error: e.message };
    }
}

export async function sendCandidateReminder(candidateId: string) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== ROLES.ADMIN) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        // 1. Check constraints (24h)
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('email, full_name, reminder_sent_at')
            .eq('id', candidateId)
            .single();

        if (!profile) return { error: "Candidate not found" };

        if (profile.reminder_sent_at) {
            const lastSent = new Date(profile.reminder_sent_at).getTime();
            const now = Date.now();
            const hoursDiff = (now - lastSent) / (1000 * 60 * 60);
            if (hoursDiff < 24) {
                return { error: "Reminder already sent in the last 24 hours." };
            }
        }

        // 2. Send Email
        const { sendEmail } = await import("@/lib/email");
        const { EmailTemplates } = await import("@/lib/email-templates");

        const firstName = profile.full_name?.split(' ')[0] || "Candidate";
        const loginLink = "https://www.recruitaitech.in";

        const template = EmailTemplates.reminderInvite(firstName, loginLink);

        const emailRes = await sendEmail({
            to: profile.email,
            subject: template.subject,
            html: template.html
        });

        if (!emailRes.success) throw new Error("Email sending failed");

        // 3. Update DB
        await supabaseAdmin
            .from('profiles')
            .update({ reminder_sent_at: new Date().toISOString() })
            .eq('id', candidateId);

        revalidatePath('/admin/inactive');
        return { success: true };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// ------------------------------------------------------------------
// RESTORED FUNCTIONS FOR CANDIDATE PROFILE MANAGEMENT
// ------------------------------------------------------------------

export async function getAdminCandidateProfile(id: string) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== ROLES.ADMIN) {
        return { error: "Unauthorized" };
    }

    try {
        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return { profile };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function approveCandidateProfile(id: string) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== ROLES.ADMIN) {
        return { error: "Unauthorized" };
    }

    try {
        await supabaseAdmin
            .from('profiles')
            .update({ verified_by_admin: true, verification_status: 'approved' })
            .eq('id', id);

        revalidatePath(`/admin/dashboard/candidates/${id}`);
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function rejectCandidateProfile(id: string) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== ROLES.ADMIN) {
        return { error: "Unauthorized" };
    }

    try {
        await supabaseAdmin
            .from('profiles')
            .update({ verified_by_admin: false, verification_status: 'rejected' })
            .eq('id', id);

        revalidatePath(`/admin/dashboard/candidates/${id}`);
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}
