import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Link from "next/link";
import CreateExamButton from "./CreateExamButton";
import RetryExamButton from "./RetryExamButton";

export const dynamic = 'force-dynamic';

export default async function AdminExamsPage() {
    const { data: exams, error } = await supabaseAdmin
        .from('exams')
        .select('*')
        .order('created_at', { ascending: false });

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Exam Management</h1>
                <CreateExamButton />
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded mb-6">
                    Error loading exams: {error.message}
                </div>
            )}

            {!exams || exams.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-600">No exams created yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exams.map((exam: any) => (
                        <div key={exam.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900">{exam.title}</h2>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                            {exam.role}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${exam.difficulty === 'Hard' ? 'bg-red-100 text-red-800' :
                                            exam.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-green-100 text-green-800'
                                            }`}>
                                            {exam.difficulty}
                                        </span>
                                        {/* Status Badge */}
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${exam.status === 'READY' ? 'bg-green-100 text-green-800' :
                                            exam.status === 'READY_FALLBACK' ? 'bg-orange-100 text-orange-800' :
                                                exam.status === 'AI_FAILED' ? 'bg-red-100 text-red-800' :
                                                    exam.status === 'GENERATING' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-gray-100 text-gray-800'
                                            }`}>
                                            {exam.status === 'GENERATING' ? 'Generating...' :
                                                exam.status === 'AI_FAILED' ? 'Generation Failed' :
                                                    exam.status === 'READY_FALLBACK' ? 'Ready (Fallback)' :
                                                        exam.status || 'DRAFT'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-gray-600 mb-4 text-sm line-clamp-2">{exam.description}</p>

                            {exam.error_message && (
                                <p className="text-xs text-red-500 mb-4 bg-red-50 p-2 rounded">
                                    Error: {exam.error_message}
                                </p>
                            )}

                            <div className="flex justify-between text-sm text-gray-600 mb-6">
                                <span>{exam.duration_minutes} mins</span>
                                <span>Pass: {exam.pass_mark}%</span>
                            </div>

                            {exam.status === 'READY' || exam.status === 'READY_FALLBACK' ||
                                (exam.status === 'DRAFT' && Array.isArray(exam.questions_data) && exam.questions_data.length > 0) ? (
                                <div className="flex gap-2">
                                    <Link
                                        href={`/admin/exams/${exam.id}`}
                                        className="flex-1 text-center px-3 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition text-sm font-medium"
                                    >
                                        View Details
                                    </Link>
                                    <Link
                                        href={`/admin/exams/${exam.id}/monitor`}
                                        className="flex-1 text-center px-3 py-2 bg-gray-900 text-white rounded hover:bg-black transition text-sm font-medium flex items-center justify-center gap-1"
                                    >
                                        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.818v6.364a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                        Monitor
                                    </Link>
                                </div>
                            ) : (
                                <RetryExamButton examId={exam.id} />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

