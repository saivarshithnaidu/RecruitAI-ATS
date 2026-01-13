'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { updateResponseScore } from '@/app/actions/interview';
import { useRouter } from 'next/navigation';

interface ScoreInputProps {
    questionId: string;
    interviewId: string;
    initialScore: number;
}

export default function ScoreInput({ questionId, interviewId, initialScore }: ScoreInputProps) {
    const [score, setScore] = useState(initialScore);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const router = useRouter();

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateResponseScore(questionId, interviewId, Number(score));
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 2000);
            router.refresh(); // Refresh to ensure data consistency
        } catch (error) {
            alert("Failed to save score");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex items-center justify-end gap-2">
            <div className="flex flex-col items-end">
                <span className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Score (0-10)</span>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        min="0"
                        max="10"
                        value={score}
                        onChange={(e) => setScore(Number(e.target.value))}
                        className="w-16 p-2 text-center text-lg font-bold text-gray-900 border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                        onClick={handleSave}
                        disabled={isSaving || score === initialScore}
                        className={`p-2 rounded-md transition-colors ${isSaved
                                ? 'bg-green-100 text-green-600'
                                : score !== initialScore
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                        title="Save Score"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : isSaved ? <Check className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
}
