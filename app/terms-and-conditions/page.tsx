import React from 'react';
import Link from 'next/link';

export const metadata = {
    title: 'Terms & Conditions | RecruitAI Tech – Platform Usage Rules',
    description: 'Review the terms and conditions for using the RecruitAI Tech platform, including exam rules, eligibility criteria, and AI evaluation consent.',
    alternates: {
        canonical: "https://recruitaitech.in/terms-and-conditions",
    },
};

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms & Conditions</h1>
                <p className="text-gray-500 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

                <div className="space-y-8 text-gray-700 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">1. Platform Usage Rules</h2>
                        <p className="mb-2">
                            Welcome to RecruitAI Tech. By accessing or using our platform, you agree to comply with these terms.
                            This platform is designed for recruitment, skill assessment, and exams. Misuse, unauthorized access, or abusive behavior will result in immediate disqualification.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">2. Eligibility to Apply</h2>
                        <p className="mb-2">
                            You must ensure that you meet the eligibility criteria for any job role you apply for.
                            RecruitAI Tech reserves the right to cancel your candidature at any stage if you are found ineligible.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">3. Accuracy of Information</h2>
                        <p className="mb-2">
                            You declare that all information provided (including your name, email, phone, resume, and qualifications) is accurate and truthful.
                            Providing false information is grounds for immediate rejection and a permanent ban from our platform.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">4. Exam Rules & Integrity</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>No Cheating:</strong> Any form of malpractice is strictly prohibited.</li>
                            <li><strong>Tab Switching:</strong> Switching tabs or windows during an exam is tracked and constitutes a violation.</li>
                            <li><strong>Camera Usage:</strong> You must keep your camera enabled and your face visible throughout the proctored sessions.</li>
                            <li><strong>No External Help:</strong> Use of additional devices, books, or another person's assistance is forbidden.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">5. Proctoring & Monitoring Consent</h2>
                        <p className="mb-2">
                            You explicitly consent to be monitored via your webcam and microphone during assessments.
                            Our AI system analyzes video and audio feeds to ensure exam integrity. Snapshots and logs may be stored for review by administrators.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">6. ATS & AI Evaluation</h2>
                        <p className="mb-2">
                            We use AI-driven tools for resume screening (ATS) and exam evaluation. While we strive for accuracy,
                            the final decision regarding shortlisting and hiring rests with the administration/recruiters.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">7. Admin Rights</h2>
                        <p className="mb-2">
                            RecruitAI Tech administrators retain the full right to:
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Shortlist or reject candidates based on criteria.</li>
                            <li>Reschedule or cancel exams and interviews.</li>
                            <li>Review flagged proctoring incidents and make final judgments on malpractice.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">8. Account Suspension</h2>
                        <p className="mb-2">
                            Violation of these terms, specifically regarding exam integrity or providing false data,
                            will lead to the suspension of your account and disqualification from current and future opportunities.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">9. Limitation of Liability</h2>
                        <p className="mb-2">
                            RecruitAI Tech is not liable for any technical failures, internet connectivity issues on your end,
                            or loss of opportunity arising from system usage, except where required by law.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">10. Governing Law</h2>
                        <p className="mb-2">
                            These terms are governed by the laws of India. Any disputes arising from the use of this platform shall be subject to the jurisdiction of courts in India.
                        </p>
                    </section>
                </div>

                <div className="mt-12 pt-8 border-t border-gray-100 flex justify-center">
                    <Link href="/" className="text-blue-600 font-semibold hover:underline">
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
