'use client';

import { useEffect, useRef, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient'; // Ensure client usage
import { WebRTCSignaling } from '@/lib/webrtc-signaling';

interface LiveMonitorProps {
    examId: string;
    assignmentId: string;
    candidateId: string; // auth user id
}

export default function LiveMonitorClient({ examId, assignmentId, candidateId }: LiveMonitorProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const peerRef = useRef<RTCPeerConnection | null>(null);
    const signalingRef = useRef<WebRTCSignaling | null>(null);
    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

    useEffect(() => {
        const channel = supabaseClient.channel(`proctor-${examId}`);
        const userId = 'admin-viewer'; // Arbitrary ID for admin

        const signaling = new WebRTCSignaling(channel, userId, async (msg) => {
            console.log("Admin Received:", msg.type, msg);

            if (msg.type === 'ready' && msg.role === 'viewer') {
                // Mobile just joined/viewing, potentially we are the host?
                // Actually, looking at ConnectContent, it waits for 'host' to say ready. 
                // We should announce ourselves as 'host'.
            }

            if (msg.type === 'offer') {
                await handleOffer(msg.senderId, msg.sdp, signaling);
            }

            if (msg.type === 'candidate' && peerRef.current) {
                await peerRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate));
            }
        });

        // Announce presence as HOST
        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                setStatus('connecting');
                signaling.sendReady('host');
            }
        });

        signalingRef.current = signaling;

        return () => {
            channel.unsubscribe();
            if (peerRef.current) peerRef.current.close();
            // Stop tracks if any
        };
    }, [examId]);

    const handleOffer = async (senderId: string, sdp: RTCSessionDescriptionInit, signaling: WebRTCSignaling) => {
        console.log("Handling Offer from", senderId);

        if (peerRef.current) peerRef.current.close();

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                signaling.sendCandidate(senderId, event.candidate);
            }
        };

        pc.ontrack = (event) => {
            console.log("Received Track", event.streams);
            if (videoRef.current && event.streams[0]) {
                videoRef.current.srcObject = event.streams[0];
                setStatus('connected');
            }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        signaling.sendAnswer(senderId, answer);
        peerRef.current = pc;
    };

    return (
        <div className="relative w-full h-full bg-black rounded-xl overflow-hidden flex items-center justify-center">
            {status !== 'connected' && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 z-10">
                    <div className="text-center">
                        <p className="animate-pulse mb-2">{status === 'connecting' ? 'Waiting for Mobile...' : 'Disconnected'}</p>
                        <p className="text-xs">Ensure candidate has scanned QR code.</p>
                    </div>
                </div>
            )}

            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted // Mute to avoid feedback loop if testing locally
                className="w-full h-full object-contain"
            />

            <div className="absolute top-2 left-2 z-20 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                MOBILE (360°)
            </div>

            <div className="absolute bottom-2 right-2 z-20">
                <div className={`w-3 h-3 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-red-500'} border-2 border-white`}></div>
            </div>
        </div>
    );
}
