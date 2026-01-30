import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ROLES } from "@/lib/roles";
import ReuploadResume from "@/components/ReuploadResume";
import WithdrawButton from "./WithdrawButton";
import ScheduledTimeDisplay from "@/components/ScheduledTimeDisplay";

export const dynamic = 'force-dynamic';

export default async function CandidateDashboard() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/auth/login");
    }

    // @ts-ignore
    if (session.user.role !== ROLES.CANDIDATE) {
        redirect("/");
    }

    // Fetch Latest Application (Match by ID OR Email)
    const { data: application, error } = await supabaseAdmin
        .from('applications')
        .select('*')
        .or(`user_id.eq.${session.user.id},email.eq.${session.user.email}`)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    // Generate Public URL for display (Bucket is Public)
    if (application && application.resume_url && !application.resume_url.startsWith('http')) {
        const { data } = supabaseAdmin
            .storage
            .from('resumes')
            .getPublicUrl(application.resume_url);

        if (data?.publicUrl) {
            application.resume_url = data.publicUrl;
        }
    }

    if (!application) {
        // Show "Empty State" with Apply Button
        return (
            <div className="max-w-4xl mx-auto p-8">
                <h1 className="text-3xl font-bold mb-6">My Application</h1>
                <div className="bg-white p-8 rounded shadow text-center">
                    <p className="text-gray-700 mb-6">You have not submitted an application yet.</p>
                    <Link href="/apply" className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700">
                        Apply Now
                    </Link>
                </div>
            </div>
        )
    }

    // Check for Exam Assignment directly (Source of Truth)
    const { data: assignment } = await supabaseAdmin
        .from('exam_assignments')
        .select('*')
        .eq('candidate_id', session.user.id)
        .in('status', ['assigned', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .limit(1)
        .maybeSingle();

    // Fetch Scheduled Interview
    const { data: interview } = await supabaseAdmin
        .from('interviews')
        .select('*')
        .eq('candidate_id', session.user.id)
        .in('status', ['scheduled', 'in_progress']) // Only active interviews
        .maybeSingle();

    console.log("Dashboard Debug:", {
        userId: session.user.id,
        interviewFound: !!interview,
        interviewId: interview?.id,
        appStatus: application.status
    });

    // Auto-fix status if interview exists but status is wrong
    // preventing revert if already progressed
    const protectedStatuses = ['HIRED', 'REJECTED', 'INTERVIEW_COMPLETED', 'WITHDRAWN'];
    if (interview && application.status !== 'INTERVIEW_SCHEDULED' && !protectedStatuses.includes(application.status)) {
        console.log(`Auto-correcting application status from ${application.status} to INTERVIEW_SCHEDULED`);
        await supabaseAdmin
            .from('applications')
            .update({ status: 'INTERVIEW_SCHEDULED' })
            .eq('id', application.id);
        // Mutate local object to reflect change immediately
        application.status = 'INTERVIEW_SCHEDULED';
    }

    const hasActiveExam = !!assignment;

    // Normalizing status for case-insensitive checks
    const currentStatus = application.status.toUpperCase();

    // Fix: Only show exam link if an actual assignment exists AND status is valid for exam
    // relying on 'EXAM_ASSIGNED' status is unreliable if assignment failed or was cancelled.
    const terminalStatusesForExam = ['WITHDRAWN', 'REJECTED', 'DELETED', 'HIRED', 'INTERVIEW', 'INTERVIEW_SCHEDULED', 'EXAM_FAILED', 'EXAM_PASSED'];
    const showExamLink = hasActiveExam && !terminalStatusesForExam.includes(currentStatus);
    const showInterviewLink = currentStatus === 'INTERVIEW' || currentStatus === 'HIRED';

    // Status Colors
    const statusColors: any = {
        'APPLIED': 'bg-blue-100 text-blue-800',
        'REJECTED': 'bg-red-100 text-red-800',
        'SHORTLISTED': 'bg-green-100 text-green-800',
        'EXAM_ASSIGNED': 'bg-yellow-100 text-yellow-800',
        'INTERVIEW_SCHEDULED': 'bg-indigo-100 text-indigo-800',
        'EXAM_PASSED': 'bg-purple-100 text-purple-800',
        'EXAM_FAILED': 'bg-red-100 text-red-800',
        'INTERVIEW': 'bg-indigo-100 text-indigo-800',
        'HIRED': 'bg-pink-100 text-pink-800',
        'WITHDRAWN': 'bg-gray-100 text-gray-600',
        'DELETED': 'bg-gray-200 text-gray-500' // Just in case
    };

    return (
        <div className="max-w-4xl mx-auto p-8">
            <h1 className="text-3xl font-bold mb-6">My Application</h1>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b">
                    <h2 className="text-xl font-semibold">Application Details</h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-600">Full Name</label>
                        <p className="mt-1 text-lg font-medium">{application.full_name}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600">Email</label>
                        <p className="mt-1 text-lg font-medium">{application.email}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600">Phone</label>
                        <p className="mt-1 text-lg font-medium">{application.phone}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600">Resume</label>
                        <a href={application.resume_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center text-blue-600 hover:text-blue-500">
                            Download Resume
                        </a>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600">Status</label>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-1 ${statusColors[currentStatus] || 'bg-gray-100 text-gray-800'}`}>
                            {application.status}
                        </span>
                        {application.ats_score > 0 && (
                            <p className="mt-2 text-sm text-gray-600">ATS Score: <span className="font-bold">{application.ats_score}%</span></p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600">Applied On</label>
                        <p className="mt-1 text-lg text-gray-800">
                            {new Date(application.created_at).toLocaleDateString()}
                        </p>
                    </div>

                    {/* Action Area */}
                    <div className="col-span-1 md:col-span-2 mt-4 border-t pt-6">
                        <label className="block text-sm font-medium text-gray-600 mb-2">Next Steps</label>

                        {/* Robust check for Parse Failed status */}
                        {['PARSE_FAILED', 'parse_failed', 'Parse Failed'].includes(currentStatus) || currentStatus.includes('PARSE_FAILED') ? (
                            <ReuploadResume />
                        ) : interview ? (
                            <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-200">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold text-indigo-900 mb-2">🎥 Interview Scheduled</h3>
                                        <p className="text-indigo-700 mb-4">
                                            Your AI interview has been scheduled. Please be ready with a working camera and microphone.
                                        </p>
                                        <div className="space-y-2 mb-6 text-sm text-indigo-800">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">Date:</span>
                                                {new Date(interview.scheduled_at).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">Time:</span>
                                                {new Date(interview.scheduled_at).toLocaleTimeString()}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">Duration:</span>
                                                {interview.duration_minutes} Minutes
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">Mode:</span>
                                                {interview.mode === 'AI' ? 'AI Interviewer' : 'Manual'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <Link
                                            href={`/candidate/interview/${interview.id}`}
                                            className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition shadow-md"
                                        >
                                            Enter Waiting Room
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ) : currentStatus === 'HIRED' ? (
                            <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-8 rounded-xl border border-pink-100 text-center shadow-sm animate-fade-in-up">
                                <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md mb-4 text-3xl">
                                    🎉
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">Congratulations! You're Hired!</h3>
                                <p className="text-gray-600 mb-6 max-w-lg mx-auto">
                                    We are thrilled to welcome you to the team. You have successfully passed all rounds of the interview process.
                                </p>
                                <div className="bg-white p-4 rounded-lg inline-block border border-gray-100 shadow-sm text-left">
                                    <h4 className="font-semibold text-gray-800 mb-2 border-b pb-2">Next Steps</h4>
                                    <ul className="text-sm text-gray-600 space-y-2">
                                        <li className="flex items-center gap-2">✅ Offer Letter sent to your email</li>
                                        <li className="flex items-center gap-2">🕒 HR Onboarding call to be scheduled</li>
                                        <li className="flex items-center gap-2">📄 Document verification initiation</li>
                                    </ul>
                                </div>
                            </div>
                        ) : showExamLink ? (
                            <div className="bg-green-50 p-4 rounded-md border border-green-200">
                                <h3 className="text-green-800 font-semibold mb-1">⚡ Skill Assessment Ready</h3>
                                <p className="text-green-700 text-sm mb-3">Your technical exam has been assigned. You have a limited time to complete it once started.</p>

                                {assignment.scheduled_start_time && (
                                    <div className="mb-3 bg-white/60 p-2 rounded border border-green-100 flex items-center gap-2">
                                        <span className="text-xl">📅</span>
                                        <div>
                                            <p className="text-green-900 text-xs font-bold uppercase tracking-wider">Scheduled Time</p>
                                            <p className="text-green-800 font-medium text-sm">
                                                <ScheduledTimeDisplay timestamp={assignment.scheduled_start_time} />
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <Link href="/candidate/exam" className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition font-medium">
                                    Take Exam Now
                                </Link>
                            </div>
                        ) : currentStatus === 'SHORTLISTED' ? (
                            <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                                <h3 className="text-blue-800 font-semibold mb-1">🎉 Shortlisted!</h3>
                                <p className="text-blue-700 text-sm mb-3">You have been shortlisted. Please wait for the administrator to assign your technical assessment.</p>
                            </div>
                        ) : currentStatus === 'EXAM_PASSED' ? (
                            <div className="bg-purple-50 p-4 rounded-md border border-purple-200">
                                <h3 className="text-purple-800 font-semibold mb-1">🌟 Exam Passed!</h3>
                                <p className="text-purple-700 text-sm">Great job! You passed the technical assessment. We will contact you shortly for the interview phase.</p>
                            </div>
                        ) : currentStatus === 'EXAM_FAILED' ? (
                            <div className="bg-red-50 p-4 rounded-md border border-red-200">
                                <h3 className="text-red-800 font-semibold mb-1">Assessment Not Cleared</h3>
                                <p className="text-red-700 text-sm">Unfortunately, you did not meet the passing criteria for this assessment.</p>
                                <div className="mt-3">
                                    <Link href="/apply" className="text-blue-600 hover:underline text-sm custom-reapply-link">
                                        Submit New Application
                                    </Link>
                                </div>
                            </div>
                        ) : currentStatus === 'DISQUALIFIED' || currentStatus === 'REJECTED' ? (
                            <div className="bg-red-50 p-4 rounded-md border border-red-200">
                                <h3 className="text-red-800 font-semibold mb-1">Status Update</h3>
                                <p className="text-red-700 text-sm">Thank you for your interest. Unfortunately, your profile does not meet our current requirements for this role.</p>
                                <div className="mt-3">
                                    <Link href="/apply" className="text-blue-600 hover:underline text-sm custom-reapply-link">
                                        Submit New Application
                                    </Link>
                                </div>
                            </div>
                        ) : (currentStatus === 'WITHDRAWN_BY_CANDIDATE' || currentStatus === 'WITHDRAWN') ? (
                            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                                <h3 className="text-gray-800 font-semibold mb-1">Application Withdrawn</h3>
                                <p className="text-gray-700 text-sm">You have withdrawn this application. You can re-apply if you wish.</p>
                                <div className="mt-3">
                                    <Link href="/apply" className="text-blue-600 hover:underline text-sm custom-reapply-link">
                                        Submit New Application
                                    </Link>
                                </div>
                            </div>
                        ) : currentStatus === 'WITHDRAWN_BY_ADMIN' || currentStatus === 'DELETED' ? (
                            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                                <h3 className="text-gray-800 font-semibold mb-1">Application Ended</h3>
                                <p className="text-gray-700 text-sm">This application has been closed by the administrator.</p>
                                <div className="mt-3">
                                    <Link href="/apply" className="text-blue-600 hover:underline text-sm custom-reapply-link">
                                        Submit New Application
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                                <h3 className="text-blue-800 font-semibold mb-1">Application Under Review</h3>
                                <p className="text-blue-700 text-sm">Our team (and AI) is currently reviewing your application. You will be notified once a decision is made.</p>
                            </div>
                        )}

                        {/* Withdraw Section */}
                        {['APPLIED', 'SHORTLISTED', 'EXAM_ASSIGNED', 'EXAM_FAILED', 'PARSE_FAILED'].includes(currentStatus) && (
                            <div className="mt-6 flex justify-end border-t pt-4">
                                <WithdrawButton applicationId={application.id} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
