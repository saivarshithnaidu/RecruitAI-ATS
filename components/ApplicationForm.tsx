'use client';

import { useState } from 'react';

export default function ApplicationForm() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        setLoading(true);
        setMessage('');
        setStatus('idle');

        const formData = new FormData(form);

        try {
            const res = await fetch('/api/apply', {
                method: 'POST',
                body: formData,
            });

            // Safely parse JSON
            let data;
            try {
                data = await res.json();
            } catch (err) {
                console.error("Failed to parse JSON:", err);
                throw new Error('Server returned an invalid response (not JSON)');
            }

            if (!res.ok) {
                // Handle 401/403 specifically
                if (res.status === 401) {
                    setMessage("Session expired. Redirecting to login...");
                    setTimeout(() => window.location.href = '/auth/login', 1500);
                    return;
                }
                throw new Error(data.message || 'Submission failed');
            }

            if (data.success) {
                setStatus('success');
                setMessage(data.message);
                form.reset();
                // Redirect to My Application
                setTimeout(() => {
                    window.location.href = '/candidate/application';
                }, 1000);
            } else {
                setStatus('error');
                setMessage(data.message || 'Submission failed');
            }
        } catch (error: any) {
            console.error('Form submission error:', error);
            setStatus('error');
            setMessage(error.message || 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-lg mx-auto p-6 bg-white shadow-md rounded-lg">
            <h2 className="text-2xl font-bold mb-6">Job Application</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Full Name</label>
                    <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    />
                </div>

                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    />
                </div>

                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</label>
                    <input
                        id="phone"
                        name="phone"
                        type="tel"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    />
                </div>

                <div>
                    <label htmlFor="resume" className="block text-sm font-medium text-gray-700">Resume (DOC, DOCX only)</label>
                    <input
                        id="resume"
                        name="resume"
                        type="file"
                        accept=".doc,.docx"
                        required
                        className="mt-1 block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
            ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}`}
                >
                    {loading ? 'Submitting...' : 'Submit Application'}
                </button>

                {message && (
                    <div className={`mt-4 p-3 rounded ${status === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                        {message}
                    </div>
                )}
            </form>
        </div>
    );
}
