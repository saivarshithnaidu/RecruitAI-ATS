import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { EmailTemplates } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email";

/**
 * RecruitAI Campaign Automation Engine
 * Recommended: Triggered every 24h by n8n.
 * 
 * To respect strict rate limiting without timeouts: 
 * We fetch 50 and send with standard API response while updating in real-time.
 * If running on a serverless env (Vercel), we recommend triggering 
 * /api/automation/campaign/send-one every 2 minutes instead.
 */
export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        if (authHeader !== `Bearer ${process.env.AUTOMATION_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { limit = 50 } = await req.json();

        // 1. Fetch PENDING
        const { data: pending, error } = await supabaseAdmin
            .from('campaign_emails')
            .select('*')
            .eq('status', 'PENDING')
            .order('id', { ascending: true })
            .limit(limit);

        if (error) throw error;
        if (!pending || pending.length === 0) return NextResponse.json({ success: true, count: 0, status: "FINISHED" });

        let processed = 0;
        let errors = 0;

        // Process in batch
        // NOTE: Standard Vercel timeout is 10-60s. For 50 emails, we may hit this.
        // We optimize by returning early if we sense we are nearing timeout.
        const startTime = Date.now();
        const timeoutLimit = 45000; // 45s safety buffer for 60s max

        for (const item of pending) {
            if (Date.now() - startTime > timeoutLimit) break;

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

                processed++;
            } catch (err: any) {
                console.error(`Automation failed for ${item.email}:`, err);
                await supabaseAdmin
                    .from('campaign_emails')
                    .update({ status: 'FAILED', error_message: err.message })
                    .eq('id', item.id);
                errors++;
            }
        }

        return NextResponse.json({ 
            success: true, 
            status: processed === pending.length ? "COMPLETED" : "PARTIAL_TIMEOUT",
            processed, 
            errors,
            remaining: pending.length - processed 
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
