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

    console.log("Admin Page Candidates Count:", candidates?.length);
    if (candidates) {
        console.log("Candidate IDs:", candidates.map(c => c.id));
    }

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
        <div className="p-8 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-gray-800">All Applications & Verified Candidates</h1>

            {!candidates || candidates.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-500">No applications received yet.</p>
                </div>
            ) : (
                <div className="bg-white shadow overflow-x-auto sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ATS Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Verification</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {candidates.map((candidate) => {
                                // Try to find profile by user_id if available, else email
                                const profile = candidate.user_id ? profileMap.get(candidate.user_id) : profileMap.get(candidate.email);
                                const isWithdrawn = ['WITHDRAWN', 'WITHDRAWN_BY_CANDIDATE', 'WITHDRAWN_BY_ADMIN', 'DELETED'].includes(candidate.status);

                                return (
                                    <tr key={candidate.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{candidate.full_name}</div>
                                            <a href={candidate.resume_path} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                                                View Resume
                                            </a>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{candidate.email}</div>
                                            <div className="text-sm text-gray-500">{candidate.phone}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-2">
                                                {candidate.status === 'parse_failed' ? (
                                                    <span className="px-2 w-fit inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                        PARSE FAILED
                                                    </span>
                                                ) : (
                                                    <span className={`px-2 w-fit inline-flex text-xs leading-5 font-semibold rounded-full ${isWithdrawn ? 'bg-gray-100 text-gray-800' :
                                                        candidate.status === 'SHORTLISTED' ? 'bg-green-100 text-green-800' :
                                                            candidate.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                                'bg-blue-100 text-blue-800'
                                                        }`}>
                                                        {candidate.status || 'Applied'}
                                                    </span>
                                                )}

                                                {/* ATS Score Actions */}
                                                {!isWithdrawn && candidate.status !== 'parse_failed' && (
                                                    <AtsActions application={candidate} />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {/* Verification Logic UI */}
                                            {candidate.status === 'parse_failed' ? (
                                                <span className="text-xs text-gray-500 italic">Candidate must re-upload</span>
                                            ) : (
                                                <VerifyLogic profile={profile} candidate={candidate} />
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(candidate.created_at).toLocaleDateString()}
                                            {candidate.withdrawn_at && <div className="text-xs text-red-500">Ended: {new Date(candidate.withdrawn_at).toLocaleDateString()}</div>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            {!isWithdrawn && (
                                                <DeleteApplicationButton applicationId={candidate.id} />
                                            )}
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
