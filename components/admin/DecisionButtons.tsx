'use client';

import { useState } from 'react';
import { finalizeInterviewDecision } from '@/app/actions/interview';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface DecisionButtonsProps {
    interviewId: string;
    currentStatus: string;
    applicationStatus?: string;
}

export default function DecisionButtons({ interviewId, currentStatus, applicationStatus }: DecisionButtonsProps) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleDecision = async (decision: 'HIRED' | 'REJECTED') => {
        if (!confirm(`Are you sure you want to mark this candidate as ${decision}?`)) return;

        setIsLoading(true);
        try {
            await finalizeInterviewDecision(interviewId, decision);
            router.refresh();
            router.push('/admin/dashboard'); // Redirect to dashboard after decision
        } catch (error) {
            alert("Failed to update status");
        } finally {
            setIsLoading(false);
        }
    };

    const isDecisionMade = applicationStatus === 'HIRED' || applicationStatus === 'REJECTED';

    if (isDecisionMade) {
        return (
            <div className={`px-4 py-2 rounded-lg font-bold text-sm ${applicationStatus === 'HIRED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                DECISION: {applicationStatus}
            </div>
        );
    }

    if (currentStatus !== 'completed') {
        // Optionally hide buttons if not completed? Or allow pre-emptive?
        // User guide says "Hire Candidate" usually happens after review.
        // Let's keep them enabled but maybe warn? Or just allow it.
    }

    return (
        <div className="flex gap-3">
            <button
                onClick={() => handleDecision('REJECTED')}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50"
            >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Reject
            </button>
            <button
                onClick={() => handleDecision('HIRED')}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 shadow-sm"
            >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Hire Candidate
            </button>
        </div>
    );
}
