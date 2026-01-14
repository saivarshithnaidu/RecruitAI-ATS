'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InviteCandidatesPage() {
    const router = useRouter();
    const [emails, setEmails] = useState('');
    const [subject, setSubject] = useState('Invitation to Apply at RecruitAI');
    const [message, setMessage] = useState(
        `Dear Candidate,\n\nWe were impressed by your profile and would like to invite you to apply for a position at RecruitAI.\n\nPlease visit our career portal to submit your application:\n{{portal_link}}\n\nWe look forward to hearing from you.\n\nBest regards,\nRecruitAI Hiring Team`
    );
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string, details?: any } | null>(null);
    const [invites, setInvites] = useState<any[]>([]);

    const fetchInvites = async () => {
        try {
            const res = await fetch('/api/admin/invite/list');
            if (res.ok) {
                const data = await res.json();
                setInvites(data.invites || []);
            }
        } catch (error) {
            console.error('Failed to fetch invites', error);
        }
    };

    useEffect(() => {
        fetchInvites();
        const interval = setInterval(fetchInvites, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        // Parse emails: split by newlines, trim, remove empty
        const emailList = emails
            .split('\n')
            .map(e => e.trim())
            .filter(e => e.length > 0 && e.includes('@'));

        if (emailList.length === 0) {
            setStatus({ type: 'error', message: 'Please enter at least one valid email address.' });
            setLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/admin/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    emails: emailList,
                    subject,
                    message
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to send invites');
            }

            setStatus({
                type: 'success',
                message: `Successfully processed invites. Sent: ${data.summary.success}, Failed: ${data.summary.failed}`
            });

            if (data.summary.success > 0) {
                setEmails('');
                fetchInvites();
            }

        } catch (err: any) {
            setStatus({ type: 'error', message: err.message || 'An unexpected error occurred.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Invite Candidates</h1>

            <div className="bg-white shadow rounded-lg p-6 mb-8">
                <form onSubmit={handleSend} className="space-y-6">
                    {/* Status Alert */}
                    {status && (
                        <div className={`p-4 rounded-md ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            <p className="font-medium">{status.message}</p>
                        </div>
                    )}

                    {/* Emails Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Student Emails (one per line)
                        </label>
                        <textarea
                            rows={6}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border"
                            placeholder="student1@example.com&#10;student2@university.edu"
                            value={emails}
                            onChange={(e) => setEmails(e.target.value)}
                            required
                        />
                        <p className="mt-1 text-xs text-gray-500">Enter each email address on a new line.</p>
                    </div>

                    {/* Subject Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Subject
                        </label>
                        <input
                            type="text"
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            required
                        />
                    </div>

                    {/* Message Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Message Body
                        </label>
                        <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 mb-2">
                            Variable: <strong>{`{{portal_link}}`}</strong> will be replaced with the registration link.
                        </div>
                        <textarea
                            rows={10}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border font-mono"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            required
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Sending...
                                </>
                            ) : (
                                'Send Invites'
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Invites Tracking Table */}
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-800">Sent Invites</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent At</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clicked At</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {invites.length > 0 ? (
                                invites.map((invite) => (
                                    <tr key={invite.id || invite.token}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invite.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {invite.sent_at ? new Date(invite.sent_at).toLocaleString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {invite.clicked ? (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                    Clicked
                                                </span>
                                            ) : (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                    Sent
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {invite.clicked_at ? new Date(invite.clicked_at).toLocaleString() : '-'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                                        No invites sent yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
