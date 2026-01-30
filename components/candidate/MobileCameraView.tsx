"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { Camera, Wifi, WifiOff, AlertTriangle } from "lucide-react";

interface MobileCameraViewProps {
    examId: string;
    userId: string;
}

export default function MobileCameraView({ examId, userId }: MobileCameraViewProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const [cameraError, setCameraError] = useState("");
    const supabase = supabaseClient;

    // 1. Setup Camera
    useEffect(() => {
        const startCamera = async () => {
            try {
                // Prefer back camera ("environment")
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment" },
                    audio: false // Audio handled by laptop usually, but we can enable if needed
                });
                setStream(stream);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err: any) {
                console.error("Camera Error:", err);
                setCameraError("Could not access camera. Please allow permissions.");
                setStatus('error');
            }
        };

        startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    // 2. Setup Realtime & Heartbeat
    useEffect(() => {
        if (!stream) return;

        const channel = supabase.channel(`proctor-${examId}`);

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                setStatus('connected');
                // Initial handshake
                await channel.send({
                    type: 'broadcast',
                    event: 'mobile-connected',
                    payload: { userId }
                });
            } else {
                setStatus('error');
            }
        });

        // Loop: Heartbeat every 2s
        const interval = setInterval(async () => {
            if (status === 'connected' || channel.state === 'joined') {
                await channel.send({
                    type: 'broadcast',
                    event: 'mobile-heartbeat',
                    payload: { userId, timestamp: Date.now() }
                });
            }
        }, 2000);

        return () => {
            // Notify disconnect
            channel.send({
                type: 'broadcast',
                event: 'mobile-disconnected',
                payload: { userId }
            });
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [stream, examId, userId]);


    if (cameraError) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">Camera Error</h2>
                <p className="text-gray-400">{cameraError}</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black relative flex flex-col">
            {/* Live Feed */}
            <div className="flex-1 relative overflow-hidden">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Overlay Status */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                    <div className="bg-black/50 backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
                        {status === 'connected' ? (
                            <>
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                </span>
                                <span className="text-xs font-bold text-green-400">LIVE</span>
                            </>
                        ) : (
                            <>
                                <WifiOff className="w-3 h-3 text-red-500" />
                                <span className="text-xs font-bold text-red-400">Offline</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Center Guidelines */}
                <div className="absolute inset-0 pointer-events-none border-2 border-white/20 m-8 rounded-lg flex items-center justify-center">
                    <div className="text-white/30 text-xs uppercase tracking-widest text-center px-4">
                        Keep screen & candidate in view
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="bg-gray-900 p-6 pt-4 pb-8 border-t border-gray-800">
                <h3 className="text-white font-bold text-lg mb-1 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-blue-500" />
                    Third-Eye Active
                </h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                    This phone is monitoring your exam session.
                    <br />
                    <strong>Do not close this tab or lock your phone.</strong>
                </p>
            </div>
        </div>
    );
}
