import { getAdminCandidateProfile, approveCandidateProfile, rejectCandidateProfile } from "@/app/actions/admin";
import { notFound, redirect } from "next/navigation";
import { CheckCircle, AlertCircle, Phone, Mail, User, Briefcase, GraduationCap, FileText } from "lucide-react";
import Link from 'next/link';

export default async function AdminCandidatePage({ params }: { params: { id: string } }) {
    const { profile, error } = await getAdminCandidateProfile(params.id);

    if (error || !profile) {
        notFound();
    }

    const isEmailVerified = profile.email_verified;
    const isMobileVerified = profile.phone_verified; // Updated to phone_verified
    const isProfileVerified = profile.verified_by_admin; // Updated to verified_by_admin
    const isFullyVerified = isEmailVerified && isMobileVerified && isProfileVerified;

    // Server Action Wrappers
    async function verifyAction() {
        "use server";
        await approveCandidateProfile(params.id);
        redirect(`/admin/dashboard/candidates/${params.id}`);
    }

    async function rejectAction() {
        "use server";
        await rejectCandidateProfile(params.id);
        redirect(`/admin/dashboard/candidates/${params.id}`);
    }

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-center justify-between">
                <Link href="/admin/dashboard" className="text-gray-500 hover:text-gray-900 flex items-center gap-2">
                    &larr; Back to Dashboard
                </Link>
                <div className="flex space-x-2">
                    {isFullyVerified && (
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold flex items-center">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Verified Candidate
                        </span>
                    )}
                    {profile.verification_status === 'rejected' && (
                        <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-bold flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            Rejected
                        </span>
                    )}
                </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg leading-6 font-medium text-gray-900">Candidate Profile</h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">{profile.full_name}</p>
                    </div>
                    {/* Approve/Reject Buttons */}
                    <div className="flex gap-2">
                        {!isProfileVerified && profile.verification_status !== 'rejected' && (
                            <>
                                <form action={verifyAction}>
                                    <button
                                        type="submit"
                                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out"
                                    >
                                        Approve
                                    </button>
                                </form>
                                <form action={rejectAction}>
                                    <button
                                        type="submit"
                                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out"
                                    >
                                        Reject
                                    </button>
                                </form>
                            </>
                        )}
                        {/* Allow Re-Approve if Rejected or Re-Reject if Approved? 
                            Prompt says "Approve Profile -> verified = true".
                            Let's keep it simple: Show buttons if status is not final? 
                            Or always allow toggling? 
                            Usually Admins might need to change decision.
                            Let's show Reverse Option.
                        */}
                        {isProfileVerified && (
                            <form action={rejectAction}>
                                <button
                                    type="submit"
                                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded text-xs"
                                >
                                    Revoke Approval
                                </button>
                            </form>
                        )}
                        {profile.verification_status === 'rejected' && (
                            <form action={verifyAction}>
                                <button
                                    type="submit"
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded text-xs"
                                >
                                    Approve Candidate
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                <div className="border-t border-gray-200">
                    <dl>
                        <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500 flex items-center">
                                <Mail className="w-4 h-4 mr-2" /> Email
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 flex items-center">
                                {profile.email}
                                {isEmailVerified ? (
                                    <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                                ) : (
                                    <span className="text-amber-500 ml-2 text-xs">(Unverified)</span>
                                )}
                            </dd>
                        </div>
                        <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500 flex items-center">
                                <Phone className="w-4 h-4 mr-2" /> Mobile
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 flex items-center">
                                {profile.phone || 'N/A'} {/* Updated to phone */}
                                {isMobileVerified ? (
                                    <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                                ) : (
                                    <span className="text-amber-500 ml-2 text-xs">(Unverified)</span>
                                )}
                            </dd>
                        </div>
                        <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500 flex items-center">
                                <Briefcase className="w-4 h-4 mr-2" /> Preferred Roles
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                {profile.preferred_roles && profile.preferred_roles.length > 0
                                    ? profile.preferred_roles.join(', ')
                                    : 'N/A'}
                            </dd>
                        </div>
                        <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500 flex items-center">
                                <GraduationCap className="w-4 h-4 mr-2" /> Education
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                {profile.education ? (
                                    <pre className="font-sans whitespace-pre-wrap text-sm text-gray-600">
                                        {JSON.stringify(profile.education, null, 2)}
                                    </pre>
                                ) : 'N/A'}
                            </dd>
                        </div>
                        <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500 flex items-center">
                                <div className="w-4 h-4 mr-2">Skills</div>
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                <div className="flex flex-wrap gap-2">
                                    {profile.skills && profile.skills.length > 0 ? (
                                        profile.skills.map((skill: string, i: number) => (
                                            <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {skill}
                                            </span>
                                        ))
                                    ) : 'No skills listed'}
                                </div>
                            </dd>
                        </div>
                        <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500 flex items-center">
                                <FileText className="w-4 h-4 mr-2" /> Summary
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                {profile.summary || 'N/A'}
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>
        </div>
    );
}
