import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { redirect } from "next/navigation";
import Link from "next/link";
import MediaDeviceChecker from "@/components/candidate/MediaDeviceChecker";
import InterviewLobbyClient from "./InterviewLobbyClient";

export const dynamic = 'force-dynamic';

export default async function InterviewLobbyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/auth/login");
    }

    console.log("Interview Page Params ID:", id);
    console.log("Session User:", session.user.id);

    const { data: interview, error } = await supabaseAdmin
        .from('interviews')
        .select('*')
        .eq('id', id)
        .single();

    if (error) console.error("Interview Fetch Error:", error);
    if (!interview) console.log("Interview not found for ID:", id);

    if (!interview) {
        return <div className="p-8 text-center">Interview not found. (ID: {id})</div>;
    }

    if (interview.candidate_id !== session.user.id) {
        return <div className="p-8 text-center text-red-600">Unauthorized access.</div>;
    }

    if (interview.status === 'completed') {
        return <div className="p-8 text-center text-green-600">You have already completed this interview.</div>;
    }

    const { data: profile } = await supabaseAdmin
        .from('candidate_profiles')
        .select('photo_status, profile_photo_url')
        .eq('user_id', session.user.id)
        .single();

    // Photo Verification Check
    const photoStatus = profile?.photo_status || 'PENDING';
    const hasPhoto = !!profile?.profile_photo_url;

    if (photoStatus !== 'VERIFIED') {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                    <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                        ⚠️
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Profile Photo Verification Required</h2>
                    <p className="text-gray-600 mb-6">
                        {photoStatus === 'REJECTED'
                            ? "Your profile photo was rejected by the administrator. Please upload a new professional photo to proceed."
                            : "Your profile photo is currently under review. You can only start the interview once it is verified."}
                    </p>

                    <div className="bg-gray-50 border rounded p-3 mb-6 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-500 mr-2">Current Status:</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${photoStatus === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                            {photoStatus}
                        </span>
                    </div>

                    <Link href="/candidate/application" className="inline-block w-full py-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition">
                        Go to Profile
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-blue-600 px-8 py-6 text-white text-center">
                    <h1 className="text-2xl font-bold mb-2">Technical Interview</h1>
                    <p className="opacity-90">{new Date(interview.scheduled_at).toLocaleString()}</p>
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div>
                            <h3 className="font-bold text-lg mb-4 text-gray-800">Instructions</h3>
                            <ul className="space-y-3 text-gray-600 text-sm list-disc pl-5">
                                <li>Ensure you are in a quiet environment.</li>
                                <li>You cannot switch tabs or copy-paste.</li>
                                <li>The interview is AI-proctored.</li>
                                <li>Duration: <strong>{interview.duration_minutes} minutes</strong>.</li>
                                <li>Speak clearly into the microphone.</li>
                            </ul>
                        </div>

                        <div>
                            <InterviewLobbyClient interview={interview} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
