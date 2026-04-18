'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
    const { data: session } = useSession();
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
                    // Use CamelCase fields from updated API
                    setNotes(json.data.application.notes || json.data.application.admin_notes || '');
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

    const handleRefresh = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/candidates/${id}`);
            const json = await res.json();
            if (json.success) setData(json.data);
        } catch (e) {
            console.error("Refresh failed", e);
        } finally {
            setLoading(false);
        }
    };

    const saveNotes = async () => {
        setSavingNotes(true);
        try {
            const res = await fetch(`/api/admin/candidates/${id}/notes`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes })
            });
            const json = await res.json();
            if (!json.success) {
                alert("Failed to save notes: " + json.message);
            } else {
                console.log("Notes saved successfully");
            }
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

                        {/* 2. EDUCATION SECTION */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                                <h3 className="font-bold text-gray-800">Complete Education History</h3>
                            </div>
                            <div className="p-6 space-y-6">
                                {profile?.education ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Graduation */}
                                        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                                            <div className="text-[10px] uppercase font-black text-blue-500 mb-2">Graduation / Highest Degree</div>
                                            <div className="font-bold text-gray-900">{profile.education.graduation?.degree || profile.education.degree || "N/A"}</div>
                                            <div className="text-sm text-gray-700 mt-1">{profile.education.graduation?.college || profile.education.college || "N/A"}</div>
                                            <div className="text-xs text-gray-500 mt-2 font-medium">Class of {profile.education.graduation?.year || profile.education.year || "N/A"}</div>
                                        </div>

                                        {/* Intermediate/Diploma */}
                                        <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                                            <div className="text-[10px] uppercase font-black text-purple-500 mb-2">
                                                {profile.education.intermediate?.type === 'diploma' ? 'Diploma' : 'Intermediate (Class 12th)'}
                                            </div>
                                            <div className="font-bold text-gray-900">{profile.education.intermediate?.stream || profile.education.intermediate?.branch || "N/A"}</div>
                                            <div className="text-sm text-gray-700 mt-1">{profile.education.intermediate?.institute || "N/A"}</div>
                                            <div className="text-xs text-gray-500 mt-2 font-medium">Score: {profile.education.intermediate?.score || "N/A"} ({profile.education.intermediate?.year})</div>
                                        </div>

                                        {/* 10th Standard */}
                                        <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 col-span-1 md:col-span-2">
                                            <div className="text-[10px] uppercase font-black text-indigo-500 mb-2">Secondary Education (Class 10th)</div>
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <div className="font-bold text-gray-900">{profile.education.tenth?.school || "N/A"}</div>
                                                    <div className="text-xs text-gray-500">{profile.education.tenth?.board || "N/A"} Board</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-bold text-indigo-700">{profile.education.tenth?.score || "N/A"}</div>
                                                    <div className="text-[10px] text-gray-400">Year: {profile.education.tenth?.year}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : <p className="text-gray-400 text-sm text-center py-4">No detailed education data provided.</p>}
                            </div>
                        </div>

                        {/* 3. ADDRESS SECTION (NEW) */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                                <h3 className="font-bold text-gray-800">Address & Contact</h3>
                            </div>
                            <div className="p-6">
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div className="md:col-span-2">
                                        <div className="text-[10px] uppercase font-black text-gray-400 mb-1">Street Address</div>
                                        <div className="text-gray-900 font-medium">{profile?.address_street || profile?.addressStreet || application.address_street || "Not Provided"}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase font-black text-gray-400 mb-1">City</div>
                                        <div className="text-gray-900 font-medium">{profile?.address_city || profile?.addressCity || "Not Provided"}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase font-black text-gray-400 mb-1">State & Pincode</div>
                                        <div className="text-gray-900 font-medium">
                                            {profile?.address_state || profile?.addressState || "N/A"} - {profile?.address_pincode || profile?.addressPincode || "N/A"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. SKILLS & PREFERRED ROLES */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                                <h3 className="font-bold text-gray-800">Capabilities & Intent</h3>
                            </div>
                            <div className="p-6 space-y-6">
                                <div>
                                    <h4 className="text-[10px] uppercase text-gray-400 font-bold tracking-widest mb-3">Core Skills</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {profile?.skills && Array.isArray(profile.skills) ? (
                                            profile.skills.map((s: string, i: number) => (
                                                <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold border border-blue-200">
                                                    {s}
                                                </span>
                                            ))
                                        ) : <p className="text-gray-400 text-xs italic">No skills listed.</p>}
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-gray-50">
                                    <h4 className="text-[10px] uppercase text-gray-400 font-bold tracking-widest mb-3">Target Roles</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {(profile?.preferred_roles || profile?.preferredRoles || application.preferred_roles) ? (
                                            (Array.isArray(profile?.preferred_roles || profile?.preferredRoles || application.preferred_roles) 
                                                ? (profile?.preferred_roles || profile?.preferredRoles || application.preferred_roles)
                                                : (profile?.preferred_roles || profile?.preferredRoles || application.preferred_roles || "").split(',')
                                            ).map((role: string, i: number) => (
                                                <span key={i} className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-black border border-green-200 uppercase tracking-tighter">
                                                    {role.trim()}
                                                </span>
                                            ))
                                        ) : <p className="text-gray-400 text-xs italic">No roles selected.</p>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 5. EXAM & INTERVIEW HISTORY */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                                <h3 className="font-bold text-gray-800">Assessment History</h3>
                            </div>
                            <div className="p-6 space-y-6">
                                <div>
                                    <h4 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">📝</div>
                                        Entrance & Domain Exams
                                    </h4>
                                    {examResults.length > 0 ? (
                                        <div className="space-y-3">
                                            {examResults.map((exam: any) => (
                                                <div key={exam.id} className="bg-white border rounded-xl p-4 flex justify-between items-center shadow-sm hover:border-blue-500 transition-colors">
                                                    <div>
                                                        <div className="font-black text-gray-900">{exam.exams?.title || "Online Exam"}</div>
                                                        <div className="text-[10px] text-gray-400 font-bold">{new Date(exam.created_at).toLocaleString()}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-2xl font-black text-blue-600">{exam.total_score}</div>
                                                        <div className={`text-[10px] font-black uppercase tracking-widest ${exam.status === 'PASSED' ? 'text-green-500' : 'text-red-500'}`}>{exam.status}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-gray-400 text-sm italic text-center py-4 bg-gray-50 rounded-lg">No exam records found.</p>}
                                </div>

                                <div className="pt-6 border-t border-gray-100">
                                    <h4 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">🎥</div>
                                        Technical & AI Interviews
                                    </h4>
                                    {interviews.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {interviews.map((int: any) => (
                                                <div key={int.id} className="border rounded-xl p-4 bg-gray-50/30">
                                                    <div className="flex justify-between mb-3">
                                                        <span className="font-bold text-gray-900 text-sm">AI Technical Assessment</span>
                                                        <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-black uppercase tracking-tighter">
                                                            {new Date(int.scheduled_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="text-xs font-bold text-gray-500 capitalize">{int.status}</div>
                                                        {int.ai_score && (
                                                            <div className="text-lg font-black text-blue-600">{int.ai_score}<span className="text-[10px] text-gray-400 ml-1">/ 100</span></div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-gray-400 text-sm italic text-center py-4 bg-gray-50 rounded-lg">No interviews scheduled yet.</p>}
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="space-y-8">

                        {/* 6. ATS ANALYSIS */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-slate-900 p-8 text-white text-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                                <div className="text-5xl font-black mb-2">{application.aiAtsScore || application.ats_score || 0}%</div>
                                <div className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]">Match Compatibility</div>
                            </div>
                            <div className="p-6">
                                <h4 className="font-bold text-gray-900 mb-3 text-sm">AI Recommendation</h4>
                                <div className="text-xs text-gray-600 bg-gray-50 p-4 rounded-xl border-l-4 border-blue-500 mb-6 italic leading-relaxed">
                                    "{application.ats_summary || "Our AI engine is still analyzing the alignment between this candidate's resume and common industry requirements."}"
                                </div>

                                {/* Manual Score Saving Fix (C) */}
                                <div className="mb-6 bg-orange-50/50 border border-orange-200 rounded-2xl p-5 shadow-sm">
                                    <label className="block text-[10px] font-black text-orange-800 mb-1 uppercase tracking-widest">
                                        Manual Ranking Override
                                    </label>
                                    <p className="text-[10px] text-orange-600/70 mb-4 font-medium uppercase">
                                        Persistence Fix Layer Applied
                                    </p>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            className="w-full bg-white text-sm border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 font-bold px-3"
                                            placeholder="Score 0-100"
                                            id="manual-ats-score-v2"
                                            defaultValue={application.manualAtsScore || application.ats_score || ""}
                                        />
                                        <button
                                            onClick={async () => {
                                                const input = document.getElementById('manual-ats-score-v2') as HTMLInputElement;
                                                const score = input.value;
                                                if (!score) return;

                                                try {
                                                    const res = await fetch(`/api/admin/candidate/${id}/ats-score`, {
                                                        method: 'POST',
                                                        headers: { 
                                                            'Content-Type': 'application/json'
                                                        },
                                                        body: JSON.stringify({ score })
                                                    });
                                                    const json = await res.json();
                                                    if (json.success) {
                                                        alert('Score saved & Profile Updated!');
                                                        handleRefresh(); 
                                                    } else {
                                                        alert('Backend Error: ' + json.message);
                                                    }
                                                } catch (e) { alert('Network connection lost.'); }
                                            }}
                                            className="px-6 py-2 bg-orange-600 text-white text-[10px] font-black uppercase rounded-lg hover:bg-orange-700 shadow-md transform active:scale-95 transition-all"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>

                                {/* AI RE-ANALYZE SECTION */}
                                <div className="mb-6">
                                    <button
                                        disabled={loading}
                                        onClick={async (e) => {
                                            const btn = e.currentTarget;
                                            const originalText = btn.innerHTML;
                                            btn.disabled = true;
                                            btn.innerHTML = `<span class="flex items-center gap-2"><svg class="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Parsing resume...</span>`;
                                            
                                            try {
                                                const res = await fetch(`/api/admin/candidates/${id}/analyze`, { method: 'POST' });
                                                const json = await res.json();
                                                if (json.success) {
                                                    handleRefresh();
                                                } else {
                                                    alert(json.message || "AI Analysis failed to initiate.");
                                                }
                                            } catch (err) {
                                                alert("Network error during AI analysis.");
                                            } finally {
                                                btn.disabled = false;
                                                btn.innerHTML = originalText;
                                            }
                                        }}
                                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-xl shadow-blue-500/20 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        Trigger Deep AI Analysis
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {application.resume_url && (
                                        <a href={application.resume_url} target="_blank" className="flex items-center justify-center gap-2 w-full py-3 border-2 border-blue-100 bg-blue-50 text-blue-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-100/50 transition">
                                            👁️ View Candidate Resume
                                        </a>
                                    )}
                                    {application.resume_url && (
                                        <a 
                                            href={application.resume_url} 
                                            download={`Resume_${application.full_name.replace(/\s+/g, '_')}`} 
                                            className="flex items-center justify-center gap-2 w-full py-3 border-2 border-slate-100 bg-white text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition"
                                        >
                                            ⬇️ Download Resume PDF
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 7. PROCTORING & INTEGRITY */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-tighter">System Integrity</h3>
                                <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm ${proctoring.riskLevel === 'High' ? 'bg-red-50 text-red-700 border-red-200' :
                                    proctoring.riskLevel === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                        'bg-green-50 text-green-700 border-green-200'
                                    }` } >
                                    {proctoring.riskLevel} Risk
                                </div>
                            </div>
                            <div className="p-8">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Violations Flagged</span>
                                    <span className={`text-xl font-black ${proctoring.violations > 5 ? 'text-red-600' : 'text-gray-900'}`}>{proctoring.violations}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
                                    <div
                                        className={`h-full rounded-full shadow-sm transition-all duration-1000 ${proctoring.violations > 5 ? 'bg-red-500' : proctoring.violations > 2 ? 'bg-orange-500' : 'bg-green-500'}`}
                                        style={{ width: `${Math.min(proctoring.violations * 15, 100)}%` }}
                                    ></div>
                                </div>
                                <p className="text-[9px] text-gray-400 mt-4 leading-relaxed font-medium">
                                    AI Proctoring engine scans for duplicate tabs, browser switches, and facial presence inconsistencies during high-stakes exams.
                                </p>
                            </div>
                        </div>

                        {/* 8. ADMIN NOTES (Fix B) */}
                        <div className="bg-yellow-50/50 rounded-2xl shadow-sm border border-yellow-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-yellow-100 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                                <h3 className="font-bold text-yellow-900 text-sm">Privileged Admin Notes</h3>
                            </div>
                            <div className="p-4">
                                <textarea
                                    className="w-full bg-white border border-yellow-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-inner font-medium text-gray-700"
                                    rows={5}
                                    placeholder="Add private observations, interview notes, or concern flags..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                ></textarea>
                                <div className="flex justify-end mt-4">
                                    <button
                                        onClick={async () => {
                                            setSavingNotes(true);
                                            try {
                                                const res = await fetch(`/api/admin/candidate/${id}/notes`, {
                                                    method: 'POST',
                                                    headers: { 
                                                        'Content-Type': 'application/json',
                                                        'Authorization': 'Bearer session'
                                                    },
                                                    body: JSON.stringify({ notes })
                                                });
                                                const json = await res.json();
                                                if (json.success) {
                                                    alert("Internal notes synchronized!");
                                                } else {
                                                    alert("Persistence failure: " + json.message);
                                                }
                                            } catch (e) {
                                                alert("Network latency detected.");
                                            } finally {
                                                setSavingNotes(false);
                                            }
                                        }}
                                        disabled={savingNotes}
                                        className="px-6 py-2.5 bg-yellow-600 text-white text-[10px] font-black uppercase rounded-xl shadow-lg hover:bg-yellow-700 transform active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {savingNotes ? 'Saving...' : 'Lock & Save Notes 📑'}
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
