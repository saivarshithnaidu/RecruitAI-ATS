"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AssignExamModal({
    isOpen,
    onClose,
    candidateId,
    candidateName
}: {
    isOpen: boolean,
    onClose: () => void,
    candidateId: string,
    candidateName: string
}) {
    const router = useRouter();
    const [exams, setExams] = useState<any[]>([]);
    const [selectedExam, setSelectedExam] = useState("");
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        if (isOpen) {
            fetchExams();
        }
    }, [isOpen]);

    const fetchExams = async () => {
        setFetching(true);
        try {
            const res = await fetch('/api/admin/exams', { cache: 'no-store' });
            if (res.ok) {
                const text = await res.text();
                try {
                    const data = JSON.parse(text);
                    setExams(data.exams || []);
                } catch (e) {
                    console.error("Failed to parse exams list:", text);
                }
            } else {
                console.error("Failed to fetch exams:", res.status, res.statusText);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setFetching(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedExam) return;
        setLoading(true);
        setError("");

        try {
            const res = await fetch('/api/admin/exams/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    exam_id: selectedExam,
                    candidate_id: candidateId
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Assignment failed");

            setSuccess("Exam assigned successfully!");
            setTimeout(() => {
                onClose();
                router.refresh(); // Refresh dashboard to show status change
            }, 1500);

        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl relative z-[60]">
                <h3 className="text-lg font-bold mb-4">Assign Exam to {candidateName}</h3>

                {error && <div className="bg-red-50 text-red-600 p-2 text-sm rounded mb-4">{error}</div>}
                {success && <div className="bg-green-50 text-green-600 p-2 text-sm rounded mb-4">{success}</div>}

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Exam</label>
                    {fetching ? (
                        <p className="text-gray-600 text-sm">Loading exams...</p>
                    ) : exams.length === 0 ? (
                        <p className="text-red-500 text-sm">No exams found. Create one first.</p>
                    ) : (
                        <select
                            className="w-full border rounded p-2"
                            value={selectedExam}
                            onChange={(e) => setSelectedExam(e.target.value)}
                        >
                            <option value="">-- Select an Exam --</option>
                            {exams.map((exam: any) => {
                                const isReady = exam.status === 'READY';
                                const label = `${exam.title} (${exam.role} - ${exam.difficulty})`;
                                const statusLabel = !isReady ? ` [${exam.status || 'DRAFT'}]` : '';

                                return (
                                    <option key={exam.id} value={exam.id} disabled={!isReady}>
                                        {label}{statusLabel}
                                    </option>
                                );
                            })}
                        </select>
                    )}
                </div>

                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAssign}
                        disabled={loading || !selectedExam}
                        className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${loading || !selectedExam ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loading ? 'Assigning...' : 'Confirm Assignment'}
                    </button>
                </div>
            </div>
        </div>
    );
}
