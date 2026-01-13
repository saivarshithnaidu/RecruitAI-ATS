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
