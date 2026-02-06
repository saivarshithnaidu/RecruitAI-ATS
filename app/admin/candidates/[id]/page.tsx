'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ROLES } from '@/lib/roles';
import Link from 'next/link';

// Helper for skill tags
const SkillTag = ({ skill }: { skill: string }) => (
    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-semibold border border-blue-100 mr-2 mb-2 inline-block">
        {skill}
    </span>
);

export default function CandidateProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [savingNotes, setSavingNotes] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch(`/api/admin/candidates/${id}`);
                const json = await res.json();
                if (json.success) {
                    setData(json.data);
                    setNotes(json.data.application.admin_notes || '');
                } else {
                    setError(json.message);
                }
            } catch (e) {
                setError("Failed to load profile.");
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [id]);

    const saveNotes = async () => {
        setSavingNotes(true);
        try {
            const res = await fetch('/api/admin/application/update-notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ applicationId: id, notes })
            });
            const json = await res.json();
            if (!json.success) alert("Failed to save notes");
        } catch (e) {
            alert("Error saving notes");
        } finally {
            setSavingNotes(false);
        }
    };

    // Status color helper
    const getStatusColor = (status: string) => {
        if (['HIRED', 'EXAM_PASSED', 'SCORED_AI'].includes(status)) return 'bg-green-100 text-green-800';
        if (['REJECTED', 'EXAM_FAILED'].includes(status)) return 'bg-red-100 text-red-800';
        if (status === 'SHORTLISTED') return 'bg-blue-100 text-blue-800';
        return 'bg-gray-100 text-gray-800';
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading Candidate Profile...</div>;
    if (error) return <div className="p-8 text-center text-red-600">Error: {error}</div>;
    if (!data) return null;

    const { application, profile, examResults, interviews, proctoring } = data;

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-10">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* 1. HEADER */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row items-center md:items-start gap-6">
                    <div className="relative">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white shadow-md bg-gray-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={profile?.profile_photo_url || "/default-avatar.png"}
                                alt={application.full_name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        {profile?.verification_status === 'verified' && (
                            <div className="absolute bottom-1 right-1 bg-green-500 text-white p-1 rounded-full border-2 border-white" title="Verified ID">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{application.full_name}</h1>
                                <div className="text-gray-500 text-sm mt-1 space-x-2">
                                    <span>{application.email}</span>
                                    <span>•</span>
                                    <span>{application.phone}</span>
                                    <span>•</span>
                                    <span>ID: {application.id.slice(0, 8)}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 justify-center">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusColor(application.status)}`}>
                                    {application.status.replace(/_/g, " ")}
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-2 justify-center md:justify-start">
                            {/* Actions Placeholder - functional actions exist in list, replicating some here would require replicating logic or new APIs */}
                            <Link href="/admin/dashboard" className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                                ← Back to Dashboard
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* 2. EDUCATION & EXPERIENCE */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                                <h3 className="font-bold text-gray-800">Education & Experience</h3>
                            </div>
                            <div className="p-6 space-y-6">
                                <div>
                                    <h4 className="text-xs uppercase text-gray-400 font-bold tracking-wider mb-3">Education</h4>
                                    {profile?.education ? (
                                        <div className="space-y-3">
                                            {/* Graduation (New & Old Support) */}
                                            {(profile.education.graduation || profile.education.degree) && (
                                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                    <div className="text-xs text-blue-600 font-bold uppercase mb-1">Graduation</div>
                                                    <div className="font-bold text-gray-900">
                                                        {profile.education.graduation?.degree || profile.education.degree}
                                                    </div>
                                                    <div className="text-gray-600 text-sm">
                                                        {profile.education.graduation?.college || profile.education.college}
                                                    </div>
                                                    <div className="text-gray-400 text-xs mt-1">
                                                        Class of {profile.education.graduation?.year || profile.education.year}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Intermediate / Diploma */}
                                            {profile.education.intermediate && (
                                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                    <div className="text-xs text-blue-600 font-bold uppercase mb-1">
                                                        {profile.education.intermediate.type === 'diploma' ? 'Diploma' : 'Class 12th'}
                                                    </div>
                                                    <div className="font-bold text-gray-900">
                                                        {profile.education.intermediate.stream || profile.education.intermediate.branch || "N/A"}
                                                    </div>
                                                    <div className="text-gray-600 text-sm">
                                                        {profile.education.intermediate.institute || profile.education.intermediate.college}
                                                    </div>
                                                    <div className="text-gray-400 text-xs mt-1">
                                                        Score: {profile.education.intermediate.score}
                                                    </div>
                                                </div>
                                            )}

                                            {/* 10th Class */}
                                            {profile.education.tenth && (
                                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                    <div className="text-xs text-blue-600 font-bold uppercase mb-1">Class 10th</div>
                                                    <div className="font-bold text-gray-900">
                                                        {profile.education.tenth.board}
                                                    </div>
                                                    <div className="text-gray-600 text-sm">
                                                        {profile.education.tenth.school}
                                                    </div>
                                                    <div className="text-gray-400 text-xs mt-1">
                                                        Score: {profile.education.tenth.score}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : <p className="text-gray-400 text-sm">No education data.</p>}
                                </div>

                                <div>
                                    <h4 className="text-xs uppercase text-gray-400 font-bold tracking-wider mb-3">Professional Skills</h4>
                                    <div className="flex flex-wrap">
                                        {profile?.skills && Array.isArray(profile.skills) ? (
                                            profile.skills.map((s: string, i: number) => <SkillTag key={i} skill={s} />)
                                        ) : <p className="text-gray-400 text-sm">No skills listed.</p>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. EXAM & INTERVIEW HISTORY */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <h3 className="font-bold text-gray-800">Assessment History</h3>
                            </div>
                            <div className="p-6 space-y-6">
                                {/* Exam Results */}
                                <div>
                                    <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                        <span className="p-1 bg-purple-100 text-purple-600 rounded">📝</span> Online Exams
                                    </h4>
                                    {examResults.length > 0 ? (
                                        <div className="space-y-3">
                                            {examResults.map((exam: any) => (
                                                <div key={exam.id} className="border border-gray-100 rounded-lg p-4 flex justify-between items-center">
                                                    <div>
                                                        <div className="font-bold text-gray-900">{exam.exams?.title || "Unknown Exam"}</div>
                                                        <div className="text-xs text-gray-500">{new Date(exam.created_at).toLocaleDateString()}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xl font-bold text-gray-900">{exam.total_score} <span className="text-xs text-gray-400 font-normal">/ 100</span></div>
                                                        <div className={`text-xs font-bold uppercase ${exam.status === 'PASSED' ? 'text-green-600' : 'text-red-500'}`}>{exam.status}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-gray-400 text-sm italic">No exams taken yet.</p>}
                                </div>

                                {/* Interviews */}
                                <div className="border-t border-gray-100 pt-6">
                                    <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                        <span className="p-1 bg-blue-100 text-blue-600 rounded">🎥</span> AI Interviews
                                    </h4>
                                    {interviews.length > 0 ? (
                                        <div className="space-y-3">
                                            {interviews.map((int: any) => (
                                                <div key={int.id} className="border border-gray-100 rounded-lg p-4">
                                                    <div className="flex justify-between mb-2">
                                                        <span className="font-bold text-gray-900">Technical Interview</span>
                                                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">{new Date(int.scheduled_at).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <div className="text-gray-500 text-xs">Status</div>
                                                            <div className="font-medium capitalize">{int.status}</div>
                                                        </div>
                                                        {int.ai_score && (
                                                            <div>
                                                                <div className="text-gray-500 text-xs">AI Score</div>
                                                                <div className="font-bold text-blue-600">{int.ai_score}/100</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-gray-400 text-sm italic">No interviews scheduled.</p>}
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="space-y-8">

                        {/* 3. ATS ANALYSIS */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-6 text-white text-center">
                                <div className="text-4xl font-bold mb-1">{application.ats_score}%</div>
                                <div className="text-blue-100 text-sm font-medium">ATS Compatibility Score</div>
                            </div>
                            <div className="p-6">
                                <h4 className="font-bold text-gray-800 mb-3 text-sm">Analysis Summary</h4>
                                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                                    {application.ats_summary || "No detailed summary available from AI analysis yet."}
                                </p>

                                {/* Manual Score Input (Only if Failed/Pending/Zero) */}
                                {(application.resume_parse_status === 'FAILED' || application.ats_score === 0) && (
                                    <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-3">
                                        <label className="block text-xs font-bold text-orange-800 mb-1">
                                            Admin Manual Override
                                        </label>
                                        <p className="text-xs text-orange-600 mb-2">
                                            Resume parsing failed. Please assign a score manually.
                                        </p>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                className="w-20 text-sm border-gray-300 rounded focus:ring-orange-500 focus:border-orange-500"
                                                placeholder="0-100"
                                                id="manual-ats-score"
                                            />
                                            <button
                                                onClick={async () => {
                                                    const input = document.getElementById('manual-ats-score') as HTMLInputElement;
                                                    const score = input.value;
                                                    if (!score) return;

                                                    try {
                                                        const res = await fetch('/api/admin/application/manual-score', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ applicationId: application.id, score })
                                                        });
                                                        const json = await res.json();
                                                        if (json.success) {
                                                            alert('Score updated');
                                                            window.location.reload();
                                                        } else {
                                                            alert('Error: ' + json.message);
                                                        }
                                                    } catch (e) { alert('Network error'); }
                                                }}
                                                className="px-3 py-1 bg-orange-600 text-white text-xs font-bold rounded hover:bg-orange-700"
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {application.manual_ats_score && (
                                    <div className="mb-4 inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded border border-gray-200">
                                        ℹ Manually assigned by Admin
                                    </div>
                                )}

                                {application.resume_url && (
                                    <a href={application.resume_url} target="_blank" className="block w-full text-center py-2 border border-blue-300 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition">
                                        📄 View Original Resume
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* 5. PROCTORING & INTEGRITY */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="font-bold text-gray-800 text-sm">Integrity Check</h3>
                                <span className={`px-2 py-0.5 rounded text-xs fonts-bold border ${proctoring.riskLevel === 'High' ? 'bg-red-50 text-red-700 border-red-100' :
                                    proctoring.riskLevel === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                        'bg-green-50 text-green-700 border-green-100'
                                    }`}>
                                    {proctoring.riskLevel} Risk
                                </span>
                            </div>
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-gray-600">Violations Detected</span>
                                    <span className="font-bold text-gray-900">{proctoring.violations}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
                                    <div
                                        className={`h-1.5 rounded-full ${proctoring.violations > 0 ? 'bg-red-500' : 'bg-green-500'}`}
                                        style={{ width: `${Math.min(proctoring.violations * 20, 100)}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                    Based on webcam/tab-switch logs from exams.
                                </p>
                            </div>
                        </div>

                        {/* 6. ADMIN NOTES */}
                        <div className="bg-yellow-50 rounded-xl shadow-sm border border-yellow-200 overflow-hidden">
                            <div className="px-6 py-3 border-b border-yellow-100">
                                <h3 className="font-bold text-yellow-800 text-sm">Internal Admin Notes</h3>
                            </div>
                            <div className="p-4">
                                <textarea
                                    className="w-full bg-white border border-yellow-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                    rows={4}
                                    placeholder="Add private notes about this candidate..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                ></textarea>
                                <div className="flex justify-end mt-2">
                                    <button
                                        onClick={saveNotes}
                                        disabled={savingNotes}
                                        className="px-3 py-1.5 bg-yellow-600 text-white text-xs font-bold rounded shadow-sm hover:bg-yellow-700 transition disabled:opacity-50"
                                    >
                                        {savingNotes ? 'Saving...' : 'Save Notes'}
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
