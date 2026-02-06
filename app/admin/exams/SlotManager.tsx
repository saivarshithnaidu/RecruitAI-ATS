"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SlotManager({ examId }: { examId: string }) {
    const router = useRouter();
    const [slots, setSlots] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newSlot, setNewSlot] = useState({
        start_time: "",
        end_time: "",
        max_candidates: 10
    });

    useEffect(() => {
        fetchSlots();
    }, [examId]);

    const fetchSlots = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/exams/${examId}/slots`);
            const data = await res.json();
            if (data.slots) setSlots(data.slots);
        } catch (e) {
            console.error("Failed to fetch slots", e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newSlot.start_time || !newSlot.end_time) return;
        setCreating(true);
        try {
            const res = await fetch(`/api/admin/exams/${examId}/slots`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSlot)
            });
            if (res.ok) {
                fetchSlots();
                setNewSlot({ start_time: "", end_time: "", max_candidates: 10 });
            } else {
                alert("Failed to create slot");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="font-bold text-gray-800 text-lg">Exam Slots</h3>

            {/* List Slots */}
            <div className="space-y-3">
                {slots.length === 0 && !loading && (
                    <p className="text-gray-500 italic text-sm">No slots created yet.</p>
                )}

                {slots.map(slot => (
                    <div key={slot.id} className="bg-gray-50 p-3 rounded flex justify-between items-center border">
                        <div>
                            <div className="font-medium text-gray-800">
                                {new Date(slot.start_time).toLocaleString()} - {new Date(slot.end_time).toLocaleTimeString()}
                            </div>
                            <div className="text-xs text-gray-500">
                                Max: {slot.max_candidates} candidates
                            </div>
                        </div>
                        <div className="text-right">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${slot.filled >= slot.max_candidates ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                {slot.filled} / {slot.max_candidates} Filled
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Form */}
            <div className="bg-blue-50 p-4 rounded border border-blue-100">
                <h4 className="font-bold text-blue-800 text-sm mb-3">Add New Slot</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <label className="text-xs text-gray-600 block mb-1">Start Time</label>
                        <input
                            type="datetime-local"
                            className="w-full text-sm p-2 border rounded"
                            value={newSlot.start_time}
                            onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-600 block mb-1">End Time</label>
                        <input
                            type="datetime-local"
                            className="w-full text-sm p-2 border rounded"
                            value={newSlot.end_time}
                            onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-600 block mb-1">Capacity</label>
                        <input
                            type="number"
                            className="w-full text-sm p-2 border rounded"
                            value={newSlot.max_candidates}
                            onChange={(e) => setNewSlot({ ...newSlot, max_candidates: parseInt(e.target.value) })}
                        />
                    </div>
                </div>
                <div className="mt-3 text-right">
                    <button
                        onClick={handleCreate}
                        disabled={creating || !newSlot.start_time}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {creating ? "Saving..." : "Create Slot"}
                    </button>
                </div>
            </div>
        </div>
    );
}
