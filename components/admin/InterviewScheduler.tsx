"use client";

import { useState } from "react";
import { scheduleInterview } from "@/app/actions/interview"; // We will create this
import { Calendar, Clock, Video, User, CheckCircle, XCircle } from "lucide-react";

export default function InterviewScheduler({
    candidates,
    onScheduleSuccess
}: {
    candidates: any[],
    onScheduleSuccess: () => void
}) {
    const [selectedCandidate, setSelectedCandidate] = useState<string>("");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [duration, setDuration] = useState(30);
    const [mode, setMode] = useState<"AI" | "MANUAL">("AI");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCandidate || !date || !time) return;

        setLoading(true);

        const scheduledAt = new Date(`${date}T${time}`).toISOString();
        const candidate = candidates.find(c => c.user_id === selectedCandidate);

        const res = await scheduleInterview({
            applicationId: candidate.id,
            candidateId: candidate.user_id,
            scheduledAt,
            duration,
            mode,
            role: "Software Engineer", // TODO: Fetch from application
            skills: ["React", "Node.js"] // TODO: Fetch from profile
        });

        setLoading(false);

        if (res.success) {
            alert("Interview Scheduled Successfully!");
            onScheduleSuccess();
            setSelectedCandidate("");
            setDate("");
            setTime("");
        } else {
            alert("Error: " + res.error);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Video className="w-5 h-5 text-blue-600" />
                Schedule Interview
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Candidate</label>
                    <select
                        className="w-full p-2 border rounded-lg"
                        value={selectedCandidate}
                        onChange={e => setSelectedCandidate(e.target.value)}
                        required
                    >
                        <option value="">Select a Verified Candidate</option>
                        {candidates.map(c => (
                            <option key={c.user_id} value={c.user_id}>
                                {c.full_name} ({c.email})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input
                            type="date"
                            className="w-full p-2 border rounded-lg"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                        <input
                            type="time"
                            className="w-full p-2 border rounded-lg"
                            value={time}
                            onChange={e => setTime(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Duration (mins)</label>
                        <select
                            className="w-full p-2 border rounded-lg"
                            value={duration}
                            onChange={e => setDuration(Number(e.target.value))}
                        >
                            <option value={30}>30 Minutes</option>
                            <option value={45}>45 Minutes</option>
                            <option value={60}>60 Minutes</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                        <select
                            className="w-full p-2 border rounded-lg"
                            value={mode}
                            onChange={e => setMode(e.target.value as any)}
                        >
                            <option value="AI">AI Interviewer</option>
                            <option value="MANUAL">Manual (Face-to-Face)</option>
                        </select>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
                >
                    {loading ? "Scheduling & Generating Questions..." : "Schedule Interview"}
                </button>
            </form>
        </div>
    );
}
