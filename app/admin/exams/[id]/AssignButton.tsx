"use client";

import { useState } from "react";
import { assignExam } from "@/app/actions/exams";
import { useRouter } from "next/navigation";

export default function AssignButton({
    examId,
    candidates
}: {
    examId: string,
    candidates: { user_id: string, name: string, email: string }[]
}) {
    const [selectedids, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const router = useRouter();

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
            await assignExam(examId, Array.from(selectedids));
            setSelectedIds(new Set());
            router.refresh();
        } catch (e) {
            console.error(e);
            alert("Failed to assign");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
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
