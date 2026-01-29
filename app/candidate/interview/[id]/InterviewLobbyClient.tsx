"use client";

import { useState, useEffect } from "react";
import MediaDeviceChecker from "@/components/candidate/MediaDeviceChecker";
import { ArrowRight, Clock, Calendar, Lock, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { startInterviewSession } from "@/app/actions/interview";

type TimeState = 'FUTURE' | 'EARLY_JOIN' | 'ACTIVE' | 'EXPIRED';

export default function InterviewLobbyClient({ interview }: { interview: any }) {
    const [isReady, setIsReady] = useState(false);
    const [timeState, setTimeState] = useState<TimeState>('FUTURE');
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const scheduledAt = new Date(interview.scheduled_at);
    // 15 mins before
    const joinTime = new Date(scheduledAt.getTime() - 15 * 60 * 1000);
    // End time
    const durationMins = interview.duration_minutes || 60;
    const endTime = new Date(scheduledAt.getTime() + durationMins * 60 * 1000);

    useEffect(() => {
        const checkTime = () => {
            const now = new Date();

            if (now > endTime) {
                setTimeState('EXPIRED');
                return;
            }

            if (now < joinTime) {
                setTimeState('FUTURE');
                return;
            }

            if (now >= joinTime && now < scheduledAt) {
                setTimeState('EARLY_JOIN');
                // Calculate countdown to START time
                const diff = scheduledAt.getTime() - now.getTime();
                const mins = Math.floor(diff / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`${mins}m ${secs}s`);
                return;
            }

            if (now >= scheduledAt && now <= endTime) {
                setTimeState('ACTIVE');
                return;
            }
        };

        checkTime(); // Initial check
        const interval = setInterval(checkTime, 1000);
        return () => clearInterval(interval);
    }, [scheduledAt, joinTime, endTime]);

    const handleStart = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await startInterviewSession(interview.id);
            if (result.success) {
                router.push(`/candidate/interview/${interview.id}/play`);
            } else {
                setError(result.error || "Failed to start interview");
            }
        } catch (err) {
            setError("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <MediaDeviceChecker onReady={setIsReady} />

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
                    {error}
                </div>
            )}

            <div className="text-center">

                {/* STATE: FUTURE */}
                {timeState === 'FUTURE' && (
                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 text-blue-900">
                        <Calendar className="w-8 h-8 mx-auto mb-3 text-blue-600" />
                        <h3 className="text-lg font-bold mb-2">Upcoming Interview</h3>
                        <p className="text-sm mb-4">
                            Log in 15 minutes before the scheduled time to check your hardware.
                        </p>
                        <div className="inline-block bg-white px-4 py-2 rounded-lg border border-blue-100 shadow-sm font-semibold">
                            {scheduledAt.toLocaleString()}
                        </div>
                    </div>
                )}

                {/* STATE: EARLY JOIN (Countdown) */}
                {timeState === 'EARLY_JOIN' && (
                    <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200 text-yellow-800">
                        <Clock className="w-8 h-8 mx-auto mb-3 text-yellow-600 animate-pulse" />
                        <h3 className="text-lg font-bold mb-1">Starting Soon</h3>
                        <p className="text-sm mb-4 opacity-80">You can enter the room when the timer hits zero.</p>
                        <div className="text-4xl font-mono font-bold tracking-wider">
                            {timeLeft}
                        </div>
                        <p className="text-xs mt-2 uppercase tracking-widest opacity-60">Until Start</p>
                    </div>
                )}

                {/* STATE: EXPIRED */}
                {timeState === 'EXPIRED' && (
                    <div className="bg-red-50 p-6 rounded-xl border border-red-200 text-red-800">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-red-600" />
                        <h3 className="text-lg font-bold mb-2">Interview Expired</h3>
                        <p className="text-sm">
                            The scheduled time for this interview has passed. Please contact the administrator.
                        </p>
                    </div>
                )}

                {/* START BUTTON (Only for ACTIVE) */}
                <div className="mt-8">
                    <button
                        onClick={handleStart}
                        disabled={timeState !== 'ACTIVE' || !isReady || isLoading}
                        className={`w-full py-4 text-lg font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition
                            ${timeState === 'ACTIVE'
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
                        `}
                    >
                        {isLoading ? (
                            "Starting..."
                        ) : timeState === 'ACTIVE' ? (
                            <>Start Interview <ArrowRight className="w-5 h-5" /></>
                        ) : (
                            <><Lock className="w-4 h-4" /> Locked</>
                        )}
                    </button>

                    {timeState !== 'ACTIVE' && timeState !== 'EXPIRED' && (
                        <p className="text-xs text-gray-500 mt-3">
                            Button will enable at {scheduledAt.toLocaleTimeString()}
                        </p>
                    )}
                </div>

                {!isReady && (timeState === 'ACTIVE' || timeState === 'EARLY_JOIN') && (
                    <p className="text-xs text-red-500 mt-2 font-medium">
                        * Please verify your Camera & Microphone to proceed.
                    </p>
                )}
            </div>
        </div>
    );
}
