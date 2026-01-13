"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createExam } from "@/app/actions/exams";

export default function CreateExamPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        role: "",
        skills: "",
        difficulty: "Medium" as "Easy" | "Medium" | "Hard",
        duration_minutes: 60,
        pass_mark: 40
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const skillsArray = formData.skills.split(',').map(s => s.trim()).filter(s => s.length > 0);

            if (skillsArray.length === 0) {
                throw new Error("Please enter at least one skill.");
            }

            const result = await createExam({
                ...formData,
                skills: skillsArray,
                duration_minutes: Number(formData.duration_minutes),
                pass_mark: Number(formData.pass_mark)
            });

            if (result.error) {
                throw new Error(result.error);
            }

            // Success
            router.push('/admin/exams');
            router.refresh();

        } catch (err: any) {
            setError(err.message || "Failed to create exam.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-3xl mx-auto">
            <div className="mb-8">
                <Link href="/admin/exams" className="text-blue-600 hover:underline mb-2 block">
                    &larr; Back to Exams
                </Link>
                <h1 className="text-3xl font-bold text-gray-800">Create New AI Exam</h1>
                <p className="text-gray-500 mt-2">
                    Define the role and skills, and our AI will generate a 13-question exam (10 MCQ, 2 Short, 1 Coding).
                </p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded mb-6 border border-red-200">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 space-y-6">

                {/* Basic Info */}
                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title</label>
                        <input
                            type="text"
                            name="title"
                            required
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="e.g. Senior React Developer Assessment"
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            name="description"
                            rows={3}
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Brief description for candidates..."
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                <div className="h-px bg-gray-200 my-6"></div>

                {/* AI Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Role</label>
                        <input
                            type="text"
                            name="role"
                            required
                            value={formData.role}
                            onChange={handleChange}
                            placeholder="e.g. Frontend Engineer"
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                        <select
                            name="difficulty"
                            value={formData.difficulty}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Skills (Comma Separated)</label>
                        <input
                            type="text"
                            name="skills"
                            required
                            value={formData.skills}
                            onChange={handleChange}
                            placeholder="e.g. React, TypeScript, Next.js, CSS"
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">The AI will use these skills to generate relevant questions.</p>
                    </div>
                </div>

                <div className="h-px bg-gray-200 my-6"></div>

                {/* Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Minutes)</label>
                        <input
                            type="number"
                            name="duration_minutes"
                            min="10"
                            max="180"
                            required
                            value={formData.duration_minutes}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pass Mark (Total: 100)</label>
                        <input
                            type="number"
                            name="pass_mark"
                            min="1"
                            max="100"
                            required
                            value={formData.pass_mark}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                <div className="pt-6">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                            }`}
                    >
                        {isLoading ? (
                            <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Generating Exam with AI...
                            </span>
                        ) : (
                            "Create Exam"
                        )}
                    </button>
                    <p className="text-center text-xs text-gray-500 mt-4">
                        Note: This may take 30-60 seconds depending on your local AI model speed.
                    </p>
                </div>

            </form>
        </div>
    );
}
