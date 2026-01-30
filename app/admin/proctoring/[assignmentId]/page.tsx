import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Link from "next/link";
import ProctorControls from "@/components/admin/ProctorControls";
import LiveMonitorClient from "@/components/admin/LiveMonitorClient";

export const dynamic = 'force-dynamic';

export default async function ProctoringLivePage({ params }: { params: Promise<{ assignmentId: string }> }) {
    const { assignmentId } = await params;

    // 1. Fetch Assignment Details
    const { data: assignment, error } = await supabaseAdmin
        .from('exam_assignments')
        .select(`
            *,
            exams (title),
            candidate_profiles (full_name, email)
        `)
        .eq('id', assignmentId)
        .single();

    if (error || !assignment) {
        return <div className="p-8">Assignment not found</div>;
    }

    // 2. Fetch Logs
    const { data: logs } = await supabaseAdmin
        .from('exam_proctor_logs')
        .select('*')
        .eq('exam_assignment_id', assignmentId)
        .order('created_at', { ascending: false }); // Newest first for timeline

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-6 border-b">
                <div>
                    <Link href={`/admin/exams/${assignment.exam_id}`} className="text-blue-600 hover:underline mb-1 block text-sm">
                        &larr; Back to Exam
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-800">
                        Live Monitor: <span className="text-blue-600">{assignment.candidate_profiles?.full_name}</span>
                    </h1>
                    <p className="text-gray-500">
                        {assignment.exams?.title} • Started: {new Date(assignment.started_at).toLocaleString()}
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-sm text-gray-400">Assignment ID</div>
                    <div className="font-mono text-xs">{assignment.id}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Live Feeds */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Laptop Camera Feed */}
                    <div className="bg-black rounded-xl overflow-hidden shadow-lg border border-gray-800 relative aspect-video group">
                        <div className="absolute top-4 left-4 z-10 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">
                            LIVE
                        </div>

                        {/* 
                            Placeholder for Laptop Live Stream. 
                            In a real implementation, this would also use WebRTC or a snapshot stream.
                            For now, keeping as placeholder or could reuse LiveMonitorClient if laptop also sends WebRTC.
                        */}
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                            <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <p>Waiting for laptop stream...</p>
                        </div>

                        {/* Overlays */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                            <div className="flex justify-between items-end">
                                <div className="text-white">
                                    <div className="text-sm font-bold">Laptop Camera</div>
                                    <div className="text-xs text-gray-300">Signal: <span className="text-green-400">Good</span></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Camera Feed (Smaller) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black rounded-xl overflow-hidden aspect-video relative border border-gray-800">
                            {/* Live Mobile Receiver */}
                            <LiveMonitorClient
                                examId={assignment.exam_id}
                                assignmentId={assignmentId}
                                candidateId={assignment.candidate_id}
                            />
                        </div>
                        <div className="bg-white rounded-xl border p-4 shadow-sm">
                            <h3 className="font-bold text-gray-700 mb-2">System Status</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Browser Focus</span>
                                    <span className="text-green-600 font-bold">Active</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Internet</span>
                                    <span className="text-green-600 font-bold">Stable</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Location</span>
                                    <span className="text-gray-500">Bangalore, IN</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Controls & Logs */}
                <div className="space-y-6">
                    {/* Controls */}
                    <ProctorControls
                        assignmentId={assignmentId}
                        currentStatus={assignment.admin_status}
                    />

                    {/* Timeline */}
                    <div className="bg-white rounded-xl border shadow-sm flex flex-col h-[500px]">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800">Violation Log</h3>
                            <span className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-600">
                                {logs?.length || 0} Events
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {logs && logs.length > 0 ? logs.map((log) => (
                                <div key={log.id} className="flex gap-3 text-sm border-l-2 border-gray-200 pl-3 pb-2">
                                    <div className="text-xs font-mono text-gray-400 shrink-0 pt-0.5">
                                        {new Date(log.created_at).toLocaleTimeString()}
                                    </div>
                                    <div>
                                        <div className={`font-bold text-xs uppercase mb-1 ${log.event_type.includes('TAB') ? 'text-orange-600' :
                                            log.event_type.includes('ADMIN') ? 'text-blue-600' :
                                                'text-gray-800'
                                            }`}>
                                            {log.event_type.replace(/_/g, ' ')}
                                        </div>
                                        {log.details && (
                                            <div className="text-xs text-gray-500 bg-gray-50 p-1.5 rounded truncate max-w-[180px]">
                                                {JSON.stringify(log.details)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center text-gray-400 py-10 text-sm">
                                    No violations detected yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
