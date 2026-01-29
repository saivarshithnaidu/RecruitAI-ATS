"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { WebRTCSignaling } from "@/lib/webrtc-signaling";
import { User, Smartphone, AlertTriangle } from "lucide-react";

export default function LiveMonitorPage() {
    const params = useParams();
    const assignmentId = params.assignmentId as string; // Wait, we might need examId. 
    // Usually admin monitors by Exam or Assignment. The channel is `proctor-${examId}`.
    // If I only have assignmentId, I need to fetch examId first.

    // For simplicity, let's assume we can fetch assignment details.

    const [examId, setExamId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("Connecting...");

    // Streams
    const [mobileStream, setMobileStream] = useState<MediaStream | null>(null);
    const mobileVideoRef = useRef<HTMLVideoElement>(null);

    const peerRef = useRef<RTCPeerConnection | null>(null);
    const signalingRef = useRef<WebRTCSignaling | null>(null);
    const supabase = supabaseClient;

    useEffect(() => {
        if (!assignmentId) return;

        // Fetch Exam ID
        const fetchDetails = async () => {
            const { data } = await supabase
                .from('exam_assignments')
                .select('exam_id')
                .eq('id', assignmentId)
                .single();

            if (data) {
                setExamId(data.exam_id);
            } else {
                setStatus("Assignment not found");
            }
            setLoading(false);
        };

        fetchDetails();
    }, [assignmentId]);

    useEffect(() => {
        if (!examId) return;

        const channel = supabase.channel(`proctor-${examId}`);
        const userId = "admin-monitor"; // Admin ID

        const signaling = new WebRTCSignaling(channel, userId, async (msg) => {
            if (msg.type === 'offer') {
                await handleOffer(msg.senderId, msg.sdp, signaling);
            }
            if (msg.type === 'candidate' && peerRef.current) {
                await peerRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate));
            }
        });

        signalingRef.current = signaling;

        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                setStatus("Live - Waiting for streams...");
                // Announce presence so mobile initiates
                signaling.sendReady('host');
            }
        });

        return () => {
            supabase.removeChannel(channel);
            if (peerRef.current) peerRef.current.close();
        };

    }, [examId]);

    // Attach stream
    useEffect(() => {
        if (mobileVideoRef.current && mobileStream) {
            mobileVideoRef.current.srcObject = mobileStream;
        }
    }, [mobileStream]);

    const handleOffer = async (senderId: string, sdp: RTCSessionDescriptionInit, signaling: WebRTCSignaling) => {
        // We only support 1 peer (Mobile) for now demo. 
        // In real app, map senderId to stream.

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
            console.log("Stream received!");
            setMobileStream(event.streams[0]);
            setStatus("Streaming Active");
        };

        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        signaling.sendAnswer(senderId, answer);

        peerRef.current = pc;
    };

    if (loading) return <div className="p-8">Loading monitor...</div>;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <User className="w-6 h-6" /> Live Proctoring
                </h1>
                <div className="text-sm font-mono px-3 py-1 bg-gray-800 rounded border border-gray-700">
                    STATUS: <span className={status.includes("Active") ? "text-green-400" : "text-yellow-400"}>{status}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Secondary Cam (Mobile) */}
                <div className="bg-black rounded-xl overflow-hidden border border-gray-700 relative aspect-video shadow-2xl">
                    <div className="absolute top-4 left-4 z-10 bg-black/60 px-2 py-1 rounded text-xs flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-blue-400" />
                        Mobile View (Third Eye)
                    </div>
                    {mobileStream ? (
                        <video ref={mobileVideoRef} autoPlay playsInline controls className="w-full h-full object-contain" />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500 flex-col gap-2">
                            <div className="animate-pulse w-12 h-12 rounded-full bg-gray-800"></div>
                            <p>Waiting for Mobile Stream...</p>
                        </div>
                    )}
                </div>

                {/* Primary Cam (Placeholder for now, same logic applies) */}
                <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 relative aspect-video flex items-center justify-center opacity-50">
                    <p className="text-gray-400 text-center px-8">
                        Laptop Camera Stream <br />
                        <span className="text-sm">(To be implemented via same PeerConnection or separate ID)</span>
                    </p>
                </div>
            </div>

            <div className="mt-8 bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h3 className="font-bold flex items-center gap-2 mb-2 text-yellow-500">
                    <AlertTriangle className="w-4 h-4" /> Real-time Events
                </h3>
                <div className="h-40 overflow-y-auto font-mono text-sm space-y-1 text-gray-400">
                    <p>[10:42:01] Monitor session initialized.</p>
                    <p>[10:42:05] Connected to exam channel.</p>
                    {status.includes("Active") && <p className="text-green-400">[Now] Stream connected successfully.</p>}
                </div>
            </div>
        </div>
    );
}
