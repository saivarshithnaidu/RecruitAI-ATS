import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ROLES } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import VerifyButton from "../../../components/VerifyButton";
import DeleteApplicationButton from "./DeleteButton";
import AtsActions from "@/components/AtsActions";
import { headers } from "next/headers";

export const dynamic = 'force-dynamic';

export default async function AdminApplicationsPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/auth/login");
    }

    // @ts-ignore
    if (session.user?.role !== ROLES.ADMIN) {
        redirect("/my-application");
    }

    // Fetch applications
    const { data: candidates, error: appsError } = await supabaseAdmin
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });

    // Stats for Admin Focus
    const stats = {
        total: candidates?.length || 0,
        pendingReview: candidates?.filter(c => c.status === 'NEEDS_REVIEW').length || 0,
        flaggedExams: candidates?.filter(c => c.ats_summary?.includes('FLAGGED')).length || 0,
        examPassed: candidates?.filter(c => c.status === 'INTERVIEW').length || 0
    };

    // Fetch Profiles...

    // Fetch Verification Profiles
    // We need to fetch from our new API or directly from DB here since we are server-side
    // Let's go direct to DB for efficiency since this is a server component
    const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('candidate_profiles')
        .select('*');

    // Create a map for easy lookup
    const profileMap = new Map();
    if (profiles) {
        profiles.forEach(p => {
            // Mapping by user_id or email. candidates table usually has user_id
            // If candidates table has user_id, that's best. Usually it does.
            // Let's assume candidates table has user_id based on typical detailed views, 
            // or we match by email if user_id is missing. 
            // Looking at previous file content, candidates has email.
            if (p.user_id) profileMap.set(p.user_id, p);
            if (p.email) profileMap.set(p.email, p); // Fallback
        });
    }

    if (appsError) {
        console.error("Error fetching applications:", appsError);
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-800">Hiring Pipeline Automation</h1>
                <div className="flex gap-2">
                    <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg border border-amber-200">
                        {stats.pendingReview} Borderline for Review
                    </span>
                    <span className="px-3 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-lg border border-red-200">
                        {stats.flaggedExams} Flagged Assessments
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total', val: stats.total, color: 'bg-blue-600' },
                    { label: 'Pending Review', val: stats.pendingReview, color: 'bg-amber-500' },
                    { label: 'Flagged (Auto)', val: stats.flaggedExams, color: 'bg-red-600' },
                    { label: 'Shortlisted (Exam Passed)', val: stats.examPassed, color: 'bg-green-600' },
                ].map((s, i) => (
                    <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500 mb-1">{s.label}</p>
                        <p className={`text-2xl font-bold ${s.color.replace('bg-', 'text-')}`}>{s.val}</p>
                        <div className={`mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden`}>
                            <div className={`h-full ${s.color}`} style={{ width: `${(s.val / (stats.total || 1)) * 100}%` }}></div>
                        </div>
                    </div>
                ))}
            </div>

            {!candidates || candidates.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-500">No applications received yet.</p>
                </div>
            ) : (
                <div className="bg-white shadow overflow-x-auto sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate & Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ATS Score & Logs</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Actions</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {candidates.map((candidate) => {
                                // Try to find profile by user_id if available, else email
                                const profile = candidate.user_id ? profileMap.get(candidate.user_id) : profileMap.get(candidate.email);
                                const isWithdrawn = ['WITHDRAWN', 'WITHDRAWN_BY_CANDIDATE', 'WITHDRAWN_BY_ADMIN', 'DELETED'].includes(candidate.status);

                                return (
                                <tr key={candidate.id} className={`hover:bg-gray-50 ${candidate.status === 'NEEDS_REVIEW' ? 'bg-amber-50/30' : ''}`}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col gap-1">
                                            <div className="text-sm font-medium text-gray-900">{candidate.full_name}</div>
                                            <div className="flex gap-2 items-center">
                                                <span className={`px-2 py-0.5 inline-flex text-[10px] leading-4 font-bold rounded-full ${isWithdrawn ? 'bg-gray-100 text-gray-800' :
                                                    candidate.status === 'SHORTLISTED' ? 'bg-green-100 text-green-800' :
                                                        candidate.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                            candidate.status === 'NEEDS_REVIEW' ? 'bg-amber-100 text-amber-800' :
                                                                'bg-blue-100 text-blue-800'
                                                    }`}>
                                                    {candidate.status || 'Applied'}
                                                </span>
                                                <a href={candidate.resume_path} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline">
                                                    PDF
                                                </a>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{candidate.email}</div>
                                        <div className="text-[10px] text-gray-500">{candidate.phone}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col gap-1">
                                            {candidate.status !== 'parse_failed' ? (
                                                <AtsActions application={candidate} />
                                            ) : (
                                                <span className="text-xs text-red-500 font-bold">PARSE FAILED</span>
                                            )}
                                            {candidate.ats_summary?.includes('FLAGGED') && (
                                                <span className="text-[10px] text-red-600 font-bold bg-red-50 px-1 rounded border border-red-100">
                                                    ⚠️ PROCTORING FLAG
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-4">
                                            <VerifyLogic profile={profile} candidate={candidate} />
                                            {!isWithdrawn && (
                                                <DeleteApplicationButton applicationId={candidate.id} />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(candidate.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function VerifyLogic({ profile, candidate }: { profile: any, candidate: any }) {
    if (!profile) return <span className="text-xs text-gray-400">Profile missing</span>;

    const { email_verified, verification_status } = profile;

    // Green Badge
    if (verification_status === 'verified') {
        return (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 border border-green-200">
                ADMIN VERIFIED ✅
            </span>
        );
    }

    // Red Badge
    if (verification_status === 'rejected') {
        return (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 border border-red-200">
                REJECTED ❌
            </span>
        );
    }

    // Buttons if verified
    if (email_verified && verification_status === 'pending') {
        return <VerifyButton userId={profile.user_id} />;
    }

    // Still pending user actions
    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs text-amber-600">Pending User Verification</span>
            <div className="flex gap-1 text-[10px] text-gray-400">
                <span className={email_verified ? "text-green-600" : ""}>{email_verified ? "Email ✓" : "Email ⏳"}</span>
            </div>
        </div>
    );
}
