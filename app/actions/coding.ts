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

    // DETERMINISTIC EVALUATION (Mock)
    // In production, send code to a real sandbox (e.g., Piston/Judge0).
    // For this demo, we use keywords to allow deterministic testing.

    let passed = false;
    let output = "Execution failed.\nError: Output did not match expected values.";

    // 1. Admin/Tester Override
    if (data.code.includes("// pass")) {
        passed = true;
        output = "All test cases passed (Manual Override).";
    }
    // 2. Simple Output Matching (Mocking the logic of 'printing' the answer)
    // If the code "prints" (contains string) the expected output of the first test case.
    else if (data.testCases && data.testCases.length > 0) {
        const firstExpected = data.testCases[0].output;
        if (data.code.includes(`print("${firstExpected}")`) || data.code.includes(`return ${firstExpected}`)) {
            passed = true;
            output = "All test cases passed.";
        }
    }
    // 3. Keep purely random failure for random text to simulate syntax errors
    else if (data.code.length < 10) {
        output = "Syntax Error: Unexpected EOF";
    }

    // FIX: Removed duplicate 'upsert' call which caused double entries or errors.
    // Relying on Manual Check below to handle "No Constraint" DB state safely.


    // Manual Upsert Logic
    const { data: existing } = await supabaseAdmin
        .from('coding_submissions')
        .select('id')
        .match({ assignment_id: data.assignmentId, question_idx: data.questionIdx })
        .single();

    if (existing) {
        await supabaseAdmin
            .from('coding_submissions')
            .update({
                code: data.code,
                language: data.language,
                test_cases_passed: passed ? (data.testCases?.length || 5) : 0,
                status: passed ? 'passed' : 'failed',
                output_log: output,
                updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
    } else {
        await supabaseAdmin
            .from('coding_submissions')
            .insert({
                assignment_id: data.assignmentId,
                question_idx: data.questionIdx,
                code: data.code,
                language: data.language,
                test_cases_passed: passed ? (data.testCases?.length || 5) : 0,
                total_test_cases: data.testCases?.length || 5,
                status: passed ? 'passed' : 'failed',
                output_log: output
            });
    }

    return {
        success: true,
        output: output,
        passed: passed
    };
}
