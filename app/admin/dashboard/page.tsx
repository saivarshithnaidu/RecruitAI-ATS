'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ROLES } from '@/lib/roles';
import CreateExamButton from '../exams/CreateExamButton';
import AssignExamModal from './AssignExamModal';
import DashboardOverview from '@/components/admin/DashboardOverview';
import ApplicationsList from '@/components/admin/ApplicationsList';
import InterviewScheduler from '@/components/admin/InterviewScheduler';
import InterviewsList from '@/components/admin/InterviewsList';
import { getInteviewCandidates, getInterviews } from '@/app/actions/interview';
import { getActiveExamSessions } from '@/app/actions/exams';

// ... existing imports

export default function AdminDashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('overview'); // Changed default to overview
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [selectedCandidateForExam, setSelectedCandidateForExam] = useState<{ id: string, name: string } | null>(null);
    const [interviewCandidates, setInterviewCandidates] = useState<any[]>([]);
    const [interviewsList, setInterviewsList] = useState<any[]>([]);
    const [activeSessions, setActiveSessions] = useState<any[]>([]);

    // Fetch Logic
    async function fetchApplications() {
        try {
            const res = await fetch('/api/applications');
            const json = await res.json();
            if (json.success) setApplications(json.data);
            else setError(json.message);

            // Fetch Active Exams
            const sessionsRes = await getActiveExamSessions();
            if (sessionsRes.success) setActiveSessions(sessionsRes.sessions || []);

            // Fetch Interview Data

            const cands = await getInteviewCandidates();
            setInterviewCandidates(cands);

            const ints = await getInterviews();
            setInterviewsList(ints);

        } catch (err) { setError('Error loading dashboard data'); } finally { setLoading(false); }
    }

    useEffect(() => {
        if (status === 'loading') return;
        if (!session) { router.push('/auth/login'); return; }
        // @ts-ignore
        if (session.user?.role !== ROLES.ADMIN) { router.push('/'); return; }

        fetchApplications();
    }, [session, status, router]);

    const refreshData = () => {
        fetchApplications();
    };

    // Action Handlers
    const [scoringId, setScoringId] = useState<string | null>(null);

    async function scoreApplication(applicationId: string) {
        if (!confirm("Run AI ATS Scoring?")) return;
        setScoringId(applicationId);
        try {
            const res = await fetch('/api/admin/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ applicationId })
            });
            const json = await res.json();
            if (json.success) {
                // @ts-ignore
                setApplications(prev => prev.map(app => app.id === applicationId ? { ...app, ats_score: json.data.score, status: json.data.status, ats_summary: json.data.summary } : app));
            } else alert("Error: " + json.message);
        } finally { setScoringId(null); }
    }

    async function updateStatus(applicationId: string, newStatus: string) {
        if (!confirm(`Mark as ${newStatus}?`)) return;
        try {
            const res = await fetch('/api/admin/application/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ applicationId, status: newStatus })
            });
            const json = await res.json();
            if (json.success) setApplications(prev => prev.map(app => app.id === applicationId ? { ...app, status: newStatus } : app));
            else alert("Failed: " + json.message);
        } catch (e) { alert("Network error"); }
    }

    const openAssignModal = (app: any) => {
        setSelectedCandidateForExam({ id: app.user_id || app.id, name: app.full_name });
        setAssignModalOpen(true);
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>;
    if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

    const tabs = [
        { id: 'overview', label: 'Dashboard Overview' },
        { id: 'applications', label: 'Applications List' },
        { id: 'exams', label: 'Exam Management' },
        { id: 'interviews', label: 'Interviews' },
        { id: 'monitor', label: 'Live Monitor 🔴' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                    <div className="text-sm text-gray-500">Welcome, {session?.user?.name || 'Admin'}</div>
                </div>

                {/* Test Mode Banner */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r shadow-sm">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-blue-700">
                                <strong>WhatsApp Test Mode Active:</strong> Free tier enabled (90 days). Messages can only be sent to verified test numbers. <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started#add-a-recipient-number" target="_blank" className="underline hover:text-blue-600">Add numbers in Meta Dashboard</a>.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 mb-8 inline-flex">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                                ${activeTab === tab.id
                                    ? 'bg-gray-900 text-white shadow-md'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                            `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="animate-fade-in">
                    {activeTab === 'overview' && (
                        <div className="space-y-8">
                            {/* Live Active Exams Card */}
                            {activeSessions.length > 0 && (
                                <div className="bg-white rounded-xl shadow border border-blue-200 overflow-hidden">
                                    <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex justify-between items-center">
                                        <h3 className="font-bold text-blue-900 flex items-center gap-2">
                                            <span className="relative flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                            </span>
                                            Live Exams In Progress ({activeSessions.length})
                                        </h3>
                                    </div>
                                    <div className="divide-y divide-gray-100">
                                        {activeSessions.map((session: any) => (
                                            <div key={session.id} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50">
                                                <div>
                                                    <div className="font-bold text-gray-900">{session.candidate_profiles?.full_name || 'Unknown Candidate'}</div>
                                                    <div className="text-sm text-gray-500">{session.exams?.title}</div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-xs text-gray-400">Started {new Date(session.started_at).toLocaleTimeString()}</div>
                                                    <a
                                                        href={`/admin/proctoring/${session.id}`}
                                                        className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg shadow hover:bg-red-700 transition flex items-center gap-2"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                        Monitor
                                                    </a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <DashboardOverview applications={applications} />
                        </div>
                    )}

                    {activeTab === 'applications' && (
                        <ApplicationsList
                            applications={applications}
                            onScore={scoreApplication}
                            onUpdateStatus={updateStatus}
                            onAssignExam={openAssignModal}
                            scoringId={scoringId}
                        />
                    )}

                    {activeTab === 'exams' && (
                        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                            <div className="max-w-md mx-auto">
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Exam Management</h3>
                                <p className="text-gray-500 mb-6">Create and manage exams for different roles.</p>
                                <CreateExamButton />
                                <div className="mt-8">
                                    <h4 className="font-bold text-gray-700 mb-4">Quick Links</h4>
                                    <a href="/admin/exams" className="text-blue-600 hover:underline">View All Exams →</a>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'interviews' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Scheduler */}
                                <div className="lg:col-span-1">
                                    <InterviewScheduler
                                        candidates={interviewCandidates}
                                        onScheduleSuccess={refreshData}
                                    />
                                </div>
                                {/* List */}
                                <div className="lg:col-span-2">
                                    <h2 className="text-xl font-bold mb-4">Scheduled Interviews</h2>
                                    <InterviewsList interviews={interviewsList} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'monitor' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-900">Live Exam Monitoring center</h2>
                                <button onClick={fetchApplications} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    Refresh
                                </button>
                            </div>

                            {activeSessions.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
                                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900">No Exams In Progress</h3>
                                    <p className="text-gray-500 max-w-sm mx-auto mt-1">There are no candidates currently taking an exam. When a candidate starts, they will appear here instantly.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {activeSessions.map((session: any) => (
                                        <div key={session.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
                                            <div className="p-1 bg-gradient-to-r from-red-500 to-red-600"></div>
                                            <div className="p-6">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h3 className="font-bold text-lg text-gray-900">{session.candidate_profiles?.full_name}</h3>
                                                        <p className="text-sm text-gray-500">{session.candidate_profiles?.email}</p>
                                                    </div>
                                                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded animate-pulse">LIVE</span>
                                                </div>

                                                <div className="space-y-3 mb-6">
                                                    <div className="text-sm text-gray-600">
                                                        <span className="font-medium text-gray-800">Exam:</span> {session.exams?.title}
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        <span className="font-medium text-gray-800">Started:</span> {new Date(session.started_at).toLocaleTimeString()}
                                                    </div>
                                                </div>

                                                <a
                                                    href={`/admin/proctoring/${session.id}`}
                                                    className="block w-full text-center py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition shadow flex items-center justify-center gap-2"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                    Launch Monitor
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Modals */}
                {selectedCandidateForExam && (
                    <AssignExamModal
                        isOpen={assignModalOpen}
                        onClose={() => setAssignModalOpen(false)}
                        candidateId={selectedCandidateForExam.id}
                        candidateName={selectedCandidateForExam.name}
                    />
                )}
            </div>
        </div>
    );
}
