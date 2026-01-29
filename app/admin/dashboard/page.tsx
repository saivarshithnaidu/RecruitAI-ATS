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

    // Fetch Logic
    async function fetchApplications() {
        try {
            const res = await fetch('/api/applications');
            const json = await res.json();
            if (json.success) setApplications(json.data);
            else setError(json.message);

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
                    {activeTab === 'overview' && <DashboardOverview applications={applications} />}

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
