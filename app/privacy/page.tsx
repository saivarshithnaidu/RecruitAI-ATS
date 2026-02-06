import React from 'react';
import Link from 'next/link';

export const metadata = {
    title: 'Privacy Policy – RecruitAI Tech',
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
                <p className="text-gray-500 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

                <div className="space-y-8 text-gray-700 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">1. Information We Collect</h2>
                        <p className="mb-2">We collect the following personal information to facilitate the recruitment process:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Identity Data:</strong> Full name, email address, phone number.</li>
                            <li><strong>Professional Data:</strong> Resume/CV, educational qualifications, skills, and work history.</li>
                            <li><strong>Assessment Data:</strong> Exam scores, code submissions, and interview responses.</li>
                            <li><strong>Proctoring Data:</strong> During exams, we capture video snapshots, audio logs, and tab-switch events to ensure integrity.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">2. Why We Collect Data</h2>
                        <p className="mb-2">Your data is used solely for:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Processing your job application.</li>
                            <li>Conducting AI-based skill assessments and exams.</li>
                            <li>Communicating interview schedules and results.</li>
                            <li>Ensuring fair and secure testing environments.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">3. How Data is Stored</h2>
                        <p className="mb-2">
                            All data is stored in secure, encrypted databases.
                            Resumes and proctoring assets are stored in secure cloud storage buckets with strict access controls restricted to authorized administrators.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">4. AI Processing</h2>
                        <p className="mb-2">
                            We utilize Artificial Intelligence to:
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Parse and score resumes against job descriptions (ATS).</li>
                            <li>Monitor exams for malpractice (Proctoring).</li>
                            <li>Conduct automated initial interview rounds.</li>
                        </ul>
                        <p className="mt-2 text-sm italic">
                            Note: AI serves as an assistant tool. Critical hiring decisions are reviewed by human administrators.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">5. Third-Party Services</h2>
                        <p className="mb-2">
                            We may use trusted third-party providers for specific functions, such as:
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Email delivery services (for OTPs and notifications).</li>
                            <li>Cloud storage and hosting providers.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">6. Data Retention & Deletion</h2>
                        <p className="mb-2">
                            We retain candidate data as long as the recruitment drive is active or as required for historical records.
                            You may request the deletion of your account and personal data at any time by contacting support.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">7. Your Rights</h2>
                        <p className="mb-2">
                            You have the right to access, correct, or request deletion of your personal data.
                            Please note that deleting data during an active application process may result in withdrawal of your candidature.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">8. No Data Selling</h2>
                        <p className="mb-2">
                            We strictly <strong>do not sell, trade, or rent</strong> your personal identification information to others.
                        </p>
                    </section>

                    <section className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                        <h2 className="text-xl font-bold text-blue-900 mb-2">Contact Us</h2>
                        <p className="text-blue-800">
                            If you have any questions about this Privacy Policy, please contact us at:
                            <br />
                            <a href="mailto:support@recruitaitech.in" className="font-bold underline hover:text-blue-600">
                                support@recruitaitech.in
                            </a>
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
