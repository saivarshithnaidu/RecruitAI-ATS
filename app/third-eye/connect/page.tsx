"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { WebRTCSignaling } from "@/lib/webrtc-signaling";

export default function MobileConnectPage() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    // Status
    const [status, setStatus] = useState<'validating' | 'ready' | 'connected' | 'error'>('validating');
    const [stream, setStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const peerRef = useRef<RTCPeerConnection | null>(null);
    const signalingRef = useRef<WebRTCSignaling | null>(null);
    const supabase = supabaseClient;

    const [debugInfo, setDebugInfo] = useState<string>("");

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setDebugInfo("No token provided");
            return;
        }

        // Validate Token with Backend
        validateToken(token);

        return () => {
            if (stream) stream.getTracks().forEach(t => t.stop());
            if (peerRef.current) peerRef.current.close();
            if (signalingRef.current) signalingRef.current.channel.unsubscribe();
        }
    }, [token]);

    const validateToken = async (t: string) => {
        try {
            const res = await fetch('/api/proctor/mobile-auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: t })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setStatus('ready');
                const s = await startCamera();
                if (s) setupRealtime(data.examId, data.userId, s);
            } else {
                setStatus('error');
                setDebugInfo(data.error || "Invalid Token");
            }
        } catch (e: any) {
            setStatus('error');
            setDebugInfo(e.message);
        }
    };

    const startCamera = async () => {
        try {
            const s = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
                audio: false
            });
            setStream(s);
            if (videoRef.current) videoRef.current.srcObject = s;
            return s;
        } catch (e: any) {
            console.error("Camera Error", e);
            setDebugInfo("Camera access denied: " + e.message);
            return null;
        }
    };

    const setupRealtime = (examId: string, userId: string, mediaStream: MediaStream) => {
        const channel = supabase.channel(`proctor-${examId}`);

        const signaling = new WebRTCSignaling(channel, userId, async (msg) => {
            // Handle Incoming Signals
            console.log("Received Signal:", msg.type);

            if (msg.type === 'ready' && msg.role === 'host') { // Host = Admin watching
                // Admin joined, initiate connection
                setStatus('connected');
                createPeerConnection(msg.senderId, mediaStream, signaling);
            }

            if (msg.type === 'answer' && peerRef.current) {
                await peerRef.current.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            }

            if (msg.type === 'candidate' && peerRef.current) {
                await peerRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate));
            }
        });

        signalingRef.current = signaling;

        channel
            .on('broadcast', { event: 'ping-admin' }, (payload: any) => {
                channel.send({
                    type: 'broadcast',
                    event: 'pong-mobile',
                    payload: { userId, status: 'alive' }
                });
            })
            .subscribe((status: string) => {
                if (status === 'SUBSCRIBED') {
                    // Announce presence
                    channel.send({
                        type: 'broadcast',
                        event: 'mobile-connected',
                        payload: { userId }
                    });

                    // Also announce WebRTC readiness as 'viewer' (technically mobile is source, but role naming...)
                    // Let's us 'viewer' means mobile camera source? No.
                    // 'ready' usually means "I am here".
                    signaling.sendReady('viewer');
                }
            });
    };

    const createPeerConnection = async (targetId: string, mediaStream: MediaStream, signaling: WebRTCSignaling) => {
        if (peerRef.current) peerRef.current.close();

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        // Add Tracks
        mediaStream.getTracks().forEach(track => pc.addTrack(track, mediaStream));

        // ICE Candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                signaling.sendCandidate(targetId, event.candidate);
            }
        };

        // Create Offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        signaling.sendOffer(targetId, offer);

        peerRef.current = pc;
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
            {status === 'validating' && <div className="animate-pulse">Connecting to Secure Exam Environment...</div>}

            {status === 'error' && (
                <div className="bg-red-900/50 p-6 rounded text-center border border-red-500">
                    <h1 className="text-xl font-bold mb-2">Connection Failed</h1>
                    <p>{debugInfo}</p>
                </div>
            )}

            {(status === 'ready' || status === 'connected') && (
                <div className="relative w-full h-full flex flex-col items-center">
                    <div className="absolute top-4 left-4 z-10 bg-black/50 px-3 py-1 rounded text-xs backdrop-blur-md border border-white/10">
                        Status: <span className="text-green-400 font-bold uppercase">{status}</span>
                        {status === 'connected' && <span className="text-blue-400 ml-2 animate-pulse">● Live</span>}
                    </div>

                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-auto max-h-[80vh] object-contain border-2 border-gray-800 rounded-lg"
                    />

                    <div className="mt-4 text-center text-sm text-gray-400">
                        <p className="mb-2">Place phone to side showing your face + screen.</p>
                        <p className="text-xs opacity-50">Do not lock screen.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
