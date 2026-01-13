'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import InterviewInterface from './InterviewInterface';

export default function InterviewPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [state, setState] = useState<'LOADING' | 'BOOKING' | 'INTERVIEW' | 'COMPLETED' | 'LOCKED'>('LOADING');
    const [app, setApp] = useState<any>(null);
    const [interview, setInterview] = useState<any>(null);
    const [slotTime, setSlotTime] = useState('');
    const [responses, setResponses] = useState<string[]>([]);

    useEffect(() => {
        async function fetchData() {
            const res = await fetch('/api/candidate/interview');
            const json = await res.json();
            if (json.success) {
                setApp(json.data.application);
                setInterview(json.data.interview);

                if (json.data.application.status !== 'INTERVIEW' && json.data.application.status !== 'HIRED' && json.data.application.status !== 'REJECTED') {
                    setState('LOCKED'); // Not eligible yet
                } else if (json.data.interview) {
                    if (json.data.interview.result !== 'PENDING') setState('COMPLETED');
                    else setState('INTERVIEW');
                } else {
                    setState('BOOKING');
                }
            }
        }
        fetchData();
    }, []);

    const bookInterview = async () => {
        if (!slotTime) return alert("Select a time");
        try {
            const res = await fetch('/api/candidate/interview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ applicationId: app.id, slotTime })
            });
            const json = await res.json();
            if (json.success) {
                setInterview(json.data);
                setState('INTERVIEW');
            } else {
                alert(json.message);
            }
        } catch (e) {
            alert("Booking failed");
        }
    };

    const submitInterview = async () => {
        if (!confirm("Submit Interview Responses?")) return;
        try {
            const res = await fetch('/api/candidate/interview/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ interviewId: interview.id, responses })
            });
            const json = await res.json();
            if (json.success) {
                alert(`Interview Complete. Result: ${json.data.result}`);
                window.location.reload();
            } else {
                alert("Submission failed");
            }
        } catch (e) {
            alert("Error");
        }
    };

    if (state === 'LOADING') return <div className="p-8">Loading...</div>;
    if (state === 'LOCKED') return <div className="p-8 text-center text-gray-500">You are not eligible for an interview at this stage.</div>;

    if (state === 'COMPLETED') {
        return (
            <div className="max-w-2xl mx-auto p-8 text-center bg-white shadow rounded-lg mt-10">
                <h1 className="text-3xl font-bold mb-4">Interview Completed</h1>
                <p className="text-lg mb-4">You have completed the interview process.</p>
                <div className={`text-xl font-bold ${interview.result === 'PASSED' ? 'text-green-600' : 'text-red-600'}`}>
                    Result: {interview.result}
                </div>
                {interview.ai_score > 0 && <p className="mt-2 text-gray-500">AI Score: {interview.ai_score}/100</p>}
            </div>
        )
    }

    if (state === 'BOOKING') {
        return (
            <div className="max-w-md mx-auto p-8 bg-white shadow rounded-lg mt-10">
                <h1 className="text-2xl font-bold mb-6">Schedule Interview</h1>
                <p className="mb-4 text-gray-600">Congratulations! You have been shortlisted. Please confirm an interview slot (Mock ID booking).</p>
                <input
                    type="datetime-local"
                    className="w-full p-2 border rounded mb-4"
                    value={slotTime}
                    onChange={(e) => setSlotTime(e.target.value)}
                />
                <button onClick={bookInterview} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                    Propel Start Interview
                </button>
            </div>
        );
    }

    if (state === 'INTERVIEW') {
        return (
            <div className="max-w-5xl mx-auto p-6 h-screen">
                <InterviewInterface
                    interviewId={interview.id}
                    initialQuestions={interview.questions}
                />
            </div>
        );
    }
}
