'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function CandidateExamsPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeExam, setActiveExam] = useState<any>(null);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        async function fetchExams() {
            if (!session) return;
            try {
                const res = await fetch('/api/candidate/exams');
                const json = await res.json();
                if (json.success) setExams(json.data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        fetchExams();
    }, [session]);

    const startExam = (exam: any) => {
        setActiveExam(exam);
        setAnswers({});
        setSubmitted(false);
    };

    const submitExam = async () => {
        if (!confirm("Submit Exam?")) return;
        try {
            const res = await fetch('/api/candidate/exams/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    examId: activeExam.id,
                    answers: answers
                })
            });
            const json = await res.json();
            if (json.success) {
                alert(`Exam Submitted! You ${json.data.passed ? 'PASSED' : 'FAILED'} with score ${json.data.score}%`);
                window.location.reload();
            } else {
                alert(json.message);
            }
        } catch (e) {
            alert("Submission error");
        }
    };

    if (loading) return <div className="p-8">Loading Exams...</div>;

    if (activeExam) {
        return (
            <div className="max-w-3xl mx-auto p-8">
                <h1 className="text-2xl font-bold mb-4">Skill Assessment: {activeExam.skill}</h1>
                <div className="space-y-6">
                    {activeExam.questions.map((q: any, idx: number) => (
                        <div key={idx} className="bg-white p-6 rounded shadow">
                            <p className="font-medium mb-4">{idx + 1}. {q.question}</p>
                            <div className="space-y-2">
                                {q.options.map((opt: string) => (
                                    <label key={opt} className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name={`q-${idx}`}
                                            value={opt}
                                            checked={answers[idx] === opt}
                                            onChange={(e) => setAnswers({ ...answers, [idx]: e.target.value })}
                                            className="form-radio h-4 w-4 text-blue-600"
                                        />
                                        <span>{opt}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-8">
                    <button
                        onClick={submitExam}
                        className="bg-green-600 text-white px-6 py-3 rounded font-medium hover:bg-green-700"
                    >
                        Submit Answers
                    </button>
                    <button
                        onClick={() => setActiveExam(null)}
                        className="ml-4 text-gray-600 hover:text-gray-800"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-8">
            <h1 className="text-3xl font-bold mb-6">Pending Exams</h1>
            {exams.length === 0 ? (
                <p className="text-gray-500">No exams assigned yet.</p>
            ) : (
                <div className="grid gap-4">
                    {exams.map((exam) => (
                        <div key={exam.id} className="bg-white p-6 rounded shadow flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-semibold">{exam.skill} Assessment</h3>
                                <p className="text-sm text-gray-500">Status: {exam.score > 0 ? (exam.passed ? 'PASSED' : 'FAILED') : 'PENDING'}</p>
                                {exam.score > 0 && <p className="text-sm font-medium">Score: {exam.score}%</p>}
                            </div>
                            {exam.score === 0 && (
                                <button
                                    onClick={() => startExam(exam)}
                                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                                >
                                    Start Exam
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
