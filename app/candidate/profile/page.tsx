"use server"

import { getProfile } from "@/app/actions/profile";
import ProfileForm from "@/components/ProfileForm";
import OtpVerification from "@/components/OtpVerification"; // Adjusted import path
import { redirect } from "next/navigation";
import { CheckCircle, AlertCircle, Clock } from "lucide-react"; // Start using Lucide icons

export default async function ProfilePage() {
    const profile = await getProfile();

    if (!profile) {
        // Handle no profile case (shouldn't happen if auth/middleware works)
        redirect("/auth/login");
    }

    // Verification Logic
    const isEmailVerified = profile.email_verified;
    const isMobileVerified = profile.phone_verified; // Updated to phone_verified
    const isAdminVerified = profile.verified_by_admin; // Updated to verified_by_admin

    const isFullyVerified = isEmailVerified && isMobileVerified && isAdminVerified;

    return (
        <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Profile</h1>
                        <p className="text-gray-500 mt-1">Manage your professional identity and verification status.</p>
                    </div>

                    <div className="flex items-center space-x-3 bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                        {isFullyVerified ? (
                            <div className="flex items-center text-green-700 bg-green-50 px-4 py-2 rounded-md transition-colors border border-green-200">
                                <CheckCircle className="w-5 h-5 mr-2" />
                                <span className="font-semibold">Admin Approved</span>
                            </div>
                        ) : (
                            <div className={`flex items-center px-4 py-2 rounded-md transition-colors border ${profile.verification_status === 'rejected'
                                ? 'text-red-700 bg-red-50 border-red-200'
                                : 'text-amber-700 bg-amber-50 border-amber-200'
                                }`}>
                                {profile.verification_status === 'rejected' ? (
                                    <>
                                        <AlertCircle className="w-5 h-5 mr-2" />
                                        <span className="font-semibold">Admin Rejected</span>
                                        <span className="text-xs ml-2">(Contact Support)</span>
                                    </>
                                ) : (
                                    <>
                                        <Clock className="w-5 h-5 mr-2" />
                                        <span className="font-semibold">Waiting for Admin Approval</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Profile Form */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-6 shadow-sm ring-1 ring-gray-900/5 rounded-xl">
                            <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b border-gray-100">Personal Details</h2>
                            <ProfileForm profile={profile} />
                        </div>
                    </div>

                    {/* Verification Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 shadow-sm ring-1 ring-gray-900/5 rounded-xl sticky top-8">
                            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                                <CheckCircle className="w-5 h-5 mr-2 text-indigo-600" />
                                Verification Status
                            </h3>

                            <div className="space-y-6">
                                {/* Email Verification */}
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <OtpVerification
                                        type="email"
                                        isVerified={isEmailVerified}
                                        target={profile.email}
                                        label="Email Address"
                                    />
                                </div>

                                {/* Mobile Verification */}
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <OtpVerification
                                        type="phone"
                                        isVerified={isMobileVerified}
                                        target={profile.phone} // Updated to phone
                                        label="Mobile Number"
                                    />
                                </div>

                                {/* Admin Approval Status */}
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="block text-sm font-medium text-gray-700">Admin Approval</span>
                                        {isAdminVerified ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                By Admin
                                            </span>
                                        ) : (
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${profile.verification_status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {profile.verification_status}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        {isAdminVerified
                                            ? "Your profile has been manually reviewed and approved by our team."
                                            : profile.verification_status === 'rejected'
                                                ? "Your profile was rejected. Please contact support for details."
                                                : "After verifying email & mobile, an admin will review your profile."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
