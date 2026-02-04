'use client';

import { useEffect, useState } from 'react';
import { getActiveProctoringSessions } from '@/app/actions/proctoring';
import LiveMonitorClient from '@/components/admin/LiveMonitorClient';

export default function ProctoringDashboard() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = async () => {
        setLoading(true);
        const res = await getActiveProctoringSessions();
        if (res.sessions) {
            setSessions(res.sessions);
        }
        setLoading(false);
    };

    useEffect(() => {
        refresh();
        const interval = setInterval(refresh, 10000); // Auto-refresh 10s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Live Proctoring Center
                </h1>
                <div className="flex gap-2">
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-bold animate-pulse">
                        {sessions.length} Active
                    </span>
                    <button onClick={() => refresh()} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition text-sm">
                        Refresh
                    </button>
                </div>
            </div>

            {loading && sessions.length === 0 ? (
                <div className="text-gray-500">Loading active sessions...</div>
            ) : sessions.length === 0 ? (
                <div className="p-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-gray-400">
                    <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    <p>No active exams currently.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sessions.map(s => {
                        const candidateName = s.exam_assignments?.applications?.full_name || 'Candidate';
                        const examTitle = s.exam_assignments?.exams?.title || 'Exam';

                        return (
                            <div key={s.id} className="bg-white rounded-xl shadow-lg border overflow-hidden flex flex-col h-[400px]">
                                <div className="p-4 bg-gray-50 border-b flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-gray-800 truncate" title={candidateName}>{candidateName}</h3>
                                        <p className="text-xs text-gray-500 truncate" title={examTitle}>{examTitle}</p>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        {s.status === 'active'
                                            ? <span className="text-[10px] uppercase font-bold text-green-600 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span> Live</span>
                                            : <span className="text-[10px] uppercase font-bold text-gray-400">{s.status}</span>
                                        }
                                        <span className="text-[10px] text-gray-400 mt-1">
                                            Logs: {s.log_count || 0}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex-1 bg-black relative">
                                    <LiveMonitorClient
                                        examId={s.exam_assignments?.id}
                                        candidateId={s.exam_assignments?.candidate_id}
                                        candidateName={candidateName}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
