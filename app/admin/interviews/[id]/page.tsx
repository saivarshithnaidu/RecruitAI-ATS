import { getInterviewDetails } from "@/app/actions/interview";
import { ArrowLeft, User, Clock, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import ScoreInput from "@/components/admin/ScoreInput";
import DecisionButtons from "@/components/admin/DecisionButtons";

export default async function AdminInterviewDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    let interview;

    try {
        interview = await getInterviewDetails(id);
    } catch (error) {
        return (
            <div className="p-8 text-center text-red-500">
                Failed to load interview details. {(error as Error).message}
            </div>
        );
    }

    return (
        <div className="p-8">
            <Link href="/admin/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6">
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>

            {/* Header Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Technical Interview Review</h1>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                                <User className="w-4 h-4" /> {interview.candidate.full_name}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" /> {new Date(interview.scheduled_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                        <DecisionButtons
                            interviewId={id}
                            currentStatus={interview.status}
                            applicationStatus={interview.application?.status}
                        />
                        <div className="flex flex-col items-end">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${interview.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                {interview.status.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-400 mt-2">ID: {id}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Questions & Answers */}
            <div className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900">Transcript & Analysis</h2>

                {interview.questions.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-200 text-gray-500">
                        No questions/answers found.
                    </div>
                ) : (
                    interview.questions.map((q: any, i: number) => (
                        <div key={q.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="font-semibold text-gray-900">Question {i + 1}</h3>
                                <span className="text-xs font-mono text-gray-400 uppercase">{q.type}</span>
                            </div>
                            <div className="p-6">
                                <p className="text-lg text-gray-800 mb-6 font-medium">{q.question}</p>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Candidate Answer</label>
                                        {q.response ? (
                                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-gray-800 leading-relaxed">
                                                {q.response.answer}
                                            </div>
                                        ) : (
                                            <div className="text-gray-400 italic">No answer recorded.</div>
                                        )}
                                    </div>

                                    {/* Placeholder for AI Scoring later */}
                                    {q.response && (
                                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                                            <div>
                                                <span className="text-sm text-gray-500">Expected Keywords</span>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {q.expected_keywords.map((k: string) => (
                                                        <span key={k} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{k}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <ScoreInput
                                                    questionId={q.id}
                                                    interviewId={id}
                                                    initialScore={q.response.score || 0}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
