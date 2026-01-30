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

    // --- REAL EVALUATION LOGIC (Piston Engine) ---
    const { executeCode } = await import('@/lib/piston');

    let passed = true;
    let passedCount = 0;
    const totalTestCases = data.testCases?.length || 0;

    // Detailed logs for the user (we will show the output of the FAILED case or the last case)
    let outputLog = "";

    if (totalTestCases === 0) {
        // No test cases? Just run it once to check for syntax errors.
        const result = await executeCode(data.language, data.code, "");
        if (result.run.code !== 0) {
            passed = false;
            outputLog = result.run.output; // Show error
        } else {
            outputLog = "Code executed successfully (No test cases defined). Output:\n" + result.run.stdout;
        }
    } else {
        // Run against each test case
        for (let i = 0; i < totalTestCases; i++) {
            const tc = data.testCases![i];
            const result = await executeCode(data.language, data.code, tc.input);

            // Check Compilation/Runtime Errors
            if (result.run.code !== 0) {
                passed = false;
                outputLog = `Runtime Error on Test Case ${i + 1}:\n${result.run.output}`;
                break; // Stop on first error ? Or continue? Usually stop.
            }

            // Normalize Output (Trim whitespace)
            const actual = result.run.stdout.trim();
            const expected = tc.output.trim();

            if (actual === expected) {
                passedCount++;
                // Keep the log of the last passed case if we haven't failed yet
                if (passed) {
                    outputLog = `Test Case ${i + 1} Passed.\nInput: ${tc.input}\nOutput: ${actual}`;
                }
            } else {
                passed = false;
                outputLog = `Failed Test Case ${i + 1}.\nInput: ${tc.input}\nExpected: ${expected}\nActual: ${actual}`;
                break; // Stop on first failure
            }
        }
    }

    if (passed && totalTestCases > 0) {
        outputLog = "All Test Cases Passed! 🚀";
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
        output_log: outputLog,
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
        output: outputLog,
        passed: passed,
        testCasesPassed: passedCount,
        totalTestCases: totalTestCases
    };
}
