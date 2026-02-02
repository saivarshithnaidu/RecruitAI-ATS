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
            const { EmailTemplates } = await import("@/lib/email-templates");
            const firstName = application.full_name.split(' ')[0];
            const role = application.role_applied || "Position";

            if (newStatus === 'SHORTLISTED') {
                const template = EmailTemplates.applicationShortlisted(firstName, role);
                await sendEmail({
                    to: application.email,
                    subject: template.subject,
                    html: template.html
                });
            } else if (newStatus === 'REJECTED') {
                const template = EmailTemplates.applicationRejected(firstName, role);
                await sendEmail({
                    to: application.email,
                    subject: template.subject,
                    html: template.html
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
