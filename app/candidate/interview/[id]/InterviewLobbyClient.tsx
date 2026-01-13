"use client";

import { useState, useEffect } from "react";
import MediaDeviceChecker from "@/components/candidate/MediaDeviceChecker";
import { ArrowRight, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

export default function InterviewLobbyClient({ interview }: { interview: any }) {
    const [isReady, setIsReady] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const router = useRouter();

    const startTime = new Date(interview.scheduled_at).getTime();
    const now = new Date().getTime();
    const canStart = now >= startTime - 5 * 60 * 1000; // Allow 5 mins early

    useEffect(() => {
        const interval = setInterval(() => {
            const diff = startTime - new Date().getTime();
            setTimeLeft(diff);
        }, 1000);
        return () => clearInterval(interval);
    }, [startTime]);

    const formatTime = (ms: number) => {
        if (ms <= 0) return "Ready to Start";
        const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((ms % (1000 * 60)) / 1000);
        return `${mins}m ${secs}s`;
    };

    const handleStart = () => {
        // Create full screen request? Or just route
        router.push(`/candidate/interview/${interview.id}/play`);
    };

    return (
        <div className="space-y-6">
            <MediaDeviceChecker onReady={setIsReady} />

            <div className="text-center">
                {!canStart ? (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-yellow-800">
                        <Clock className="w-6 h-6 mx-auto mb-2" />
                        <p className="font-bold text-lg mb-1">Starting In</p>
                        <p className="text-2xl font-mono">{formatTime(timeLeft || 0)}</p>
                    </div>
                ) : (
                    <button
                        onClick={handleStart}
                        disabled={!isReady}
                        className="w-full py-4 text-lg font-bold bg-green-600 text-white rounded-xl shadow-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        Start Interview <ArrowRight className="w-5 h-5" />
                    </button>
                )}

                {!isReady && canStart && (
                    <p className="text-xs text-red-500 mt-2">
                        Hardware check required to start.
                    </p>
                )}
            </div>
        </div>
    );
}
