"use client";

import { updateProfile } from "@/app/actions/profile";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfileForm({ profile }: { profile: any }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setMessage("");

        const formData = new FormData(event.currentTarget);
        // Education is handled as JSON, simplifying for now as direct inputs or text for MVP
        // If Education is list, we might need complex UI. 
        // For now, let's treat Education as a JSON string or simplified text fields if not specified.
        // Prompt said: education (degree, college, year). 
        // I'll create a simple JSON structure or just text fields that get JSON-ified.
        // For MVP robustness, let's just accept text for "Latest Degree", "College", "Year" in UI and form JSON.

        // Construct Education JSON
        const eduData = {
            degree: formData.get('degree'),
            college: formData.get('college'),
            year: formData.get('year')
        };
        formData.append('education', JSON.stringify(eduData));

        const result = await updateProfile(formData);

        if (result.success) {
            setMessage("Profile updated successfully!");
            router.refresh();
        } else {
            setMessage(result.error || "Failed to update profile.");
        }
        setLoading(false);
    }

    // Parse existing education if available
    const education = profile?.education || {};
    // Handle fallback if education is string
    const eduObj = typeof education === 'string' ? JSON.parse(education) : education;

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-md">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">

                {/* Full Name */}
                <div className="sm:col-span-3">
                    <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">Full Name</label>
                    <div className="mt-1">
                        <input type="text" name="full_name" id="full_name" defaultValue={profile?.full_name || ''} required
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border" />
                    </div>
                </div>

                {/* Phone */}
                <div className="sm:col-span-3">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</label>
                    <div className="mt-1">
                        <input type="text" name="phone" id="phone" defaultValue={profile?.phone || ''}
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border" />
                    </div>
                </div>

                {/* Email - Read Only */}
                <div className="sm:col-span-4">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email (Verified: {profile?.email_verified ? 'Yes' : 'No'})</label>
                    <div className="mt-1">
                        <input type="email" name="email" id="email" defaultValue={profile?.email || ''} disabled
                            className="shadow-sm bg-gray-100 block w-full sm:text-sm border-gray-300 rounded-md p-2 border cursor-not-allowed" />
                    </div>
                </div>

                <div className="sm:col-span-6 border-t pt-4 mt-4">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">Education</h3>
                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6 mt-4">
                        <div className="sm:col-span-3">
                            <label htmlFor="degree" className="block text-sm font-medium text-gray-700">Degree</label>
                            <input type="text" name="degree" id="degree" defaultValue={eduObj?.degree || ''}
                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border" />
                        </div>
                        <div className="sm:col-span-3">
                            <label htmlFor="college" className="block text-sm font-medium text-gray-700">College/University</label>
                            <input type="text" name="college" id="college" defaultValue={eduObj?.college || ''}
                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border" />
                        </div>
                        <div className="sm:col-span-2">
                            <label htmlFor="year" className="block text-sm font-medium text-gray-700">Graduation Year</label>
                            <input type="text" name="year" id="year" defaultValue={eduObj?.year || ''}
                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border" />
                        </div>
                    </div>
                </div>

                {/* Skills */}
                <div className="sm:col-span-6">
                    <label htmlFor="skills" className="block text-sm font-medium text-gray-700">Skills (Comma separated)</label>
                    <div className="mt-1">
                        <textarea id="skills" name="skills" rows={3} defaultValue={Array.isArray(profile?.skills) ? profile.skills.join(', ') : profile?.skills || ''}
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md p-2"
                            placeholder="React, Next.js, Node.js, SQL" />
                    </div>
                </div>

                {/* Preferred Roles */}
                <div className="sm:col-span-6">
                    <label htmlFor="preferred_roles" className="block text-sm font-medium text-gray-700">Preferred Job Roles (Comma separated)</label>
                    <div className="mt-1">
                        <input type="text" name="preferred_roles" id="preferred_roles" defaultValue={Array.isArray(profile?.preferred_roles) ? profile.preferred_roles.join(', ') : profile?.preferred_roles || ''}
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                            placeholder="Software Engineer, Product Manager" />
                    </div>
                </div>

                {/* Summary */}
                <div className="sm:col-span-6">
                    <label htmlFor="summary" className="block text-sm font-medium text-gray-700">Professional Summary</label>
                    <div className="mt-1">
                        <textarea id="summary" name="summary" rows={4} defaultValue={profile?.summary || ''}
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md p-2" />
                    </div>
                </div>

            </div>

            <div className="pt-5">
                <div className="flex justify-end">
                    {message && <span className={`mr-4 my-auto text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{message}</span>}
                    <button type="submit" disabled={loading}
                        className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                        {loading ? 'Saving...' : 'Save Profile'}
                    </button>
                </div>
            </div>
        </form>
    );
}
