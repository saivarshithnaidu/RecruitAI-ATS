"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, Video as VideoIcon, CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function MediaDeviceChecker({ onReady }: { onReady: (isReady: boolean) => void }) {
    const [hasCamera, setHasCamera] = useState<boolean | null>(null);
    const [hasMic, setHasMic] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        checkDevices();
        return () => {
            // Cleanup stream
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const checkDevices = async () => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

            setHasCamera(stream.getVideoTracks().length > 0);
            setHasMic(stream.getAudioTracks().length > 0);

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            if (stream.getVideoTracks().length > 0 && stream.getAudioTracks().length > 0) {
                onReady(true);
            } else {
                onReady(false);
            }

        } catch (err: any) {
            console.error("Media Error:", err);
            setHasCamera(false);
            setHasMic(false);
            setError("Could not access camera or microphone. Please allow permissions.");
            onReady(false);
        }
    };

    return (
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-4">System Check</h3>

            <div className="flex gap-6">
                {/* Video Preview */}
                <div className="w-48 h-36 bg-black rounded-lg overflow-hidden relative flex items-center justify-center">
                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                    {hasCamera === false && <p className="text-white text-xs absolute">No Camera</p>}
                </div>

                {/* Status List */}
                <div className="space-y-4 flex-1">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <VideoIcon className="w-5 h-5 text-gray-600" />
                            <span className="text-sm font-medium">Camera</span>
                        </div>
                        {hasCamera === null ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> :
                            hasCamera ? <CheckCircle className="w-5 h-5 text-green-500" /> :
                                <XCircle className="w-5 h-5 text-red-500" />}
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Mic className="w-5 h-5 text-gray-600" />
                            <span className="text-sm font-medium">Microphone</span>
                        </div>
                        {hasMic === null ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> :
                            hasMic ? <CheckCircle className="w-5 h-5 text-green-500" /> :
                                <XCircle className="w-5 h-5 text-red-500" />}
                    </div>

                    {error && (
                        <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                            {error}
                        </p>
                    )}

                    <button
                        onClick={checkDevices}
                        className="text-xs text-blue-600 hover:underline mt-2"
                    >
                        Retry Check
                    </button>
                </div>
            </div>
        </div>
    );
}
