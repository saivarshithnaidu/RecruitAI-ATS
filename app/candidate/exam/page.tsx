import { getCandidateExam } from "@/app/actions/exams";
import ExamInterface from "./ExamInterface";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function CandidateExamPage() {
    const res = await getCandidateExam();

    if (res.error || !res.exam) {
        return (
            <div className="max-w-4xl mx-auto p-12 text-center">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">No Exam Found</h1>
                <p className="text-gray-500 mb-8">{res.error || "Exam data missing."}</p>
                <Link href="/candidate/application" className="text-blue-600 hover:underline">
                    &larr; Back to Dashboard
                </Link>
            </div>
        );
    }

    const { exam } = res;

    // Handle Generation States
    // We check exam.exams.status (the exam definition) not just assignment status
    // @ts-ignore
    const examStatus = exam.exams?.status;

    if (examStatus === 'DRAFT' || examStatus === 'GENERATING') {
        return (
            <div className="max-w-2xl mx-auto p-12 text-center mt-10 bg-white rounded shadow-sm">
                <div className="mb-6">
                    <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Exam is being prepared</h1>
                <p className="text-gray-500">Please wait while our AI generates your unique assessment.</p>
                <p className="text-sm text-gray-400 mt-4">Refresh this page in a minute.</p>
            </div>
        );
    }

    if (exam.status === 'AI_FAILED') {
        return (
            <div className="max-w-2xl mx-auto p-12 text-center mt-10 bg-white rounded shadow-sm border border-red-200">
                <h1 className="text-2xl font-bold text-red-600 mb-2">Exam Generation Failed</h1>
                <p className="text-gray-500 mb-6">There was an issue preparing your exam.</p>
                <p className="text-gray-600">Please contact the administrator or HR to reset your exam assignment.</p>
                <Link href="/candidate/application" className="inline-block mt-4 text-blue-600 hover:underline">
                    &larr; Back to Dashboard
                </Link>
            </div>
        );
    }

    // If Passed/Failed/Completed, show result summary
    if (['passed', 'failed', 'completed'].includes(exam.status)) {
        const isPassed = exam.status === 'passed' || exam.status === 'completed';
        const passedObj = exam.status === 'passed';

        return (
            <div className="max-w-2xl mx-auto p-8 mt-12 bg-white rounded-lg shadow-lg border border-gray-200 text-center">
                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 ${passedObj ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {passedObj ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        )}
                    </svg>
                </div>

                <h1 className={`text-3xl font-bold mb-2 ${passedObj ? 'text-green-800' : 'text-red-800'}`}>
                    {passedObj ? 'Exam Passed!' : 'Exam Failed'}
                </h1>
                <p className="text-gray-500 mb-6">
                    {passedObj ? 'You have successfully cleared the technical assessment.' : 'You did not meet the passing criteria for this assessment.'}
                </p>

                <div className="bg-gray-50 p-4 rounded mb-8 inline-block text-left">
                    <div className="flex gap-8">
                        <div>
                            <span className="block text-xs text-gray-400 uppercase tracking-wide">Score</span>
                            <span className="text-2xl font-bold text-gray-800">{exam.score}</span>
                        </div>
                        <div>
                            <span className="block text-xs text-gray-400 uppercase tracking-wide">Status</span>
                            <span className="text-xl font-bold capitalize">{exam.status}</span>
                        </div>
                    </div>
                </div>

                <div>
                    <Link href="/candidate/application" className="inline-block px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <ExamInterface exam={exam} initialStatus={exam.status} />
        </div>
    );
}
