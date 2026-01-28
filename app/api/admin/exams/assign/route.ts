import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // @ts-ignore
        if (!session || session.user?.role !== 'ADMIN') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { exam_id, candidate_id, scheduled_start_time, proctoring_config } = body;

        if (!exam_id || !candidate_id) {
            return NextResponse.json({ error: "Missing exam_id or candidate_id" }, { status: 400 });
        }

        // 1. Verify Candidate exists and get email
        // We might need to query 'profiles' or 'auth.users' via admin.
        // Assuming candidate_id is the user_id (uuid).

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

        // 1.5 Verify Exam Status
        const { data: examData, error: examFetchError } = await supabaseAdmin
            .from('exams')
            .select('status, questions:exam_questions(count)')
            .eq('id', exam_id)
            .single();

        if (examFetchError || !examData) {
            return NextResponse.json({ error: "Exam not found." }, { status: 404 });
        }

        if (examData.status !== 'READY' && examData.status !== 'READY_FALLBACK') {
            return NextResponse.json({
                error: `Cannot assign exam. Status is ${examData.status}. Please wait for AI generation.`
            }, { status: 400 });
        }

        // @ts-ignore
        if (examData.questions && examData.questions[0] && examData.questions[0].count === 0) {
            return NextResponse.json({ error: "Exam has no questions. Please Retry Generation." }, { status: 400 });
        }

        // 2. Insert Assignment
        const { error: assignError } = await supabaseAdmin
            .from('exam_assignments')
            .insert({
                exam_id,
                candidate_id,
                status: 'assigned',
                scheduled_start_time: scheduled_start_time || null,
                proctoring_config: proctoring_config || { camera: false, mic: false, tab_switch: true, copy_paste: true }
            });

        if (assignError) {
            console.error("Assignment Insert Error:", assignError);
            return NextResponse.json({ error: assignError.message }, { status: 500 });
        }

        // 3. Update Application Status
        // We need to find the application record for this candidate.
        // Option A: Update by user_id if column exists.
        // Option B: Get email from profile and update by email.

        // Let's try user_id in applications first (it was added recently in schematic thoughts, but check schema).
        // If 'applications' table has 'user_id', use it. Else fetch email.

        // Checking schema via assumption (since I can't read sql right now easily without view_file):
        // Previously used 'email' for updating status in `app/actions/exams.ts`.
        // Let's safe-guard: Get user email from `auth.admin` or `profiles`.

        const { data: userProfile } = await supabaseAdmin
            .from('profiles')
            .select('email')
            .eq('id', candidate_id)
            .single();

        if (userProfile?.email) {
            await supabaseAdmin
                .from('applications')
                .update({ status: 'EXAM_ASSIGNED' })
                .eq('email', userProfile.email);
        } else {
            // Fallback if no profile, try getting user from Auth api
            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(candidate_id);
            if (authUser?.user?.email) {
                await supabaseAdmin
                    .from('applications')
                    .update({ status: 'EXAM_ASSIGNED' })
                    .eq('email', authUser.user.email);
            }
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Assign Exam API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
