"use client";

import { useEffect, useState, useRef } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { useParams } from "next/navigation"; // Correct for Client Components
import Link from "next/link";
import { ArrowLeft, RefreshCw, AlertTriangle, Play, Pause, XCircle, MoreVertical, Wifi, WifiOff } from "lucide-react";
import { getExamCandidates } from "@/app/actions/admin"; // We need this action

interface Candidate {
    id: string;
    full_name: string;
    email: string;
    status: 'assigned' | 'in_progress' | 'completed' | 'passed' | 'failed';
    last_heartbeat?: number;
    violations: {
        tab_switches: number;
        fullscreen_exits: number;
    };
    is_live: boolean;
    mobile_live: boolean;
}

export default function ExamMonitorPage() {
    const params = useParams(); // { id: string }
    const examId = params.id as string;

    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const supabase = supabaseClient;

    useEffect(() => {
        if (!examId) return;
        fetchCandidates();
        const channel = setupRealtime();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [examId]);

    const fetchCandidates = async () => {
        setLoading(true);
        // We'll need to create this action or fetch directly
        // For now, let's mock or use a placeholder call
        // const res = await getExamCandidates(examId);
        // if (res.success) setCandidates(res.candidates);
        setLoading(false);
    };

    const setupRealtime = () => {
        const channel = supabase.channel(`proctor-${examId}`);

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                console.log('Presence Sync:', state);
                // Update online status based on presence
            })
            .on('broadcast', { event: 'heartbeat' }, (payload: any) => {
                updateCandidateHeartbeat(payload.payload.userId, false);
            })
            .on('broadcast', { event: 'mobile-heartbeat' }, (payload: any) => {
                updateCandidateHeartbeat(payload.payload.userId, true);
            })
            .on('broadcast', { event: 'violation' }, (payload: any) => {
                const { userId, type } = payload.payload;
                addLog(userId, `Violation: ${type}`);
                updateCandidateViolation(userId, type);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // Admin presense (optional)
                }
            });

        return channel;
    };

    const updateCandidateHeartbeat = (userId: string, isMobile: boolean) => {
        setCandidates(prev => prev.map(c => {
            if (c.id === userId) {
                return {
                    ...c,
                    is_live: !isMobile ? true : c.is_live,
                    mobile_live: isMobile ? true : c.mobile_live,
                    last_heartbeat: Date.now()
                };
            }
            return c;
        }));
    };

    const updateCandidateViolation = (userId: string, type: string) => {
        setCandidates(prev => prev.map(c => {
            if (c.id === userId) {
                return {
                    ...c,
                    violations: {
                        ...c.violations,
                        tab_switches: type === 'tab_switch' ? c.violations.tab_switches + 1 : c.violations.tab_switches,
                        fullscreen_exits: type === 'fullscreen_exit' ? c.violations.fullscreen_exits + 1 : c.violations.fullscreen_exits
                    }
                };
            }
            return c;
        }));
    };

    const addLog = (userId: string, message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [{ userId, message, timestamp }, ...prev].slice(0, 50));
    };

    const sendCommand = async (command: 'pause' | 'resume' | 'terminate', userId: string) => {
        const channel = supabase.channel(`proctor-${examId}`);
        await channel.send({
            type: 'broadcast',
            event: 'admin-command',
            payload: { command, userId }
        });
        addLog(userId, `Admin Command: ${command.toUpperCase()}`);
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <header className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href={`/admin/exams/${examId}`} className="p-2 hover:bg-gray-200 rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Live Proctoring Dashboard</h1>
                        <p className="text-sm text-gray-500">Exam ID: {examId}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                        <Wifi className="w-4 h-4" /> Live
                    </span>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Main List */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="font-bold text-gray-700">Active Candidates</h2>
                            <button onClick={fetchCandidates} className="text-blue-600 hover:bg-blue-50 p-1 rounded">
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>

                        {loading && <div className="p-8 text-center text-gray-500">Loading candidates...</div>}

                        {!loading && candidates.length === 0 && (
                            <div className="p-8 text-center text-gray-500">No candidates assigned to this exam yet.</div>
                        )}

                        <div className="divide-y divide-gray-100">
                            {candidates.map(candidate => (
                                <div key={candidate.id} className="p-4 flex flex-col gap-4 hover:bg-gray-50 border-b border-gray-100 last:border-0 relative">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-3 h-3 rounded-full ${candidate.is_live ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-gray-300'}`} />
                                            <div>
                                                <p className="font-bold text-gray-900 text-lg">{candidate.full_name}</p>
                                                <p className="text-xs text-gray-500 font-mono">{candidate.email}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => sendCommand('pause', candidate.id)}
                                                className="px-3 py-1.5 text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100 rounded flex items-center gap-1 transition" title="Pause Exam">
                                                <Pause className="w-3 h-3" /> Pause
                                            </button>
                                            <button
                                                onClick={() => sendCommand('resume', candidate.id)}
                                                className="px-3 py-1.5 text-xs font-bold text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 rounded flex items-center gap-1 transition" title="Resume Exam">
                                                <Play className="w-3 h-3" /> Resume
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm('Are you sure you want to TERMINATE this exam session?')) {
                                                        sendCommand('terminate', candidate.id);
                                                    }
                                                }}
                                                className="px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded flex items-center gap-1 transition" title="Terminate Exam">
                                                <XCircle className="w-3 h-3" /> Terminate
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex gap-6">
                                        {/* Left: Snapshot Feed */}
                                        <div className="w-48 h-28 bg-black rounded-lg overflow-hidden border border-gray-300 relative group">
                                            {candidate.is_live ? (
                                                <LiveSnapshot examId={examId} userId={candidate.id} />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 text-xs">
                                                    <WifiOff className="w-6 h-6 mb-1 opacity-50" />
                                                    Offline
                                                </div>
                                            )}
                                            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded backdrop-blur-sm">
                                                Live Feed
                                            </div>
                                        </div>

                                        {/* Right: Stats & Mobile */}
                                        <div className="flex-1 grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <p className="text-xs font-bold text-gray-500 uppercase">Violations</p>
                                                <div className="flex flex-wrap gap-2">
                                                    <div className={`px-3 py-1.5 rounded border text-xs font-bold flex items-center gap-2 ${candidate.violations.tab_switches > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                                                        <span>Tabs:</span>
                                                        <span className="text-sm">{candidate.violations.tab_switches}</span>
                                                    </div>
                                                    <div className={`px-3 py-1.5 rounded border text-xs font-bold flex items-center gap-2 ${candidate.violations.fullscreen_exits > 0 ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                                                        <span>Screen:</span>
                                                        <span className="text-sm">{candidate.violations.fullscreen_exits}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <p className="text-xs font-bold text-gray-500 uppercase">Input Sources</p>
                                                <div className="space-y-1">
                                                    <div className={`flex items-center gap-2 text-xs font-medium ${candidate.is_live ? 'text-green-700' : 'text-gray-400'}`}>
                                                        <div className={`w-2 h-2 rounded-full ${candidate.is_live ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                        Laptop Camera
                                                    </div>
                                                    <div className={`flex items-center gap-2 text-xs font-medium ${candidate.mobile_live ? 'text-green-700' : 'text-gray-400'}`}>
                                                        <div className={`w-2 h-2 rounded-full ${candidate.mobile_live ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                        Mobile Camera (Third Eye)
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar Logs */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow border border-gray-200 h-[600px] flex flex-col">
                        <div className="p-3 border-b border-gray-100 bg-gray-50 font-bold text-sm text-gray-700">
                            Live Activity Log
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {logs.length === 0 && <p className="text-gray-400 text-xs text-center mt-10">No logs yet...</p>}
                            {logs.map((log, i) => (
                                <div key={i} className="text-xs border-b border-gray-50 pb-2">
                                    <div className="flex justify-between text-gray-400 mb-1">
                                        <span>Candidate: {log.userId.slice(0, 5)}...</span>
                                        <span>{log.timestamp}</span>
                                    </div>
                                    <p className={`font-medium ${log.message.includes('Violation') ? 'text-red-600' : 'text-blue-600'}`}>
                                        {log.message}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- SUBCOMPONENTS ---

function LiveSnapshot({ examId, userId }: { examId: string, userId: string }) {
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchLatest = async () => {
            const { data } = await supabaseClient
                .storage
                .from('proctor_snapshots')
                .list(`${examId}/${userId}`, {
                    limit: 1,
                    sortBy: { column: 'created_at', order: 'desc' },
                });

            if (data && data.length > 0) {
                const path = `${examId}/${userId}/${data[0].name}`;
                const { data: publicUrlData } = supabaseClient.storage.from('proctor_snapshots').getPublicUrl(path);
                setUrl(`${publicUrlData.publicUrl}?t=${Date.now()}`); // Cache bust
            }
        };

        fetchLatest();
        const interval = setInterval(fetchLatest, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, [examId, userId]);

    if (!url) return <div className="w-full h-full bg-gray-900 animate-pulse flex items-center justify-center text-gray-700 text-xs">Waiting...</div>;

    return (
        <img src={url} alt="Live Feed" className="w-full h-full object-cover" />
    );
}
