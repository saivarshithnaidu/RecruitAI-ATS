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

    // LOGS STATE
    const [logs, setLogs] = useState<any[]>([]);

    useEffect(() => {
        if (!assignmentId) return;

        // 1. Initial Fetch
        const fetchLogs = async () => {
            const { data } = await supabase
                .from('exam_proctor_logs')
                .select('*')
                .eq('exam_assignment_id', assignmentId)
                .order('created_at', { ascending: false })
                .limit(50);
            
            if (data) setLogs(data);
        };
        fetchLogs();

        // 2. Realtime Subscription
        const channel = supabase
            .channel(`logs-${assignmentId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'exam_proctor_logs',
                    filter: `exam_assignment_id=eq.${assignmentId}`
                },
                (payload) => {
                    setLogs(prev => [payload.new, ...prev].slice(0, 50));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [assignmentId]);

    const formatTime = (iso: string) => {
        return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    if (loading) return <div className="p-8">Loading monitor...</div>;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <User className="w-6 h-6" /> Live Proctoring
                </h1>
                <div className="flex gap-4 items-center">
                   <div className="text-xs font-mono px-3 py-1 bg-gray-800 rounded border border-gray-700 uppercase">
                        ID: {assignmentId.slice(0, 8)}...
                    </div>
                    <div className="text-sm font-mono px-3 py-1 bg-gray-800 rounded border border-gray-700">
                        STATUS: <span className={status.includes("Active") ? "text-green-400" : "text-yellow-400"}>{status}</span>
                    </div>
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

                {/* Violation Summary Card */}
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        AI Violation Summary
                    </h3>
                    <div className="grid grid-cols-2 gap-4 flex-1">
                        <div className="p-4 bg-gray-900 rounded-lg border border-gray-700 text-center">
                            <div className="text-3xl font-bold text-red-500">{logs.filter(l => l.event_type === 'TAB_SWITCH').length}</div>
                            <div className="text-xs text-gray-500 uppercase mt-1">Tab Switches</div>
                        </div>
                        <div className="p-4 bg-gray-900 rounded-lg border border-gray-700 text-center">
                            <div className="text-3xl font-bold text-orange-500">{logs.filter(l => l.event_type === 'FULLSCREEN_EXIT').length}</div>
                            <div className="text-xs text-gray-500 uppercase mt-1">Fullscreen Exits</div>
                        </div>
                         <div className="p-4 bg-gray-900 rounded-lg border border-gray-700 text-center col-span-2">
                            <div className="text-xl font-bold text-blue-400">
                                {logs.find(l => l.event_type === 'HEARTBEAT')?.details?.timeLeft ? 
                                    Math.floor(logs.find(l => l.event_type === 'HEARTBEAT').details.timeLeft / 60) + "m remaining" 
                                    : "---"}
                            </div>
                            <div className="text-xs text-gray-500 uppercase mt-1">Candidate Time Status</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h3 className="font-bold flex items-center gap-2 mb-4 text-yellow-500">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full animate-ping"></span>
                    Live Activity Feed
                </h3>
                <div className="h-64 overflow-y-auto font-mono text-xs space-y-2 pr-4 custom-scrollbar">
                    {logs.length === 0 && <p className="text-gray-600 italic">Waiting for activity...</p>}
                    {logs.map((log) => (
                        <div key={log.id} className={`flex gap-4 p-2 rounded transition-colors ${
                            log.event_type === 'TAB_SWITCH' ? 'bg-red-900/20 text-red-400' :
                            log.event_type === 'FULLSCREEN_EXIT' ? 'bg-orange-900/20 text-orange-400' :
                            'bg-gray-900/50 text-gray-400'
                        }`}>
                            <span className="opacity-50 shrink-0">[{formatTime(log.created_at)}]</span>
                            <span className="font-bold w-32 shrink-0">{log.event_type}</span>
                            <span className="break-all">{JSON.stringify(log.details)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
