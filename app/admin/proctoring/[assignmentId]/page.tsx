import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function ProctoringReviewPage({ params }: { params: Promise<{ assignmentId: string }> }) {
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

    // 2. Fetch Recording
    const { data: recording } = await supabaseAdmin
        .from('exam_recordings')
        .select('*')
        .eq('exam_assignment_id', assignmentId)
        .single();

    // 3. Fetch Logs
    const { data: logs } = await supabaseAdmin
        .from('exam_proctor_logs')
        .select('*')
        .eq('exam_assignment_id', assignmentId)
        .order('created_at', { ascending: true });

    // 4. Generate Signed URL for Video
    let videoUrl = null;
    if (recording?.video_path) {
        const { data } = await supabaseAdmin
            .storage
            .from('exam-recordings')
            .createSignedUrl(recording.video_path, 3600); // 1 hour link
        videoUrl = data?.signedUrl;
    }

    // Calculate details
    const violations = logs?.filter(l => l.event_type !== 'INFO').length || 0;
    const tabSwitches = logs?.filter(l => l.event_type === 'TAB_SWITCH').length || 0;
    const fsExits = logs?.filter(l => l.event_type === 'FULLSCREEN_EXIT').length || 0;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <Link href={`/admin/exams/${assignment.exam_id}`} className="text-blue-600 hover:underline mb-2 block text-sm">
                        &larr; Back to Exam
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-800">Proctoring Review</h1>
                    <p className="text-gray-600">
                        Candidate: <strong>{assignment.candidate_profiles?.full_name}</strong> • Exam: {assignment.exams?.title}
                    </p>
                </div>
                <div className="flex gap-4">
                    <span className={`px-4 py-2 rounded-lg font-bold border ${violations > 3 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'
                        }`}>
                        Risk Level: {violations > 3 ? 'HIGH' : violations > 0 ? 'MODERATE' : 'LOW'}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main: Video Player */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-black rounded-xl overflow-hidden shadow-lg aspect-video flex items-center justify-center relative">
                        {videoUrl ? (
                            <video
                                src={videoUrl}
                                controls
                                className="w-full h-full"
                                preload="metadata"
                            />
                        ) : (
                            <div className="text-white text-center">
                                <p className="text-lg">No recording available.</p>
                                <p className="text-sm text-gray-400">Candidate might not have uploaded video or permissions were denied.</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-white p-6 rounded-xl border shadow-sm">
                        <h3 className="font-bold text-lg mb-4">Proctoring Stats</h3>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="text-2xl font-bold text-gray-800">{tabSwitches}</div>
                                <div className="text-xs uppercase text-gray-500 font-bold">Tab Switches</div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="text-2xl font-bold text-gray-800">{fsExits}</div>
                                <div className="text-xs uppercase text-gray-500 font-bold">Fullscreen Exits</div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="text-2xl font-bold text-gray-800">{logs?.length}</div>
                                <div className="text-xs uppercase text-gray-500 font-bold">Total Events</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar: Log Timeline */}
                <div className="bg-white rounded-xl border shadow-sm flex flex-col h-[600px]">
                    <div className="p-4 border-b bg-gray-50">
                        <h3 className="font-bold text-gray-800">Event Timeline</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {logs && logs.length > 0 ? logs.map((log) => (
                            <div key={log.id} className="flex gap-3 text-sm">
                                <div className="text-xs font-mono text-gray-400 shrink-0 pt-1">
                                    {new Date(log.created_at).toLocaleTimeString()}
                                </div>
                                <div>
                                    <div className={`font-bold ${log.event_type === 'TAB_SWITCH' ? 'text-orange-600' :
                                            log.event_type === 'FULLSCREEN_EXIT' ? 'text-red-600' :
                                                'text-gray-800'
                                        }`}>
                                        {log.event_type.replace(/_/g, ' ')}
                                    </div>
                                    {log.details && Object.keys(log.details).length > 0 && (
                                        <div className="text-xs text-gray-500 mt-1">
                                            {JSON.stringify(log.details)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )) : (
                            <div className="text-center text-gray-400 py-10">
                                No events recorded.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
