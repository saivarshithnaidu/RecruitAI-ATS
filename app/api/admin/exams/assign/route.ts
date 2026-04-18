import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateExamToken } from "@/lib/seb";
import { sendExamAssignmentEmail } from "@/lib/mail";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // @ts-ignore
        if (!session || session.user?.role !== 'ADMIN') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { exam_id, candidate_id, scheduled_start_time, proctoring_config, expires_in_hrs } = body;

        if (!exam_id || !candidate_id) {
            return NextResponse.json({ error: "Missing exam_id or candidate_id" }, { status: 400 });
        }

        // 1. Verify Candidate exists and get email
        const { data: userProfile } = await supabaseAdmin
            .from('profiles')
            .select('email, full_name')
            .eq('id', candidate_id)
            .single();

        if (!userProfile) {
            return NextResponse.json({ error: "Candidate profile not found." }, { status: 404 });
        }

        // Check if already assigned
        const { data: existing } = await supabaseAdmin
            .from('exam_assignments')
            .select('id')
            .eq('exam_id', exam_id)
            .eq('candidate_id', candidate_id)
            .single();

        if (existing) {
            return NextResponse.json({ error: "Candidate already assigned to this exam." }, { status: 400 });
        }

        // 1.5 Verify Exam Details
        const { data: examData, error: examFetchError } = await supabaseAdmin
            .from('exams')
            .select('id, name, skill, status')
            .eq('id', exam_id)
            .single();

        if (examFetchError || !examData) {
            return NextResponse.json({ error: "Exam not found." }, { status: 404 });
        }

        // 2. Insert Assignment
        const { data: assignment, error: assignError } = await supabaseAdmin
            .from('exam_assignments')
            .insert({
                exam_id,
                candidate_id,
                status: 'assigned',
                scheduled_start_time: scheduled_start_time || null,
                proctoring_config: proctoring_config || { camera: true, mic: true, tab_switch: true, copy_paste: false }
            })
            .select()
            .single();

        if (assignError || !assignment) {
            console.error("Assignment Insert Error:", assignError);
            return NextResponse.json({ error: assignError?.message || "Failed to create assignment" }, { status: 500 });
        }

        // 3. Generate SEB Secure Token
        const expirySeconds = (expires_in_hrs || 24) * 3600;
        const token = generateExamToken(assignment.id, candidate_id, expirySeconds);
        const expiryDate = new Date(Date.now() + expirySeconds * 1000).toLocaleString();

        // 4. Send SEB Email
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://recruitaitech.in";
        const sebConfigLink = `${baseUrl}/api/seb/config?token=${token}`;
        
        await sendExamAssignmentEmail(
            userProfile.email,
            userProfile.full_name || 'Candidate',
            examData.name || `${examData.skill} Assessment`,
            sebConfigLink,
            expiryDate
        );

        // 5. Update Application Status
        await supabaseAdmin
            .from('applications')
            .update({ status: 'EXAM_ASSIGNED' })
            .eq('email', userProfile.email);

        return NextResponse.json({ 
            success: true, 
            message: "Exam assigned and SEB instructions sent.",
            assignment_id: assignment.id 
        });

    } catch (error: any) {
        console.error("Assign Exam API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
