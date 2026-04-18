
"use client";

import { Fragment, useState } from 'react';
import Link from 'next/link';
import VerifyButton from '@/components/VerifyButton';

interface Application {
    id: string;
    user_id?: string;
    full_name: string;
    email: string;
    phone: string;
    resume_url: string;
    status: string;
    ats_score: number;
    aiAtsScore?: number;
    atsStatus?: string;
    manualAtsScore?: number;
    notes?: string;
    ats_score_locked?: boolean;
    ats_summary?: string;
    created_at: string;
    applied_at?: string;
    profiles?: any;
    invite_tracking?: {
        status: string;
        sent_at: string;
        clicked_at: string;
        exam_status: string;
        assignment_id?: string;
    };
};

interface ApplicationsListProps {
    applications: Application[];
    onScore: (id: string) => void;
    onUpdateStatus: (id: string, status: string) => void;
    onAssignExam: (app: Application) => void;
    scoringId: string | null;
}

import { useRouter } from 'next/navigation';

export default function ApplicationsList({ applications, onScore, onUpdateStatus, onAssignExam, scoringId }: ApplicationsListProps) {
    const router = useRouter();
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    // const toggleRow = (id: string) => setExpandedRow(expandedRow === id ? null : id); // Old expansion behavior

    // New behavior: Navigate to detailed profile
    const handleRowClick = (appId: string) => {
        router.push(`/admin/candidates/${appId}`);
    };

    if (applications.length === 0) {
        return <div className="text-center py-8 text-gray-600">No applications found.</div>;
    }

    return (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Applications</h3>
                <span className="text-sm text-gray-500">{applications.length} Total</span>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Candidate</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">ATS Score</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Verification</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {applications.map((app) => (
                            <Fragment key={app.id}>
                                <tr onClick={() => handleRowClick(app.id)} className="cursor-pointer hover:bg-blue-50 transition border-l-4 border-transparent hover:border-blue-500">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-gray-900">{app.full_name}</div>
                                        <div className="text-sm text-gray-500">{app.email}</div>
                                        <div className="text-xs text-gray-400 mt-1">Applied: {new Date(app.applied_at || app.created_at).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${['SCORED_AI', 'SHORTLISTED'].includes(app.status) ? 'bg-green-100 text-green-800' :
                                                ['REJECTED', 'EXAM_FAILED'].includes(app.status) ? 'bg-red-100 text-red-800' :
                                                    ['EXAM_PASSED', 'HIRED'].includes(app.status) ? 'bg-blue-100 text-blue-800' :
                                                        'bg-gray-100 text-gray-800'}`}>
                                            {app.status.replace('_', ' ')}
                                        </span>
                                        {/* Tracking Info */}
                                        {app.invite_tracking && (
                                            <div className="mt-1 flex flex-col gap-0.5 text-[10px] text-gray-500">
                                                {app.invite_tracking.status === 'sent' && (
                                                    <span className="flex items-center gap-1 text-orange-600">
                                                        ✉ Invite Sent
                                                    </span>
                                                )}
                                                {app.invite_tracking.status === 'clicked' && (
                                                    <span className="flex items-center gap-1 text-blue-600 font-bold">
                                                        🖱 Clicked
                                                    </span>
                                                )}
                                                {/* If they have started, the main status will likely reflect EXAM_IN_PROGRESS, so we skip registered check if redundancy implies it */}
                                                {app.invite_tracking.exam_status === 'in_progress' && (
                                                    <span className="text-purple-600 animate-pulse">● In Progress</span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {((app.aiAtsScore ?? 0) > 0 || app.ats_score > 0) ? (
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-lg font-bold ${(app.aiAtsScore ?? app.ats_score) >= 70 ? 'text-green-600' : 'text-orange-500'}`}>
                                                        {app.aiAtsScore ?? app.ats_score}%
                                                    </span>
                                                    {/* @ts-ignore */}
                                                    {app.fallback_used && (
                                                        <span className="bg-yellow-100 text-yellow-800 text-[10px] px-1.5 py-0.5 rounded border border-yellow-200" title="Estimated score (resume parse failed)">
                                                            Estimated
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400">N/A</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {/* @ts-ignore */}
                                        {app.profiles?.verification_status === 'verified' ? (
                                            <span className="text-green-600 font-bold text-xs">✓ Verified</span>
                                        ) : (
                                            app.user_id && <VerifyButton userId={app.user_id} />
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex flex-col gap-2">
                                            {/* Score Button */}
                                            {((app.aiAtsScore ?? 0) === 0) && (app.ats_score === 0) && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onScore(app.id); }}
                                                    disabled={scoringId === app.id}
                                                    className="text-indigo-600 hover:text-indigo-900 text-xs font-bold"
                                                >
                                                    {scoringId === app.id ? 'Scoring...' : 'Run ATS AI'}
                                                </button>
                                            )}

                                            {/* Shortlist/Reject Actions */}
                                            {['SCORED_AI', 'SCORED_FALLBACK'].includes(app.status) && (
                                                <div className="flex gap-2">
                                                    <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(app.id, 'SHORTLISTED'); }} className="text-green-600 hover:text-green-900 border border-green-200 px-2 py-1 rounded text-xs">Shortlist</button>
                                                    <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(app.id, 'REJECTED'); }} className="text-red-600 hover:text-red-900 border border-red-200 px-2 py-1 rounded text-xs">Reject</button>
                                                </div>
                                            )}

                                            {/* Evaluate Exam */}
                                            {(app.status === 'EXAM_SUBMITTED' || ['EXAM_PASSED', 'EXAM_FAILED'].includes(app.status)) && app.invite_tracking?.assignment_id && (
                                                <Link
                                                    href={`/admin/exams/${app.invite_tracking.assignment_id}/evaluate`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className={`px-3 py-1 rounded text-xs shadow-sm font-bold flex items-center gap-1
                                                        ${app.status === 'EXAM_SUBMITTED'
                                                            ? 'bg-purple-600 hover:bg-purple-700 text-white animate-pulse'
                                                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'}
                                                    `}
                                                >
                                                    {app.status === 'EXAM_SUBMITTED' ? '⚡ Evaluate' : 'View Result'}
                                                </Link>
                                            )}

                                            {/* Assign Exam */}
                                            {['SHORTLISTED'].includes(app.status) && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onAssignExam(app); }}
                                                    className="text-white bg-orange-600 hover:bg-orange-700 px-3 py-1 rounded text-xs shadow-sm"
                                                >
                                                    Assign Exam
                                                </button>
                                            )}

                                            <a href={app.resume_url} target="_blank" onClick={(e) => e.stopPropagation()} className="text-gray-500 hover:text-gray-900 text-xs">View Resume</a>
                                        </div>
                                    </td>
                                </tr>
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
