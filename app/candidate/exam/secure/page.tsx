import { NextRequest, NextResponse } from "next/server";
import { verifyExamToken, isSebBrowser } from "@/lib/seb";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { redirect } from "next/navigation";

/**
 * RecruitAI Secure Exam Access Gate
 * GET /candidate/exam/secure?token=JWT_TOKEN
 * 
 * Verifies if candidate is authorized to access the assessment.
 * Enforces Safe Exam Browser (SEB) lock.
 */
export default async function SecureExamGatePage({ searchParams }: { searchParams: { token?: string } }) {
    const token = searchParams.token;
    
    // 1. Token Validation
    if (!token) {
        return <AccessDenied message="Access token is missing. Please use your .seb file." />;
    }

    const payload = verifyExamToken(token);
    if (!payload) {
        return <AccessDenied message="Invalid or expired exam token. Please request a new invite." />;
    }

    const { assignmentId, candidateId } = payload;

    // 2. Browser Check (MANDATORY)
    // We check headers in server-side since this is a server component
    const { headers } = await import("next/headers");
    const userAgent = (await headers()).get("user-agent") || "";
    
    if (!isSebBrowser(userAgent)) {
        return (
            <div className="min-h-screen bg-red-50 flex items-center justify-center p-6">
                <div className="bg-white p-10 rounded-2xl shadow-2xl border-4 border-red-500 max-w-2xl text-center">
                    <h1 className="text-4xl font-extrabold text-red-600 mb-6 uppercase tracking-tighter">🔒 Security Lockdown Active</h1>
                    <p className="text-xl text-gray-800 mb-8 font-medium">
                        This assessment is protected by <strong>Safe Exam Browser (SEB)</strong>.
                    </p>
                    <div className="bg-red-50 p-6 rounded-lg text-left mb-8 space-y-4 border border-red-200">
                        <li className="text-red-900 font-bold">Standard browsers (Chrome, Edge, Safari) are prohibited.</li>
                        <li className="text-gray-700 underline">You must open the .seb file provided via email to enter.</li>
                    </div>
                    <div className="flex flex-col gap-4">
                        <a href="https://safeexambrowser.org/download_en.html" target="_blank" className="bg-blue-600 text-white py-3 px-6 rounded-lg font-bold hover:bg-blue-700 transition">
                            Download Safe Exam Browser
                        </a>
                        <p className="text-xs text-gray-400">If you have SEB installed, please ensure you open the original configuration file.</p>
                    </div>
                </div>
            </div>
        );
    }

    // 3. Status & Double-Start Check
    const { data: assignment, error } = await supabaseAdmin
        .from('exam_assignments')
        .select(`
            id,
            status,
            exams ( title )
        `)
        .eq('id', assignmentId)
        .single();

    if (error || !assignment) {
        return <AccessDenied message="Assignment could not be verified. Contact support." />;
    }

    // Already completed? Block access.
    if (['completed', 'submitted', 'EXAM_SUBMITTED'].includes(assignment.status)) {
        return <AccessDenied message="This assessment has already been submitted." />;
    }

    // If everything is fine, redirect to the main exam interface with the token persistency
    // We append the token to the main exam route so if SEB refreshes, it stays secure.
    // However, the main route uses NextAuth session. 
    // We should probably redirect to the dedicated exam entry point.
    
    // Redirect to the actual exam experience
    // Since they are INSIDE SEB, they might need to log in again if session isn't shared.
    // But since SEB is a fresh environment, we should consider a "Token-based login" for SEB.
    
    redirect(`/candidate/exam?id=${assignmentId}&secure_entry=true`);
}

function AccessDenied({ message }: { message: string }) {
    return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow border border-red-100 text-center max-w-lg">
                <h2 className="text-2xl font-bold text-red-600 mb-4">Access Restricted</h2>
                <p className="text-gray-600 mb-6 font-medium">{message}</p>
                <div className="h-1 w-full bg-red-100 rounded-full mb-6"></div>
                <p className="text-xs text-gray-400">RecruitAI Security Subsystem • Error Code: SEB_TOKEN_V1</p>
            </div>
        </div>
    );
}
