"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RetryExamButton({ examId }: { examId: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRetry = async () => {
        if (!confirm("Are you sure you want to retry AI generation?")) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/admin/exams/${examId}/retry`, {
                method: "POST",
            });
            const data = await res.json();

            if (!res.ok) {
                alert(data.error || "Retry failed");
            } else {
                alert("Generation retried. Please wait a moment for completion.");
                router.refresh();
            }
        } catch (e) {
            alert("Network error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleRetry}
            disabled={loading}
            className="w-full mt-2 text-center px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition flex justify-center items-center"
        >
            {loading ? (
                <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Retrying...
                </>
            ) : (
                "Retry AI Generation"
            )}
        </button>
    );
}
