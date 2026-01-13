
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
    ats_score_locked?: boolean;
    ats_summary?: string;
    created_at: string;
    applied_at?: string;
    profiles?: any;
}

interface ApplicationsListProps {
    applications: Application[];
    onScore: (id: string) => void;
    onUpdateStatus: (id: string, status: string) => void;
    onAssignExam: (app: Application) => void;
    scoringId: string | null;
}

export default function ApplicationsList({ applications, onScore, onUpdateStatus, onAssignExam, scoringId }: ApplicationsListProps) {
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const toggleRow = (id: string) => setExpandedRow(expandedRow === id ? null : id);

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
                                <tr onClick={() => toggleRow(app.id)} className="cursor-pointer hover:bg-gray-50 transition">
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
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {(app.ats_score > 0) ? (
                                            <div>
                                                <span className={`text-lg font-bold ${app.ats_score >= 70 ? 'text-green-600' : 'text-orange-500'}`}>
                                                    {app.ats_score}%
                                                </span>
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
                                            {(!app.ats_score || app.ats_score === 0) && !['parse_failed'].includes(app.status) && (
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
                                {expandedRow === app.id && (
                                    <tr className="bg-gray-50">
                                        <td colSpan={5} className="px-6 py-4 text-sm text-gray-700">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <h4 className="font-bold">ATS Summary</h4>
                                                    <p className="mb-2 text-gray-600">{app.ats_summary || "No summary available."}</p>
                                                    <h4 className="font-bold">Skills</h4>
                                                    <p>{app.profiles?.skills?.join(', ') || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold">Contact</h4>
                                                    <p>Phone: {app.profiles?.mobile_number || app.phone || 'N/A'}</p>
                                                    <h4 className="font-bold">Education</h4>
                                                    <p>{JSON.stringify(app.profiles?.education || 'N/A')}</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
