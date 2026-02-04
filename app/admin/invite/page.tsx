'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InviteCandidatesPage() {
    const router = useRouter();
    const [emails, setEmails] = useState('');
    const [subject, setSubject] = useState("Application invitation – RecruitAI");
    const [message, setMessage] = useState(
        `Hi {{first_name}},\n\nYou’re invited to apply for an opportunity through RecruitAI, our hiring evaluation platform.\n\nApplication link:\n{{portal_url}}\n\nWhat to do:\n1. Open the link and create your account\n2. Complete your profile and upload your resume (DOC/DOCX)\n3. Verify your email and phone number\n4. Submit your application\n\nAfter submission:\n• Your resume will be evaluated automatically\n• Shortlisted candidates will receive an online assessment\n• Exam details will be shared only if you qualify\n\nImportant notes:\n• Use a laptop/desktop for exams\n• Ensure camera access is available during assessments\n• The application takes about 5–10 minutes to complete\n\nIf you face any issues, contact us at:\nsupport@recruitaitech.in\n\nRegards,\nRecruitAI Team\nhttps://www.recruitaitech.in`
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

                    {/* Email Templates Section */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Templates (Copy & Paste)
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            {[
                                {
                                    title: "Standard Invite",
                                    subject: "Application invitation – RecruitAI",
                                    body: `Hi {{first_name}},\n\nYou’re invited to apply for an opportunity through RecruitAI, our hiring evaluation platform.\n\nApplication link:\n{{portal_url}}\n\nWhat to do:\n1. Open the link and create your account\n2. Complete your profile and upload your resume (DOC/DOCX)\n3. Verify your email and phone number\n4. Submit your application\n\nAfter submission:\n• Your resume will be evaluated automatically\n• Shortlisted candidates will receive an online assessment\n• Exam details will be shared only if you qualify\n\nImportant notes:\n• Use a laptop/desktop for exams\n• Ensure camera access is available during assessments\n• The application takes about 5–10 minutes to complete\n\nIf you face any issues, contact us at:\nsupport@recruitaitech.in\n\nRegards,\nRecruitAI Team\nhttps://www.recruitaitech.in`
                                },
                                {
                                    title: "Urgent / Fast Track",
                                    subject: "Urgent: Complete your application – RecruitAI",
                                    body: `Hi {{first_name}},\n\nWe are fast-tracking applications for the current opening at RecruitAI.\n\nPlease complete your application immediately using the link below:\n\nLink: {{portal_url}}\n\nThis process will take less than 10 minutes.\n\nSteps:\n1. Register & Upload Resume\n2. Verify Email/Phone\n3. Submit\n\nNote: Candidates who apply today will be prioritized for assessment.\n\nRegards,\nRecruitAI Team`
                                },
                                {
                                    title: "Re-engagement / Reminder",
                                    subject: "Reminder: Pending Application – RecruitAI",
                                    body: `Hi {{first_name}},\n\nWe noticed you haven't completed your application process yet.\n\nTo be considered for the current round of hiring, please finish your submission here:\n\n{{portal_url}}\n\nIf you have already applied, please ignore this email.\n\nRegards,\nRecruitAI Team`
                                }
                            ].map((template, idx) => (
                                <div key={idx} className="border rounded-lg p-4 bg-gray-50 hover:bg-white hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-sm text-gray-900">{template.title}</h3>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(template.body);
                                                setSubject(template.subject);
                                                // Minimal toast using simple alert or state? User asked for toast "Template copied"
                                                // I'll stick to a simple alert or reuse status state if possible, but alert is "zero learning curve" validation.
                                                // Better: show a temporary text.
                                                const btn = document.getElementById(`copy-btn-${idx}`);
                                                if (btn) {
                                                    const origText = btn.innerText;
                                                    btn.innerText = "Copied!";
                                                    setTimeout(() => btn.innerText = origText, 1500);
                                                }
                                            }}
                                            id={`copy-btn-${idx}`}
                                            className="text-xs bg-white border border-gray-300 px-2 py-1 rounded text-gray-600 hover:text-indigo-600 hover:border-indigo-600 font-medium"
                                        >
                                            Copy Body
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2 truncate"><span className="font-medium">Subject:</span> {template.subject}</p>
                                    <div className="text-[10px] text-gray-400 bg-white p-2 rounded border h-20 overflow-y-auto whitespace-pre-wrap font-mono">
                                        {template.body}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Message Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Message Body
                        </label>
                        <div className="bg-blue-50 p-3 rounded text-xs text-blue-800 mb-2">
                            💡 <strong>Tip:</strong> Copy a template from above and paste it here. Variables like <code>{`{{portal_url}}`}</code> are replaced automatically.
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
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clicked (Yes/No)</th>
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
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                            {invite.clicked ? (
                                                <span className="text-green-600">Yes</span>
                                            ) : (
                                                <span className="text-red-500">No</span>
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
