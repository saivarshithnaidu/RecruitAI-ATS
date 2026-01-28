"use client";

import { useState } from "react";
import { assignExam } from "@/app/actions/exams";
import { useRouter } from "next/navigation";

export default function AssignCandidatesClient({
    examId,
    candidates
}: {
    examId: string,
    candidates: { user_id: string, name: string, email: string }[]
}) {
    const [selectedids, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // New State for Scheduling & Proctoring
    const [scheduledTime, setScheduledTime] = useState("");
    const [proctoring, setProctoring] = useState({
        camera: false,
        mic: false,
        tab_switch: true,
        copy_paste: true
    });

    const toggle = (id: string) => {
        const next = new Set(selectedids);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleAssign = async () => {
        if (selectedids.size === 0) return;
        setLoading(true);
        try {
            const timeToSend = scheduledTime ? new Date(scheduledTime).toISOString() : null;

            await assignExam(
                examId,
                Array.from(selectedids),
                timeToSend,
                proctoring
            );

            setSelectedIds(new Set());
            setScheduledTime(""); // Reset time
            router.refresh();
            alert("Candidates assigned successfully!");
        } catch (e) {
            console.error(e);
            alert("Failed to assign");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {/* Scheduling Section */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Start Time (Optional)</label>
                <input
                    type="datetime-local"
                    className="w-full border rounded p-2 text-sm"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">If set, candidates can only start around this time.</p>
            </div>

            {/* Proctoring Controls */}
            <div className="mb-4 border p-3 rounded bg-gray-50">
                <h4 className="text-sm font-bold text-gray-700 mb-2">Proctoring Controls</h4>
                <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={proctoring.camera}
                            onChange={(e) => setProctoring({ ...proctoring, camera: e.target.checked })}
                            className="rounded h-4 w-4 text-blue-600"
                        />
                        <span className="text-xs">Camera On</span>
                    </label>
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={proctoring.mic}
                            onChange={(e) => setProctoring({ ...proctoring, mic: e.target.checked })}
                            className="rounded h-4 w-4 text-blue-600"
                        />
                        <span className="text-xs">Microphone On</span>
                    </label>
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={proctoring.tab_switch}
                            onChange={(e) => setProctoring({ ...proctoring, tab_switch: e.target.checked })}
                            className="rounded h-4 w-4 text-blue-600"
                        />
                        <span className="text-xs">Detect Tab Switch</span>
                    </label>
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={proctoring.copy_paste}
                            onChange={(e) => setProctoring({ ...proctoring, copy_paste: e.target.checked })}
                            className="rounded h-4 w-4 text-blue-600"
                        />
                        <span className="text-xs">Block Copy/Paste</span>
                    </label>
                </div>
            </div>

            <div className="max-h-60 overflow-y-auto border rounded mb-4">
                {candidates.map(c => (
                    <div key={c.user_id} className="flex items-center p-2 border-b last:border-0 hover:bg-gray-50">
                        <input
                            type="checkbox"
                            id={`c-${c.user_id}`}
                            checked={selectedids.has(c.user_id)}
                            onChange={() => toggle(c.user_id)}
                            className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`c-${c.user_id}`} className="flex-1 cursor-pointer">
                            <div className="text-sm font-medium text-gray-900">{c.name}</div>
                            <div className="text-xs text-gray-500">{c.email}</div>
                        </label>
                    </div>
                ))}
            </div>

            <button
                onClick={handleAssign}
                disabled={loading || selectedids.size === 0}
                className={`w-full py-2 px-4 rounded text-white font-medium ${loading || selectedids.size === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
            >
                {loading ? 'Assigning...' : `Assign (${selectedids.size})`}
            </button>
        </div>
    );
}
