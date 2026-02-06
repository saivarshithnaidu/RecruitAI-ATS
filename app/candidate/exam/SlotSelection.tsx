"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SlotSelection({
    assignmentId,
    slots,
    currentSlot,
    rescheduleCount = 0
}: {
    assignmentId: string,
    slots: any[],
    currentSlot?: any,
    rescheduleCount?: number
}) {
    const router = useRouter();
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [isRescheduling, setIsRescheduling] = useState(false);

    const handleConfirm = async () => {
        if (!selectedSlot) return;
        setSubmitting(true);
        setError("");

        try {
            const res = await fetch('/api/candidate/exams/select-slot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assignment_id: assignmentId,
                    slot_id: selectedSlot
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to book slot");

            router.refresh();
            setIsRescheduling(false);
        } catch (e: any) {
            setError(e.message);
            setSubmitting(false);
        }
    };

    // View: Current Slot Confirmed
    if (currentSlot && !isRescheduling) {
        const startTime = new Date(currentSlot.start_time);
        const entryTime = new Date(startTime.getTime() - 15 * 60 * 1000);
        const canReschedule = rescheduleCount < 2;

        return (
            <div className="max-w-xl mx-auto p-8 text-center mt-20 bg-white rounded shadow border border-blue-100">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">Exam Scheduled</h1>
                <p className="text-gray-600 mb-2">You have booked a slot for:</p>
                <div className="bg-blue-50 p-4 rounded-lg my-6 border border-blue-100">
                    <p className="text-2xl font-bold text-blue-800">
                        {startTime.toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}
                    </p>
                </div>

                <p className="text-sm text-gray-500 mb-6">
                    You can enter the exam waiting room 15 minutes before the start time.<br />
                    Entry opens at: <strong>{entryTime.toLocaleTimeString()}</strong>
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => router.refresh()}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                    >
                        Refresh Status
                    </button>

                    {canReschedule && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <button
                                onClick={() => setIsRescheduling(true)}
                                className="text-sm text-gray-500 hover:text-gray-700 underline"
                            >
                                Need to reschedule? ({2 - rescheduleCount} attempts remaining)
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // View: Selection List (Initial or Reschedule)
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-2xl w-full p-8 rounded-xl shadow-lg border">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">
                        {currentSlot ? "Reschedule Exam" : "Select Exam Slot"}
                    </h1>
                    {currentSlot && (
                        <button
                            onClick={() => setIsRescheduling(false)}
                            className="text-sm text-gray-500 hover:text-gray-800"
                        >
                            Cancel
                        </button>
                    )}
                </div>

                <p className="text-gray-600 mb-8">
                    {currentSlot
                        ? "Choose a new time slot. This counts towards your rescheduling limit."
                        : "Please choose a time slot to take your technical assessment."}
                </p>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded mb-6 text-sm border border-red-200">
                        {error}
                    </div>
                )}

                {slots.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 rounded border border-dashed">
                        <p className="text-gray-500">No other slots available. Please contact HR.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 mb-8">
                        {slots.map(slot => {
                            const startTime = new Date(slot.start_time);
                            const endTime = new Date(slot.end_time);
                            const isFull = (slot.filled || 0) >= (slot.max_candidates || 10);
                            const isCurrent = currentSlot && currentSlot.id === slot.id;

                            if (isCurrent) return null; // Don't show current slot in list

                            return (
                                <div
                                    key={slot.id}
                                    onClick={() => !isFull && setSelectedSlot(slot.id)}
                                    className={`p-4 rounded-lg border-2 transition cursor-pointer flex justify-between items-center group
                                        ${isFull ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed' :
                                            selectedSlot === slot.id ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' :
                                                'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                                        }
                                    `}
                                >
                                    <div>
                                        <div className="font-bold text-gray-800">
                                            {startTime.toLocaleDateString()}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {isFull ? (
                                            <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded">FULL</span>
                                        ) : (
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                                                ${selectedSlot === slot.id ? 'border-blue-600' : 'border-gray-300 group-hover:border-blue-400'}
                                            `}>
                                                {selectedSlot === slot.id && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <button
                    onClick={handleConfirm}
                    disabled={!selectedSlot || submitting}
                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow"
                >
                    {submitting ? "Confirming..." : (currentSlot ? "Confirm Reschedule" : "Confirm Slot Selection")}
                </button>
            </div>
        </div>
    );
}
