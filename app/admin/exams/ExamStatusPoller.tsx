"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RetryExamButton from "./RetryExamButton";

export default function ExamStatusPoller({ examId, initialStatus, onRefresh }: { examId: string, initialStatus: string, onRefresh?: () => void }) {
    const [status, setStatus] = useState(initialStatus);
    const router = useRouter();

    useEffect(() => {
        let interval: NodeJS.Timeout;

        // Poll only if generating
        if (status === 'GENERATING' || status === 'DRAFT') {
            interval = setInterval(async () => {
                try {
                    // Check status via small API or re-fetch page data via router.refresh (lighter to check API)
                    // For simplicity, we can use a dedicated status endpoint or just revalidate path
                    // Let's assume we check status directly.
                    // Actually, router.refresh() is the "Next.js way" but might be heavy.
                    // Let's fetch a lightweight status API.

                    const res = await fetch(`/api/admin/exams/${examId}/status`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.status !== status) {
                            setStatus(data.status);
                            router.refresh(); // Update the whole page data
                        }
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 3000); // 3 seconds
        }

        return () => clearInterval(interval);
    }, [status, examId, router]);

    if (status === 'ERROR') {
        return (
            <div className="mt-4 p-4 bg-red-50 text-red-800 rounded border border-red-200">
                <p className="font-bold mb-2">Generation Failed</p>
                <p className="text-sm mb-3">The AI could not generate the exam. Please try again.</p>
                <RetryExamButton examId={examId} />
            </div>
        );
    }

    if (status === 'GENERATING') {
        return (
            <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded border border-blue-200 flex items-center gap-3">
                <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <div>
                    <p className="font-bold">Generating Questions...</p>
                    <p className="text-xs">This may take up to 30 seconds.</p>
                </div>
            </div>
        );
    }

    return null; // Ready or Draft (handled by main UI)
}
