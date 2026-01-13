import { getInterviewQuestions } from "@/app/actions/interview";
import InterviewSession from "@/components/candidate/InterviewSession";
import { redirect } from "next/navigation";

export default async function InterviewPlayPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let questions;
    try {
        questions = await getInterviewQuestions(id);
    } catch (error) {
        console.error("Failed to load interview:", error);
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-500 mb-2">Error Loading Interview</h1>
                    <p className="text-gray-400">Please try again or contact support.</p>
                </div>
            </div>
        );
    }

    if (!questions || questions.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-yellow-500 mb-2">No Questions Found</h1>
                    <p className="text-gray-400">The AI is generating questions. Please wait a moment and refresh.</p>
                </div>
            </div>
        );
    }

    return (
        <InterviewSession
            interviewId={id}
            questions={questions}
        />
    );
}
