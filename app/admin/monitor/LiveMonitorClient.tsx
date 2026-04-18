"use client";

import { useEffect, useState } from "react";
import { getActiveProctoringSessions } from "@/app/actions/proctoring";
import Link from "next/link";
import { Cpu, Eye, AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react";

/**
 * RecruitAI Live Monitor Client
 * 
 * Polling component to update assessment status in real-time.
 */
export default function LiveMonitorClient({ initialSessions }: { initialSessions: any[] }) {
    const [sessions, setSessions] = useState(initialSessions);
    const [loading, setLoading] = useState(false);
    const [lastSync, setLastSync] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(async () => {
            setLoading(true);
            try {
                const res = await getActiveProctoringSessions();
                if (res.sessions) {
                    setSessions(res.sessions);
                    setLastSync(new Date());
                }
            } catch (e) {
                console.error("Auto-sync failed:", e);
            } finally {
                setLoading(false);
            }
        }, 15000); // Poll every 15s

        return () => clearInterval(interval);
    }, []);

    const formatTime = (iso: string) => {
        const date = new Date(iso);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diff < 30) return "Just now";
        if (diff < 60) return `${diff}s ago`;
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const isSessionLive = (iso: string) => {
        const date = new Date(iso);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
        return diff < 60; // Alive if heartbeat in last 60s
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border">
                <div className="text-sm text-gray-500">
                    Auto-syncing every 15s • Last Sync: {lastSync.toLocaleTimeString()}
                </div>
                {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sessions.map((sess: any) => {
                    const isLive = isSessionLive(sess.last_heartbeat);
                    const assignment = sess.exam_assignments;
                    const exam = assignment?.exams;
                    const candidate = assignment?.applications;
                    const violations = sess.violations_summary || {};
                    const hasViolations = (violations.tab_switches > 0 || violations.fullscreen_exits > 0 || sess.is_flagged);

                    return (
                        <div key={sess.id} className={`bg-white rounded-xl shadow-md border-t-4 overflow-hidden transition-all hover:shadow-lg
                            ${isLive ? 'border-t-green-500' : 'border-t-gray-300 opacity-80'}
                            ${hasViolations ? 'border-l-4 border-l-red-500' : ''}
                        `}>
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900 truncate">{candidate?.full_name || "Unknown Candidate"}</h3>
                                        <p className="text-xs text-gray-500 truncate">{candidate?.email}</p>
                                    </div>
                                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider
                                        ${isLive ? 'bg-green-100 text-green-700 animate-pulse' : 'bg-gray-100 text-gray-500'}
                                    `}>
                                        {isLive ? 'LIVE' : 'OFFLINE'}
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-3 space-y-2 mb-4">
                                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Exam Progress</h4>
                                    <div className="flex justify-between text-xs font-semibold mb-1">
                                        <span>{exam?.title || "Technical Assessment"}</span>
                                        <span className="text-blue-600">Active</span>
                                    </div>
                                    <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                        <Loader2 className="w-2.5 h-2.5" /> Started: {new Date(assignment.started_at).toLocaleString()}
                                    </div>
                                    <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                        <Eye className="w-2.5 h-2.5" /> Last Heartbeat: {formatTime(sess.last_heartbeat)}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <div className="bg-amber-50 p-2 rounded border border-amber-100">
                                        <p className="text-[9px] text-amber-600 font-bold uppercase">Tab Switches</p>
                                        <p className="text-xl font-black text-amber-800">{violations.tab_switches || 0}</p>
                                    </div>
                                    <div className={`p-2 rounded border ${sess.is_flagged ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                                        <p className={`text-[9px] font-bold uppercase ${sess.is_flagged ? 'text-red-600' : 'text-green-600'}`}>Proctor Status</p>
                                        <p className={`text-xl font-black ${sess.is_flagged ? 'text-red-800' : 'text-green-800'}`}>
                                            {sess.is_flagged ? 'FLAGGED' : 'CLEAR'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-2 border-t pt-4">
                                    <Link 
                                        href={`/admin/candidates/${assignment.id}`}
                                        className="flex-1 bg-blue-600 text-white text-center py-2 rounded text-xs font-bold hover:bg-blue-700 transition"
                                    >
                                        View Details
                                    </Link>
                                    <button className="px-3 bg-red-100 text-red-600 rounded hover:bg-red-200 transition">
                                        <XCircle className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {sessions.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-white rounded-xl border border-dashed text-gray-400">
                        No active assessments monitored currently.
                    </div>
                )}
            </div>
        </div>
    );
}
