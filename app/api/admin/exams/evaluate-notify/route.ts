import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendEmail } from '@/lib/email';
import { EmailTemplates } from '@/lib/email-templates';

export async function POST(req: Request) {
    try {
        const { assignmentId, status, score } = await req.json();

        // 1. Fetch Assignment & Candidate details
        const { data: assignment, error } = await supabaseAdmin
            .from('exam_assignments')
            .select(`
                *,
                candidate_profiles (
                    full_name,
                    email
                ),
                exams (
                    title
                )
            `)
            .eq('id', assignmentId)
            .single();

        if (error || !assignment) {
            return NextResponse.json({ success: false, message: "Assignment not found" });
        }

        const email = assignment.candidate_profiles?.email;
        const name = assignment.candidate_profiles?.full_name?.split(' ')[0] || "Candidate";
        const examTitle = assignment.exams?.title || "Assessment";

        if (!email) {
            return NextResponse.json({ success: false, message: "No email found for candidate" });
        }

        let template;
        if (status === 'EXAM_PASSED') {
            template = EmailTemplates.examPassed(name, examTitle);
        } else {
            template = EmailTemplates.examFailed(name, examTitle);
        }

        // Send Email
        await sendEmail({
            to: email,
            subject: template.subject,
            html: template.html
        });

        return NextResponse.json({ success: true });

    } catch (e: any) {
        console.error("Notify Error:", e);
        return NextResponse.json({ success: false, message: e.message }, { status: 500 });
    }
}
