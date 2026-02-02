"use client";

import { useEffect, useState } from "react";
import { getInactiveCandidates, sendCandidateReminder, InactiveCandidate } from "@/app/actions/admin";

export default function InactiveCandidatesPage() {
    const [candidates, setCandidates] = useState<InactiveCandidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const res = await getInactiveCandidates();
        if (res.success && res.candidates) {
            setCandidates(res.candidates);
        } else {
            alert("Failed to load candidates: " + res.error);
        }
        setLoading(false);
    };

    const handleReminder = async (id: string, email: string) => {
        if (!confirm(`Send reminder email to ${email}?`)) return;

        setProcessingId(id);
        const res = await sendCandidateReminder(id);

        if (res.success) {
            alert("Reminder sent successfully!");
            // Optimistic update or reload
            setCandidates(prev => prev.map(c =>
                c.user_id === id ? { ...c, reminder_sent_at: new Date().toISOString() } : c
            ));
        } else {
            alert("Failed: " + res.error);
        }
        setProcessingId(null);
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'LOGGED_IN_ONLY': 'bg-gray-100 text-gray-800',
            'PROFILE_INCOMPLETE': 'bg-yellow-100 text-yellow-800',
            'APPLICATION_INCOMPLETE': 'bg-orange-100 text-orange-800',
            'EXAM_ASSIGNED_NOT_STARTED': 'bg-blue-100 text-blue-800',
            'EXAM_STARTED_NOT_SUBMITTED': 'bg-red-100 text-red-800'
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
                {status.replace(/_/g, ' ')}
            </span>
        );
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Inactive / Dropped Candidates</h1>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Reminder</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={5} className="text-center py-4">Loading...</td></tr>
                        ) : candidates.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-4 text-gray-500">No inactive candidates found.</td></tr>
                        ) : (
                            candidates.map((c) => (
                                <tr key={c.user_id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{c.full_name}</div>
                                        <div className="text-sm text-gray-500">{c.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {c.last_login_at ? new Date(c.last_login_at).toLocaleString() : 'Never'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(c.computed_status)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {c.reminder_sent_at ? new Date(c.reminder_sent_at).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleReminder(c.user_id, c.email)}
                                            disabled={!!processingId || (!!c.reminder_sent_at && (Date.now() - new Date(c.reminder_sent_at).getTime()) < 24 * 60 * 60 * 1000)}
                                            className={`text-indigo-600 hover:text-indigo-900 disabled:text-gray-400 disabled:cursor-not-allowed`}
                                        >
                                            {processingId === c.user_id ? 'Sending...' : 'Send Reminder'}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
