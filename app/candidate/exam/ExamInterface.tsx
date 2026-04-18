"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { startExam, submitExam } from "@/app/actions/exams";
import { useRouter, useSearchParams } from "next/navigation";
import CodingEditor from "./CodingEditor";
import CodeAnalysisViewer from "./CodeAnalysisViewer";
import DualCameraSetup from "@/components/candidate/DualCameraSetup";
import ProctorLiveKit from "@/components/candidate/ProctorLiveKit";

export default function ExamInterface({ exam, initialStatus }: { exam: any, initialStatus: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token") || undefined;
    const [status, setStatus] = useState(initialStatus); // 'assigned', 'in_progress', 'completed'

    // Data State
    const [sections, setSections] = useState<any[]>([]); // New 3-section structure
    const [legacyQuestions, setLegacyQuestions] = useState<any[]>([]); // Fallback

    // UI State
    const [activeSectionId, setActiveSectionId] = useState<string>("");
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // [NEW] Track current question
    const [answers, setAnswers] = useState<Record<string, string>>({});

    // Timer
    const durationMins = Number(exam.exams?.duration_minutes) || 60;
    const [timeLeft, setTimeLeft] = useState(durationMins * 60);

    // Status
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    // --- PROCTORING STATE ---
    const [tabSwitches, setTabSwitches] = useState(0);
    const [fullscreenExits, setFullscreenExits] = useState(0);
    const [cameraVerified, setCameraVerified] = useState(false);
    const [micVerified, setMicVerified] = useState(false);
    const [mobileVerified, setMobileVerified] = useState(false); // [DUAL CAM]

    // LiveKit State
    const [liveKitToken, setLiveKitToken] = useState<string>("");

    // --- PROCTORING CONFIG ---
    const config = exam.proctoring_config || { camera: true, mic: true, tab_switch: true, copy_paste: true, dual_camera: false };

    // --- LOGGING HELPER ---
    const logEvent = useCallback(async (type: string, details: any = {}) => {
        try {
            await fetch('/api/proctor/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assignmentId: exam.id,
                    candidateId: exam.candidate_id,
                    eventType: type,
                    details
                })
            });
        } catch (e) {
            console.error("Failed to log event:", e);
        }
    }, [exam.id, exam.candidate_id]);

    // --- ACTIONS ---

    const handleSubmit = useCallback(async (auto = false) => {
        if (submitting) return;
        setSubmitting(true);

        if (document.fullscreenElement) {
            try { await document.exitFullscreen(); } catch (e) {}
        }

        try {
            const proctoringData = {
                tab_switches: tabSwitches,
                fullscreen_exits: fullscreenExits + (auto ? 1 : 0),
                auto_submitted: auto,
                flagged: (tabSwitches > 2 || fullscreenExits > 0)
            };

            const res = await submitExam(exam.id, answers, proctoringData, token);
            if (res.error) throw new Error(res.error);
            router.refresh();
        } catch (e: any) {
            if (!auto) {
                setError(e.message);
                alert(`Submission Failed: ${e.message}`);
            }
        } finally {
            setSubmitting(false);
        }
    }, [submitting, tabSwitches, fullscreenExits, answers, exam.id, router, token]);

    const performSystemCheck = async () => {
        setError("");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            stream.getTracks().forEach(t => t.stop());

            const res = await fetch('/api/proctor/livekit-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomName: `exam-${exam.id}`,
                    participantName: exam.application?.full_name || `Candidate-${exam.candidate_id}`,
                    role: 'publisher'
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to connect to proctoring server");

            setLiveKitToken(data.token);
            setCameraVerified(true);
            setMicVerified(true);

            return true;
        } catch (err: any) {
            console.error("System Check Error:", err);
            setError("Camera/Mic permission denied or server error. Please allow access.");
            setCameraVerified(false);
            setMicVerified(false);
            return false;
        }
    };

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const res = await startExam(exam.id, token);
            if (res.error) throw new Error(res.error);

            if (res.sections) {
                setSections(res.sections);
                if (res.sections.length > 0) setActiveSectionId(res.sections[0].id);
            } else if (res.questions) {
                setLegacyQuestions(res.questions);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleStart = async () => {
        const needsCam = config.camera || config.mic;
        const needsMobile = true;

        if (needsCam && (!cameraVerified || !liveKitToken)) {
            setError("Please complete the Laptop System Check.");
            return;
        }

        if (needsMobile && !mobileVerified) {
            setError("MANDATORY: Mobile 'Third Eye' connection is required to start.");
            return;
        }

        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            }
        } catch (e) {
            console.error(e);
            setError("Fullscreen mode is mandatory. Please confirm execution.");
            return;
        }

        setLoading(true);

        try {
            const res = await startExam(exam.id, token);
            if (res.error) throw new Error(res.error);

            setStatus('in_progress');
            if (res.sections) {
                setSections(res.sections);
                setActiveSectionId(res.sections[0]?.id || "");
            } else if (res.questions) {
                setLegacyQuestions(res.questions);
            }
            if (res.started_at) setTimeLeft((durationMins * 60));

            router.refresh();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    // --- EFFECTS ---

    useEffect(() => {
        if (status === 'in_progress' && exam.started_at) {
            const start = new Date(exam.started_at).getTime();
            const now = new Date().getTime();
            const elapsed = Math.floor((now - start) / 1000);
            const remaining = (durationMins * 60) - elapsed;

            if (remaining <= 0) {
                handleSubmit(true);
            } else {
                setTimeLeft(remaining);
                fetchQuestions();
                if (!liveKitToken) {
                    performSystemCheck();
                }
            }
        }
    }, [status, exam.started_at, durationMins, handleSubmit, liveKitToken]);

    useEffect(() => {
        setCurrentQuestionIndex(0);
    }, [activeSectionId]);

    useEffect(() => {
        if (status !== 'in_progress') return;
        
        const heartbeat = setInterval(() => {
            logEvent('HEARTBEAT', { timeLeft });
        }, 30000);

        return () => clearInterval(heartbeat);
    }, [status, timeLeft, logEvent]);

    useEffect(() => {
        if (status !== 'in_progress' || timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [status, timeLeft, handleSubmit]);

    useEffect(() => {
        if (status !== 'in_progress') return;

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            logEvent('RIGHT_CLICK');
        };
        window.addEventListener('contextmenu', handleContextMenu);

        const handleCopyPaste = (e: ClipboardEvent) => {
            if (config.copy_paste) {
                e.preventDefault();
                logEvent(e.type.toUpperCase());
                alert("Copy/Paste/Cut is disabled during the exam.");
            }
        };
        if (config.copy_paste) {
            window.addEventListener('paste', handleCopyPaste);
            window.addEventListener('copy', handleCopyPaste);
            window.addEventListener('cut', handleCopyPaste);
        }

        const handleVisibilityChange = () => {
            if (document.hidden) {
                setTabSwitches(prev => prev + 1);
                logEvent('TAB_SWITCH');
            }
        };
        if (config.tab_switch) {
            document.addEventListener('visibilitychange', handleVisibilityChange);
        }

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                setFullscreenExits(prev => {
                    const newVal = prev + 1;
                    logEvent('FULLSCREEN_EXIT', { count: newVal });
                    if (newVal >= 3) handleSubmit(true);
                    return newVal;
                });
            }
        };

        if (config.tab_switch) {
            document.addEventListener('fullscreenchange', handleFullscreenChange);
            if (!document.fullscreenElement) {
                setTimeout(() => {
                    if (!document.fullscreenElement) {
                        setFullscreenExits(prev => prev === 0 ? 1 : prev + 1);
                    }
                }, 2000);
            }
        }

        return () => {
            window.removeEventListener('contextmenu', handleContextMenu);
            if (config.copy_paste) {
                window.removeEventListener('paste', handleCopyPaste);
                window.removeEventListener('copy', handleCopyPaste);
                window.removeEventListener('cut', handleCopyPaste);
            }
            if (config.tab_switch) {
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                document.removeEventListener('fullscreenchange', handleFullscreenChange);
            }
        };
    }, [status, logEvent, config, handleSubmit]);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec < 10 ? '0' : ''}${sec}`;
    };

    // --- RENDER --- (keeping the rest of the render logic as is, it's too long to overwrite completely without caution but I'll do it to ensure no errors)
    // Actually, I'll just finish the write_to_file with the full original UI logic to be safe.
    
    if (status === 'assigned') {
        const isDualCam = config.dual_camera;
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white max-w-4xl w-full p-8 rounded-xl shadow-lg border text-center my-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">{exam.exams.title}</h1>
                    <p className="text-gray-600 mb-8 max-w-2xl mx-auto">{exam.exams.description}</p>
                    <div className="bg-blue-50 text-blue-800 p-6 rounded-lg text-left mb-8 space-y-2">
                        <h3 className="font-bold border-b border-blue-200 pb-2 mb-2">Exam Rules</h3>
                        <li>Duration: <strong>{durationMins} mins</strong></li>
                        {config.tab_switch && <li><strong>Fullscreen & No Tab Switching:</strong> Violations are logged.</li>}
                        <li><strong>Camera Priority:</strong> {isDualCam ? "Dual Camera (Laptop + Mobile)" : "Laptop Camera Only"}</li>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        {(config.camera || config.mic) && (
                            <div className="flex flex-col items-center gap-4 p-4 border rounded-lg bg-gray-50">
                                <h4 className="font-bold text-gray-700">1. Laptop Camera Check</h4>
                                <div className="w-64 h-48 bg-black rounded-lg overflow-hidden relative border-4 border-gray-200 flex items-center justify-center shadow-inner">
                                    {liveKitToken ? (
                                        <div className="w-full h-full">
                                            <ProctorLiveKit
                                                token={liveKitToken}
                                                serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || ""}
                                                onConnect={() => setCameraVerified(true)}
                                                onDisconnect={() => setCameraVerified(false)}
                                            />
                                        </div>
                                    ) : (
                                        <div className="text-gray-500 text-sm flex flex-col items-center">
                                            <span>Camera Preview</span>
                                        </div>
                                    )}
                                </div>
                                {!liveKitToken ? (
                                    <button onClick={performSystemCheck} className="px-6 py-2 bg-gray-800 text-white rounded hover:bg-black transition text-sm">
                                        Activate Laptop Camera
                                    </button>
                                ) : (
                                    <div className="text-green-600 font-bold flex items-center gap-2 text-sm">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                        System Ready
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="flex flex-col items-center gap-4 p-4 border rounded-lg bg-gray-50">
                            <h4 className="font-bold text-gray-700">2. Mobile "Third Eye" Check (Required)</h4>
                            <DualCameraSetup
                                examId={exam.id}
                                userId="candidate"
                                onReady={(ready) => setMobileVerified(ready)}
                            />
                        </div>
                    </div>
                    {error && <div className="text-red-600 bg-red-50 p-3 rounded mb-6 max-w-xl mx-auto border border-red-200">{error}</div>}
                    <div className="max-w-md mx-auto">
                        <button
                            onClick={handleStart}
                            disabled={((config.camera || config.mic) && !cameraVerified) || !mobileVerified || loading}
                            className={`w-full py-4 text-lg font-bold rounded-xl text-white transition shadow-lg flex items-center justify-center gap-2
                                ${(((config.camera || config.mic) && !cameraVerified) || !mobileVerified || loading) ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-green-600 hover:bg-green-700 transform hover:-translate-y-1'}
                            `}
                        >
                            {loading ? 'Starting...' : 'Start Exam'}
                        </button>
                        <p className="text-xs text-gray-400 mt-2">By starting, you agree to be recorded via LiveKit Proctoring.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (status === 'in_progress') {
        const activeSection = sections.find(s => s.id === activeSectionId);
        const displayQuestions = activeSection ? activeSection.questions : legacyQuestions;
        const currentQuestion = displayQuestions[currentQuestionIndex];

        return (
            <div className="min-h-screen bg-gray-100 flex flex-col relative">
                {(status === 'in_progress' && (config.camera || config.mic) && !cameraVerified) && (
                    <div className="fixed inset-0 bg-black/95 z-[999] flex flex-col items-center justify-center text-white text-center p-8">
                        <div className="animate-pulse mb-6 text-red-500">
                            <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
                        </div>
                        <h2 className="text-4xl font-bold mb-4">Proctoring Disconnected</h2>
                        <p className="text-xl text-gray-300 mb-8 max-w-lg">Your camera signal was lost. Reconnecting...</p>
                        <button onClick={performSystemCheck} className="px-6 py-3 bg-blue-600 rounded font-bold hover:bg-blue-700">Reconnect Manually</button>
                    </div>
                )}
                <div className="bg-white shadow-sm border-b px-6 py-3 flex justify-between items-center sticky top-0 z-50">
                    <div className="flex items-center gap-4">
                        <h2 className="font-bold text-gray-800 truncate max-w-xs">{exam.exams.title}</h2>
                        <div className="w-24 h-16 bg-black rounded overflow-hidden border border-gray-300 shadow-inner relative group">
                            {liveKitToken && <ProctorLiveKit token={liveKitToken} serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || ""} onConnect={() => setCameraVerified(true)} onDisconnect={() => setCameraVerified(false)} />}
                        </div>
                        <div className="flex gap-2 text-xs">
                            {tabSwitches > 0 && <span className="text-orange-600 font-semibold">⚠ Tabs: {tabSwitches}</span>}
                            {fullscreenExits > 0 && <span className="text-red-600 font-semibold">⚠ Fullscreen: {fullscreenExits}</span>}
                        </div>
                    </div>
                    <div className={`px-4 py-2 font-mono text-xl font-bold rounded ${timeLeft < 300 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-800'}`}>{formatTime(timeLeft)}</div>
                </div>
                <div className="flex flex-1 overflow-hidden">
                    <div className="w-64 bg-white border-r overflow-y-auto hidden md:flex flex-col">
                        <div className="p-4 border-b bg-gray-50">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Section</label>
                            <select className="w-full border rounded p-2 text-sm bg-white" value={activeSectionId} onChange={(e) => setActiveSectionId(e.target.value)}>
                                {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                            </select>
                        </div>
                        <div className="p-4 grid grid-cols-5 gap-2 content-start">
                            {displayQuestions.map((q: any, idx: number) => (
                                <button key={q.id} onClick={() => setCurrentQuestionIndex(idx)} className={`aspect-square rounded text-xs font-bold flex items-center justify-center transition border ${idx === currentQuestionIndex ? 'bg-blue-600 text-white border-blue-600' : !!answers[q.id] ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white text-gray-600 border-gray-200'}}`}>{idx + 1}</button>
                            ))}
                        </div>
                        <div className="mt-auto p-4 border-t bg-gray-50">
                            <button onClick={() => { if (confirm("Finish exam?")) handleSubmit(false); }} disabled={submitting} className={`w-full py-3 rounded-lg font-bold text-white ${submitting ? 'bg-gray-400' : 'bg-red-600'}`}>{submitting ? 'Submitting...' : 'Finish Exam'}</button>
                        </div>
                    </div>
                    <main className="flex-1 overflow-y-auto p-6 relative flex flex-col items-center bg-gray-100/50">
                        {loading ? <div className="text-center py-20 text-gray-500">Loading questions...</div> : currentQuestion ? (
                            <div className="w-full max-w-4xl flex-1 flex flex-col h-full">
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
                                    <div className="bg-gray-50 px-8 py-5 border-b flex justify-between items-center shrink-0">
                                        <h3 className="text-lg font-bold text-gray-800">Question {currentQuestionIndex + 1}</h3>
                                        <span className="text-xs font-bold px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full">{currentQuestion.type}</span>
                                    </div>
                                    <div className="p-8 flex-1 overflow-y-auto">
                                        {(currentQuestion.type === 'coding' || currentQuestion.type === 'code-analysis') ? (
                                            <CodeAnalysisViewer question={currentQuestion} assignmentId={exam.id} questionIdx={currentQuestionIndex} onStatusChange={(ans) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: ans }))} />
                                        ) : (
                                            <div className="space-y-8">
                                                <p className="text-xl text-gray-800">{currentQuestion.question}</p>
                                                {currentQuestion.type === 'mcq' && (
                                                    <div className="space-y-3">
                                                        {currentQuestion.options.map((opt: string, i: number) => (
                                                            <label key={i} className={`flex items-center p-4 rounded-xl border-2 cursor-pointer ${answers[currentQuestion.id] === opt ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                                                                <input type="radio" name={currentQuestion.id} value={opt} checked={answers[currentQuestion.id] === opt} onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))} className="mr-4" />
                                                                {opt}
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-gray-50 px-8 py-5 border-t flex justify-between shrink-0">
                                        <button onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))} disabled={currentQuestionIndex === 0}>Previous</button>
                                        <button onClick={() => { if (currentQuestionIndex < displayQuestions.length - 1) setCurrentQuestionIndex(prev => prev + 1); }}>Next</button>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </main>
                </div>
                {fullscreenExits > 0 && fullscreenExits < 3 && cameraVerified && (
                    <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center text-white text-center p-8 backdrop-blur-sm">
                        <div className="bg-gray-900 p-10 rounded-2xl border border-red-500 shadow-2xl">
                            <h2 className="text-4xl font-bold text-red-500 mb-6">WARNING</h2>
                            <p>Exited fullscreen {fullscreenExits}/3. Automatic submission on 3rd violation.</p>
                            <button onClick={() => document.documentElement.requestFullscreen()} className="px-8 py-3 bg-red-600 rounded-lg font-bold mt-4">Return to Fullscreen</button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return null;
}
