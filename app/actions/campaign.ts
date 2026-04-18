'use server';

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import * as XLSX from "xlsx";
import { revalidatePath } from "next/cache";

/**
 * RecruitAI Campaign Outreach Actions
 */

export async function uploadCampaignEmails(formData: FormData) {
    try {
        const file = formData.get("file") as File;
        if (!file) throw new Error("No file selected");

        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(Buffer.from(buffer), { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as any[];

        const emailsToInsert = data
            .map((row: any) => ({
                email: row.email || row.Email || row["Email Address"],
                name: row.name || row.Name || row["Candidate Name"] || null,
                role: row.role || row.Role || row["Target Role"] || "Software Engineer",
                status: 'PENDING'
            }))
            .filter(item => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return item.email && emailRegex.test(item.email);
            });

        if (emailsToInsert.length === 0) throw new Error("No valid emails found in file.");

        const { error } = await supabaseAdmin
            .from('campaign_emails')
            .upsert(emailsToInsert, { onConflict: 'email' });

        if (error) throw error;

        revalidatePath("/admin/campaign");
        return { success: true, count: emailsToInsert.length };

    } catch (e: any) {
        console.error("Campaign Upload Error:", e);
        return { error: e.message };
    }
}

export async function getCampaignStats() {
    try {
        const { data, error } = await supabaseAdmin
            .from('campaign_emails')
            .select('status');

        if (error) throw error;

        const stats = {
            total: data.length,
            pending: data.filter(d => d.status === 'PENDING').length,
            sent: data.filter(d => d.status === 'SENT').length,
            failed: data.filter(d => d.status === 'FAILED').length,
        };

        return stats;
    } catch (e: any) {
        return { error: e.message };
    }
}

/**
 * Sends the next batch of emails (Triggered by Automation)
 */
export async function processCampaignBatch(limit: number = 50) {
    try {
        // Fetch pending emails
        const { data: pending, error } = await supabaseAdmin
            .from('campaign_emails')
            .select('*')
            .eq('status', 'PENDING')
            .limit(limit);

        if (error) throw error;
        if (!pending || pending.length === 0) return { success: true, sent: 0, status: "NO_PENDING" };

        const { sendEmail } = await import("@/lib/email");
        const { EmailTemplates } = await import("@/lib/email-templates");

        let sentCount = 0;
        let failCount = 0;

        for (const item of pending) {
            try {
                const template = EmailTemplates.campaignInvite(item.name, item.role);
                
                await sendEmail({
                    to: item.email,
                    subject: template.subject,
                    html: template.html
                });

                await supabaseAdmin
                    .from('campaign_emails')
                    .update({ status: 'SENT', sent_at: new Date().toISOString() })
                    .eq('id', item.id);

                sentCount++;
                
                // Rate Limiting: Small jitter delay for simple batching
                // Real 1-2 min delay should be handled by the automation trigger frequency
                await new Promise(r => setTimeout(r, 1000)); 

            } catch (err: any) {
                console.error(`Failed to send campaign email to ${item.email}:`, err);
                await supabaseAdmin
                    .from('campaign_emails')
                    .update({ status: 'FAILED', error_message: err.message })
                    .eq('id', item.id);
                failCount++;
            }
        }

        return { success: true, sent: sentCount, failed: failCount };

    } catch (e: any) {
        return { error: e.message };
    }
}
