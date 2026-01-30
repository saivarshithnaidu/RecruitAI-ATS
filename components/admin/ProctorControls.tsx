'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProctorControls({ assignmentId, currentStatus }: { assignmentId: string, currentStatus: string | null }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [remarks, setRemarks] = useState('');
    const [status, setStatus] = useState(currentStatus || 'active');

    const handleAction = async (action: 'pause' | 'resume' | 'terminate') => {
        if (!confirm(`Are you sure you want to ${action} this exam?`)) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/admin/proctor/control`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignmentId, action, remarks })
            });

            if (!res.ok) throw new Error('Action failed');

            setStatus(action === 'resume' ? 'active' : action === 'pause' ? 'paused' : 'terminated');
            router.refresh();
            setRemarks('');
        } catch (error) {
            console.error(error);
            alert('Failed to execute action');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
            <h3 className="font-bold text-lg text-gray-800">Exam Controls</h3>

            <div className="flex gap-2">
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${status === 'active' ? 'bg-green-100 text-green-700' :
                        status === 'paused' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                    }`}>
                    Status: {status}
                </div>
            </div>

            <textarea
                placeholder="Add admin remarks (optional)..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full text-sm p-2 border rounded"
                rows={2}
            />

            <div className="grid grid-cols-3 gap-2">
                {status === 'active' && (
                    <button
                        onClick={() => handleAction('pause')}
                        disabled={loading}
                        className="bg-orange-100 text-orange-700 py-2 rounded font-bold hover:bg-orange-200 disabled:opacity-50"
                    >
                        Pause
                    </button>
                )}

                {status === 'paused' && (
                    <button
                        onClick={() => handleAction('resume')}
                        disabled={loading}
                        className="bg-green-100 text-green-700 py-2 rounded font-bold hover:bg-green-200 disabled:opacity-50"
                    >
                        Resume
                    </button>
                )}

                <button
                    onClick={() => handleAction('terminate')}
                    disabled={loading || status === 'terminated'}
                    className="bg-red-100 text-red-700 py-2 rounded font-bold hover:bg-red-200 disabled:opacity-50 col-span-2"
                >
                    Terminate Exam
                </button>
            </div>
        </div>
    );
}
