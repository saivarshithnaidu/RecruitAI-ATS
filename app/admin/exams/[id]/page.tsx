import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Link from "next/link";
import { assignExam } from "@/app/actions/exams";
import AssignButton from "././AssignCandidatesClient"; // Client Component
import VerifyExamButton from "../VerifyExamButton";
import ExamStatusPoller from "../ExamStatusPoller";

export const dynamic = 'force-dynamic';

export default async function ExamDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    // 1. Fetch Exam
    const { data: exam, error: examError } = await supabaseAdmin
        .from('exams')
        .select('*')
        .eq('id', id)
        .single();

    if (examError || !exam) {
        return <div className="p-8">Exam not found</div>;
    }

    // 2. Fetch Questions Count
    let questionCount = 0;
    let sectionInfo = "";

    // @ts-ignore
    if (exam.questions_data && Array.isArray(exam.questions_data)) {
        // @ts-ignore
        questionCount = exam.questions_data.reduce((acc, sec) => acc + (sec.questions?.length || 0), 0);
        // @ts-ignore
        sectionInfo = exam.questions_data.map(s => `${s.title}: ${s.questions?.length}`).join(', ');
    } else {
        const { count } = await supabaseAdmin
            .from('exam_questions')
            .select('*', { count: 'exact', head: true })
            .eq('exam_id', id);
        questionCount = count || 0;
    }

    // 3. Fetch Candidates (SHORTLISTED)
    // We need their User IDs for assignment. 
    // We get applications with status SHORTLISTED
    const { data: shortlistedApps } = await supabaseAdmin
        .from('applications')
        .select('id, full_name, email, status')
        .eq('status', 'SHORTLISTED');

    // Resolve User IDs for these emails from Profiles
    const emails = shortlistedApps?.map(app => app.email) || [];
    let eligibleCandidates: any[] = [];

    if (emails.length > 0) {
        const { data: profiles } = await supabaseAdmin
            .from('candidate_profiles') // Used candidate_profiles instead of profiles
            .select('user_id, email, full_name')
            .in('email', emails);

        // Map profile ID back to app info
        eligibleCandidates = profiles?.map(p => ({
            user_id: p.user_id, // verified this is the auth id
            email: p.email,
            name: p.full_name
        })) || [];
    }

    // 4. Fetch Existing Assignments
    const { data: assignments } = await supabaseAdmin
        .from('exam_assignments')
        .select('*, candidate_profiles(full_name, email)') // join candidate_profiles to get names
        .eq('exam_id', id);

    // Filter out already assigned candidates from eligible list
    const assignedUserIds = new Set(assignments?.map(a => a.candidate_id));
    const unassignedCandidates = eligibleCandidates.filter(c => !assignedUserIds.has(c.user_id));

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-6">
                <Link href="/admin/exams" className="text-blue-600 hover:underline mb-2 block">
                    &larr; Back to Exams
                </Link>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">{exam.title}</h1>
                        <div className="flex gap-2 mt-2 items-center">
                            <span className="px-2 py-1 bg-gray-100 rounded text-xs">Role: {exam.role}</span>
                            <span className="px-2 py-1 bg-gray-100 rounded text-xs">Level: {exam.difficulty}</span>
                            <span className="px-2 py-1 bg-gray-100 rounded text-xs">{exam.duration_minutes} mins</span>
                            <span className="px-2 py-1 bg-gray-100 rounded text-xs">Pass: {exam.pass_mark}</span>
                            <span className="px-2 py-1 bg-gray-100 rounded text-xs">Qtns: {questionCount}</span>

                            {/* Status Badge */}
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${exam.status === 'READY' ? 'bg-green-100 text-green-800' :
                                exam.status === 'DRAFT' ? 'bg-gray-200 text-gray-800' :
                                    'bg-yellow-100 text-yellow-800'
                                }`}>
                                {exam.status}
                            </span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div>
                        {exam.status === 'DRAFT' && (
                            <VerifyExamButton examId={id} />
                        )}
                    </div>
                </div>
            </div>

            <div className="mb-6">
                {/* @ts-ignore */}
                <ExamStatusPoller examId={id} initialStatus={exam.status} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Candidates to Assign */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Assign Candidates</h2>

                    {exam.status !== 'READY' ? (
                        <div className="bg-yellow-50 p-4 rounded text-yellow-800 text-sm border border-yellow-200">
                            <strong>Note:</strong> You must <u>verify</u> this exam before you can assign it to candidates.
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-gray-500 mb-4">
                                Candidates with 'SHORTLISTED' status who haven't been assigned this exam.
                            </p>

                            {unassignedCandidates.length === 0 ? (
                                <div className="text-gray-400 italic">No eligible candidates found.</div>
                            ) : (
                                <AssignButton examId={id} candidates={unassignedCandidates} />
                            )}
                        </>
                    )}
                </div>

                {/* Right: Existing Assignments / Results */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Assignments</h2>

                    {!assignments || assignments.length === 0 ? (
                        <div className="text-gray-400 italic">No candidates assigned yet.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-2">Candidate</th>
                                        <th className="text-left py-2">Status</th>
                                        <th className="text-right py-2">Score</th>
                                        <th className="text-right py-2">Proctoring</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assignments.map((a: any) => (
                                        <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                                            <td className="py-3">
                                                <div className="font-medium">{a.candidate_profiles?.full_name || 'Unknown'}</div>
                                                <div className="text-xs text-gray-500">{a.candidate_profiles?.email}</div>
                                            </td>
                                            <td className="py-3">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${a.status === 'passed' ? 'bg-green-100 text-green-800' :
                                                    a.status === 'failed' ? 'bg-red-100 text-red-800' :
                                                        a.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {a.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="py-3 text-right">
                                                {a.score !== undefined ? a.score : '-'}
                                            </td>
                                            <td className="py-3 text-right">
                                                {a.status === 'in_progress' || a.status === 'assigned' || a.admin_status === 'paused' ? (
                                                    <Link
                                                        href={`/admin/proctoring/${a.id}`}
                                                        className="text-xs bg-red-600 text-white px-3 py-1.5 rounded font-bold hover:bg-red-700 transition flex items-center justify-center gap-1"
                                                    >
                                                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                                        Live Monitor
                                                    </Link>
                                                ) : (
                                                    <Link
                                                        href={`/admin/proctoring/${a.id}`}
                                                        className="text-xs bg-gray-900 text-white px-2 py-1 rounded hover:bg-black transition"
                                                    >
                                                        Review
                                                    </Link>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
            <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Review Exam Questions</h2>
                {exam.questions_data && Array.isArray(exam.questions_data) && exam.questions_data.length > 0 ? (
                    <div className="space-y-6">
                        {/* @ts-ignore */}
                        {exam.questions_data.map((section: any, idx: number) => (
                            <div key={idx} className="border-b last:border-0 pb-4 last:pb-0">
                                <h3 className="font-bold text-lg text-gray-700 mb-2">{section.title}</h3>
                                <div className="space-y-3">
                                    {section.questions.map((q: any, qIdx: number) => (
                                        <div key={q.id || qIdx} className="bg-gray-50 p-3 rounded">
                                            <p className="font-medium text-gray-900 mb-1">{qIdx + 1}. {q.question}</p>
                                            {q.options && (
                                                <ul className="list-disc list-inside text-sm text-gray-600 ml-2">
                                                    {q.options.map((opt: string, oIdx: number) => (
                                                        <li key={oIdx} className={opt === q.correct_answer ? "text-green-700 font-semibold" : ""}>
                                                            {opt} {opt === q.correct_answer && "(Correct)"}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-gray-500 italic">No questions available to preview.</div>
                )}
            </div>
        </div >
    );
}
