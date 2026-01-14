import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { ROLES } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // Strict Admin Check
        // @ts-ignore
        if (!session || session.user?.role !== ROLES.ADMIN) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { emails, subject, message } = body;

        if (!emails || !Array.isArray(emails) || emails.length === 0) {
            return NextResponse.json({ error: "No emails provided" }, { status: 400 });
        }

        if (!subject || !message) {
            return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
        }

        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[]
        };

        // Send emails sequentially to avoid rate limiting and ensure individual sending
        for (const email of emails) {
            const cleanEmail = email.trim();
            if (!cleanEmail) continue;

            // Generate a unique token for tracking
            const token = crypto.randomUUID();
            const personalPortalLink = `${process.env.NEXTAUTH_URL}/invite?token=${token}`;
            const personalMessage = message.replace(/{{portal_link}}/g, personalPortalLink);

            const finalHtml = `
                <div style="font-family: sans-serif; padding: 20px;">
                    <p>${personalMessage.replace(/\n/g, '<br>')}</p>
                    <br/>
                    <p style="font-size: 12px; color: #666;">
                        You are receiving this email because you were invited to apply at RecruitAI.
                    </p>
                </div>
            `;

            const result = await sendEmail({
                to: cleanEmail,
                subject: subject,
                html: finalHtml
            });

            if (result.success) {
                // Track invite in database
                const { error: dbError } = await supabaseAdmin
                    .from('invites')
                    .insert({
                        email: cleanEmail,
                        token: token,
                        sent_at: new Date().toISOString(),
                        clicked: false
                    });

                if (dbError) {
                    console.error(`Failed to track invite for ${cleanEmail}:`, dbError);
                    // Consider it a partial failure or just log? 
                    // Proceeding as success since email was sent, but logging error.
                }

                results.success++;
            } else {
                results.failed++;
                // @ts-ignore
                results.errors.push(`${cleanEmail}: ${result.error?.message || 'Unknown error'}`);
            }
        }

        return NextResponse.json({
            success: true,
            summary: results,
            message: `Sent ${results.success} emails. Failed: ${results.failed}`
        });

    } catch (error: any) {
        console.error("Invite API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
