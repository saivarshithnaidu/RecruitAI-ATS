import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateExamToken, generateSebConfig } from "@/lib/seb";

/**
 * RecruitAI SEB Config Generator
 * GET /api/exams/seb/download?id=ASSIGNMENT_ID
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const assignmentId = searchParams.get("id");

        if (!assignmentId) {
            return NextResponse.json({ error: "Missing assignment ID" }, { status: 400 });
        }

        // 1. Fetch assignment details
        const { data: assignment, error } = await supabaseAdmin
            .from('exam_assignments')
            .select(`
                id,
                candidate_id,
                status,
                exams ( title )
            `)
            .eq('id', assignmentId)
            .single();

        if (error || !assignment) {
            return NextResponse.json({ error: "Exam assignment not found" }, { status: 404 });
        }

        // 2. Validate Status (Prevent downloading completed/stale exams)
        if (['completed', 'EXAM_SUBMITTED', 'passed', 'failed'].includes(assignment.status)) {
            return NextResponse.json({ error: "This assessment has already been completed." }, { status: 403 });
        }

        // 3. Generate Secure Token (24h expiry)
        const token = generateExamToken(assignmentId, assignment.candidate_id);

        // 4. Build StartURL for SEB
        // This is the URL SEB will open automatically
        const startUrl = `https://recruitaitech.in/candidate/exam/secure?token=${token}`;

        // 5. Generate SEB Config XML
        const xml = generateSebConfig(startUrl);

        // 6. Return as Downloadable File
        // We set the filename to something descriptive for the candidate
        // @ts-ignore
        const safeTitle = (assignment.exams?.title || "Assessment").replace(/[^a-zA-Z0-9]/g, "_");
        const filename = `${safeTitle}_RecruitAI.seb`;

        return new NextResponse(xml, {
            headers: {
                "Content-Type": "application/seb",
                "Content-Disposition": `attachment; filename="${filename}"`
            }
        });

    } catch (e: any) {
        console.error("SEB Download Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
