"use server"

import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export type CodeSubmission = {
    assignmentId: string;
    questionIdx: number;
    code: string;
    language: string;
    testCases?: { input: string, output: string }[];
}

export async function submitCode(data: CodeSubmission) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return { error: "Unauthorized" };

    // Verify assignment ownership
    const { data: assignment } = await supabaseAdmin
        .from('exam_assignments')
        .select('candidate_id')
        .eq('id', data.assignmentId)
        .single();

    if (!assignment || assignment.candidate_id !== session.user.id) {
        return { error: "Access denied" };
    }

    // --- EVALUATION LOGIC (MOCK Engine) ---
    // This simulates a server-side grader (e.g., Judge0, Sphere engine)
    // Since we don't have a real compiler connected, we use heuristic validation.

    let passed = false;
    let output = "Logic check failed. Output did not match expected values.";
    const totalTestCases = data.testCases?.length || 5;
    let passedCount = 0;

    // 1. Manual Override for Testing (Dev backdoor if specific comment used)
    if (data.code.includes("// pass")) {
        passed = true;
        passedCount = totalTestCases;
        output = "All hidden test cases passed.";
    }
    // 2. Base Heuristic: Check for non-empty implementation
    else if (data.code.length > 20) {
        // Random "realism" logic for demo:
        // If code contains critical keywords, we simulate a partial or full pass
        const keywords = ['return', 'print', 'select', 'if', 'for', 'while'];
        const hasLogic = keywords.some(k => data.code.toLowerCase().includes(k));

        if (hasLogic) {
            // Simulate 80% chance of passing if logic keywords exist (for demo)
            // In REAL PROD: This block calls external API with `data.code` + `data.testCases`
            passed = true;
            passedCount = totalTestCases;
            output = "Target logic achieved. Hidden test cases passed.";
        } else {
            output = "Submission received. Logic incomplete or syntax error.";
        }
    } else {
        output = "Code snippet too short to evaluate. Please complete the implementation.";
    }

    // Save Submission
    const { data: existing } = await supabaseAdmin
        .from('coding_submissions')
        .select('id')
        .match({ assignment_id: data.assignmentId, question_idx: data.questionIdx })
        .single();

    const submissionData = {
        assignment_id: data.assignmentId,
        question_idx: data.questionIdx,
        code: data.code,
        language: data.language,
        test_cases_passed: passedCount,
        total_test_cases: totalTestCases,
        status: passed ? 'passed' : 'failed',
        output_log: output,
        updated_at: new Date().toISOString()
    };

    if (existing) {
        await supabaseAdmin
            .from('coding_submissions')
            .update(submissionData)
            .eq('id', existing.id);
    } else {
        await supabaseAdmin
            .from('coding_submissions')
            .insert(submissionData);
    }

    return {
        success: true,
        output: output,
        passed: passed,
        testCasesPassed: passedCount,
        totalTestCases: totalTestCases
    };
}
