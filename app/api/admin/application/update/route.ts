import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ROLES } from "@/lib/roles";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        // @ts-ignore
        if (!session || session.user?.role !== ROLES.ADMIN) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { applicationId, status } = await req.json();

        if (!applicationId || !status) {
            return NextResponse.json({ success: false, message: "Missing fields" }, { status: 400 });
        }

        // 1. Normalize Status
        const newStatus = status.toUpperCase();

        // 2. Fetch Application First (to get email)
        const { data: application, error: fetchError } = await supabaseAdmin
            .from('applications')
            .select('email, full_name, role_applied')
            .eq('id', applicationId)
            .single();

        if (fetchError || !application) throw new Error("Application not found");

        // 3. Update Status
        const { error } = await supabaseAdmin
            .from('applications')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', applicationId);

        if (error) throw error;

        // 4. Send Email Notifications
        try {
            if (newStatus === 'SHORTLISTED') {
                await sendEmail({
                    to: application.email,
                    subject: `Update on your application for ${application.role_applied} - RecruitAI`,
                    html: `
                        <div style="font-family: Arial, sans-serif; color: #333;">
                            <h2>Congratulations, ${application.full_name}!</h2>
                            <p>We are pleased to inform you that your profile has been <strong>SHORTLISTED</strong> for the <strong>${application.role_applied}</strong> position.</p>
                            <p><strong>Next Steps:</strong></p>
                            <p>You will shortly receive an invitation for the assessment round. Please keep an eye on your inbox (and spam folder).</p>
                            <br/>
                            <p>Best Regards,<br/>RecruitAI Talent Team</p>
                        </div>
                    `
                });
            } else if (newStatus === 'REJECTED') {
                await sendEmail({
                    to: application.email,
                    subject: `Update on your application - RecruitAI`,
                    html: `
                        <div style="font-family: Arial, sans-serif; color: #333;">
                            <p>Dear ${application.full_name},</p>
                            <p>Thank you for giving us the opportunity to review your application for the <strong>${application.role_applied}</strong> position.</p>
                            <p>After careful consideration, we have decided to move forward with other candidates who more closely match our current requirements.</p>
                            <p>We wish you all the best in your job search.</p>
                            <br/>
                            <p>Best Regards,<br/>RecruitAI Talent Team</p>
                        </div>
                    `
                });
            }
        } catch (emailError) {
            console.error("Failed to send status update email:", emailError);
            // Don't fail the request, just log error
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, message: e.message }, { status: 500 });
    }
}
