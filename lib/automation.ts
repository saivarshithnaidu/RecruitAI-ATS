import { supabaseAdmin } from "./supabaseAdmin";
import { EmailTemplates } from "./email-templates";
import { sendEmail } from "./email";

/**
 * RecruitAI Automation Engine
 * Processes scheduled tasks and system-wide automated decisions.
 */
export const AutomationTasks = {
    /**
     * Finds candidates who missed their exam slot and marks them.
     */
    processMissedExams: async () => {
        console.log("[Automation] Checking for missed exam slots...");

        const now = new Date().toISOString();

        // 1. Fetch assignments where slot ended but status is still 'assigned'
        const { data: missed, error } = await supabaseAdmin
            .from('exam_assignments')
            .select(`
                id,
                candidate_id,
                exam_id,
                exams ( title ),
                exam_slots ( end_time )
            `)
            .eq('status', 'assigned')
            .not('slot_id', 'is', null);

        if (error || !missed) return { success: false, error: error?.message };

        const reallyMissed = missed.filter(m => {
            // @ts-ignore
            const endTime = m.exam_slots?.end_time;
            return endTime && new Date(endTime) < new Date(now);
        });

        console.log(`[Automation] Found ${reallyMissed.length} candidates who missed their slots.`);

        for (const m of reallyMissed) {
            // Update Assignment
            await supabaseAdmin
                .from('exam_assignments')
                .update({ status: 'missed' })
                .eq('id', m.id);

            // Fetch Candidate Email
            const { data: user } = await supabaseAdmin.auth.admin.getUserById(m.candidate_id);
            if (user?.user?.email) {
                // @ts-ignore
                const firstName = user.user.user_metadata?.full_name?.split(' ')[0] || "Candidate";
                // @ts-ignore
                const examTitle = m.exams?.title || "Technical Assessment";

                const template = EmailTemplates.slotMissed(
                    firstName,
                    examTitle,
                    `${process.env.NEXT_PUBLIC_APP_URL}/candidate/application`
                );

                await sendEmail({
                    to: user.user.email,
                    subject: template.subject,
                    html: template.html
                });
            }
        }

        return { success: true, processed: reallyMissed.length };
    },

    /**
     * Sends reminders for exams starting in the next 24 hours.
     */
    sendExamReminders: async () => {
        console.log("[Automation] Sending exam reminders...");

        const tomorrow = new Date();
        tomorrow.setHours(tomorrow.getHours() + 24);
        const tomorrowISO = tomorrow.toISOString();

        const now = new Date().toISOString();

        // Find assignments in slots starting soon
        const { data: upcoming, error } = await supabaseAdmin
            .from('exam_assignments')
            .select(`
                id,
                candidate_id,
                exam_id,
                exams ( title, duration_minutes ),
                exam_slots ( start_time )
            `)
            .eq('status', 'assigned')
            .not('slot_id', 'is', null);

        if (error || !upcoming) return { success: false, error: error?.message };

        const reminders = upcoming.filter(u => {
            // @ts-ignore
            const startTime = u.exam_slots?.start_time;
            return startTime && new Date(startTime) > new Date(now) && new Date(startTime) < new Date(tomorrowISO);
        });

        console.log(`[Automation] Sending ${reminders.length} reminders.`);

        for (const r of reminders) {
            const { data: user } = await supabaseAdmin.auth.admin.getUserById(r.candidate_id);
            if (user?.user?.email) {
                // @ts-ignore
                const firstName = user.user.user_metadata?.full_name?.split(' ')[0] || "Candidate";
                // @ts-ignore
                const examTitle = r.exams?.title || "Technical Assessment";
                // @ts-ignore
                const startTime = r.exam_slots?.start_time;

                const template = EmailTemplates.examAssigned(
                    firstName,
                    examTitle,
                    startTime,
                    // @ts-ignore
                    r.exams?.duration_minutes || 60,
                    `${process.env.NEXT_PUBLIC_APP_URL}/candidate/application`
                );

                // Customize subject for reminder
                await sendEmail({
                    to: user.user.email,
                    subject: `REMINDER: Your Exam is Scheduled Soon – RecruitAI`,
                    html: template.html
                });
            }
        }

        return { success: true, sent: reminders.length };
    }
};
