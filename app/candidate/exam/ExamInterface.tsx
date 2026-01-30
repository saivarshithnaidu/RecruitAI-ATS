"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { startExam, submitExam } from "@/app/actions/exams";
import { useRouter } from "next/navigation";
import CodingEditor from "./CodingEditor";
import DualCameraSetup from "@/components/candidate/DualCameraSetup";
import { supabaseClient } from "@/lib/supabaseClient";
import * as faceapi from 'face-api.js';

export default function ExamInterface({ exam, initialStatus, userId }: { exam: any, initialStatus: string, userId: string }) {
    const router = useRouter();
    const [status, setStatus] = useState(initialStatus); // 'assigned', 'in_progress', 'completed'

    // Data State
    const [sections, setSections] = useState<any[]>([]); // New 3-section structure
    const [legacyQuestions, setLegacyQuestions] = useState<any[]>([]); // Fallback

    // UI State
    const [activeSectionId, setActiveSectionId] = useState<string>("");
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});

    // Timer
    const durationMins = Number(exam.exams?.duration_minutes) || 60;
    const [timeLeft, setTimeLeft] = useState(durationMins * 60);

    // Status
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [isPaused, setIsPaused] = useState(false); // Admin Pause

    // --- PROCTORING STATE ---
    const [tabSwitches, setTabSwitches] = useState(0);
    const [fullscreenExits, setFullscreenExits] = useState(0);
    const [cameraVerified, setCameraVerified] = useState(false);
    const [micVerified, setMicVerified] = useState(false);
    const [mobileVerified, setMobileVerified] = useState(false); // [DUAL CAM]
    const [stream, setStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    // Mobile Heartbeat State
    const [lastHeartbeat, setLastHeartbeat] = useState<number>(Date.now());
    const [isMobileLive, setIsMobileLive] = useState(true);

    // --- PROCTORING CONFIG ---
    const config = exam.proctoring_config || { camera: true, mic: true, tab_switch: true, copy_paste: true, dual_camera: false };
    const isDualCam = config.dual_camera; // Helper

    // --- BROADCAST HELPER ---
    const broadcastEvent = useCallback(async (event: string, payload: any = {}) => {
        const channel = supabaseClient.channel(`proctor-${exam.id}`);
        await channel.send({
            type: 'broadcast',
            event: event,
            payload: { userId, ...payload }
        });
    }, [exam.id, userId]);

    // --- LOGGING HELPER ---
    const logEvent = useCallback(async (type: string, details: any = {}) => {
        // 1. Broadcast to Admin
        if (type === 'TAB_SWITCH') broadcastEvent('violation', { type: 'tab_switch' });
        if (type === 'FULLSCREEN_EXIT') broadcastEvent('violation', { type: 'fullscreen_exit' });
        if (type === 'MOBILE_DISCONNECT') broadcastEvent('violation', { type: 'mobile_disconnect' });

        // 2. Persist to DB
        try {
            await fetch('/api/proctor/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    exam_assignment_id: exam.id,
                    candidate_id: null,
                    event_type: type,
                    details
                })
            });
        } catch (e) {
            console.error("Failed to log event:", e);
        }
    }, [exam.id, broadcastEvent]);

    const uploadRecording = async (blob: Blob) => {
        const formData = new FormData();
        formData.append('video', blob, 'recording.webm');
        formData.append('examId', exam.id);

        try {
            await fetch('/api/proctor/upload', {
                method: 'POST',
                body: formData
            });
        } catch (e) {
            console.error("Upload failed", e);
        }
    };

    const handleSubmit = useCallback(async (auto = false) => {
        if (submitting) return;
        setSubmitting(true);

        if (stream) stream.getTracks().forEach(t => t.stop());
        if (document.fullscreenElement) document.exitFullscreen().catch(() => { });

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }

        try {
            const finalBlob = new Blob(chunksRef.current, { type: 'video/webm' });
            await uploadRecording(finalBlob);

            const proctoringData = {
                tab_switches: tabSwitches,
                fullscreen_exits: fullscreenExits + (auto ? 1 : 0),
                auto_submitted: auto,
                flagged: (tabSwitches > 2 || fullscreenExits > 0)
            };

            await submitExam(exam.id, answers, proctoringData);
            router.refresh();
        } catch (e: any) {
            if (!auto) setError(e.message);
        } finally {
            setSubmitting(false);
        }
    }, [submitting, stream, tabSwitches, fullscreenExits, answers, exam.id, router]);

    // --- REALTIME: ADMIN COMMANDS & MOBILE HEARTBEAT ---
    useEffect(() => {
        if (status !== 'in_progress') return;

        const channel = supabaseClient.channel(`proctor-${exam.id}`);

        channel
            .on('broadcast', { event: 'admin-command' }, (payload: any) => {
                const data = payload.payload;
                if (data.userId === userId) {
                    console.log("Admin Command Received:", data.command);
                    if (data.command === 'pause') setIsPaused(true);
                    if (data.command === 'resume') setIsPaused(false);
                    if (data.command === 'terminate') {
                        handleSubmit(true);
                        alert("Your exam has been terminated by the administrator.");
                    }
                }
            })
            .on('broadcast', { event: 'mobile-heartbeat' }, (payload: any) => {
                const data = payload.payload;
                if (data.userId === userId) {
                    setLastHeartbeat(Date.now());
                    setIsMobileLive(true);
                }
            })
            .on('broadcast', { event: 'mobile-disconnected' }, (payload: any) => {
                const data = payload.payload;
                if (data.userId === userId) {
                    setIsMobileLive(false);
                    logEvent('MOBILE_DISCONNECT');
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // Initial Heartbeat
                    await channel.track({ online_at: new Date().toISOString(), userId });
                }
            });

        // Periodic Heartbeat (Every 5s) & Mobile Check
        const interval = setInterval(() => {
            // Send own heartbeat
            broadcastEvent('heartbeat');

            // Check Mobile
            if (isDualCam && Date.now() - lastHeartbeat > 15000) {
                if (isMobileLive) {
                    setIsMobileLive(false);
                }
            }
        }, 5000);

        return () => {
            clearInterval(interval);
            supabaseClient.removeChannel(channel);
        };
    }, [status, exam.id, userId, handleSubmit, broadcastEvent, logEvent, isDualCam, lastHeartbeat, isMobileLive]);

    // --- INITIALIZATION ---
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
                if (!stream) {
                    performSystemCheck().then(s => {
                        if (s) {
                            startRecording(s);
                        }
                    });
                }
            }
        }
    }, [status, exam.started_at, durationMins, handleSubmit, stream]);

    // --- SNAPSHOTS (VISUAL PROCTORING) ---
    useEffect(() => {
        if (status !== 'in_progress' || !stream || !config.camera) return;

        const interval = setInterval(async () => {
            if (videoRef.current) {
                const video = videoRef.current;
                const canvas = document.createElement('canvas');
                canvas.width = 640; // Resize for bandwidth
                canvas.height = 360;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.translate(canvas.width, 0);
                    ctx.scale(-1, 1); // Mirror flip
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    canvas.toBlob(async (blob) => {
                        if (blob) {
                            const formData = new FormData();
                            formData.append('file', blob, 'snap.jpg');
                            formData.append('examId', exam.id);
                            formData.append('userId', userId);

                            try {
                                await fetch('/api/proctor/snapshot', { method: 'POST', body: formData });
                                // Optional: Broadcast that a new snapshot is available if we want real-time push
                            } catch (e) {
                                console.error("Snapshot upload failed", e);
                            }
                        }
                    }, 'image/jpeg', 0.5); // 50% quality jpeg
                }
            }
        }, 15000); // Every 15 seconds

        return () => clearInterval(interval);
    }, [status, stream, config.camera, exam.id, userId]);

    // Video Stream Handler
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream, status]);

    const startRecording = (mediaStream: MediaStream) => {
        // ... (Recording logic kept if needed, or we can rely solely on snapshots to save bandwidth)
        // For now, keeping legacy recording logic but prioritising snapshots
        try {
            const recorder = new MediaRecorder(mediaStream, { mimeType: 'video/webm' });
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            recorder.start(1000);
            mediaRecorderRef.current = recorder;
        } catch (e) {
            console.error("Warning: MediaRecorder failed (Safari?)", e);
        }
    };

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const res = await startExam(exam.id);
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

    // --- FACE DETECTION STATE ---
    const [faceApiLoaded, setFaceApiLoaded] = useState(false);
    const [missingFaceCount, setMissingFaceCount] = useState(0);
    const [multipleFaceCount, setMultipleFaceCount] = useState(0);

    // Load Models
    useEffect(() => {
        const loadModels = async () => {
            const MODEL_URL = '/models';
            try {
                await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
                setFaceApiLoaded(true);
                console.log("FaceAPI Models Loaded");
            } catch (e) {
                console.error("Failed to load FaceAPI models:", e);
            }
        };
        if (config.camera) loadModels();
    }, [config.camera]);

    // Face Detection Loop
    useEffect(() => {
        if (status !== 'in_progress' || !stream || !faceApiLoaded || !videoRef.current) return;

        const interval = setInterval(async () => {
            if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
                try {
                    const detections = await faceapi.detectAllFaces(
                        videoRef.current,
                        new faceapi.TinyFaceDetectorOptions()
                    );

                    const count = detections.length;

                    if (count === 0) {
                        setMissingFaceCount(prev => {
                            const newVal = prev + 1;
                            if (newVal % 5 === 0) logEvent('FACE_MISSING', { duration_sec: newVal });
                            return newVal;
                        });
                    } else {
                        setMissingFaceCount(0); // Reset if face found
                    }

                    if (count > 1) {
                        setMultipleFaceCount(prev => {
                            const newVal = prev + 1;
                            if (newVal % 3 === 0) logEvent('MULTIPLE_FACES', { count });
                            return newVal;
                        });
                        // Optional: Alert user
                    } else {
                        setMultipleFaceCount(0);
                    }

                } catch (e) {
                    console.error("Detection error:", e);
                }
            }
        }, 2000); // Check every 2s to save CPU

        return () => clearInterval(interval);
    }, [status, stream, faceApiLoaded, logEvent]);

    // Reset question index when section changes
    useEffect(() => {
        setCurrentQuestionIndex(0);
    }, [activeSectionId]);

    // --- TIMER ---
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


    // --- SECURITY EVENTS ---
    useEffect(() => {
        if (status !== 'in_progress') return;

        // 1. Prevent Right Click
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            logEvent('RIGHT_CLICK');
        };
        window.addEventListener('contextmenu', handleContextMenu);

        // 2. Prevent Copy/Paste
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

        // 3. Tab Visibility
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setTabSwitches(prev => {
                    const newVal = prev + 1;
                    logEvent('TAB_SWITCH');
                    if (newVal >= 3) {
                        alert("Violation Limit Reached: Tab switching is strictly prohibited. Your exam is being auto-submitted.");
                        handleSubmit(true);
                    }
                    return newVal;
                });
            }
        };
        if (config.tab_switch) {
            document.addEventListener('visibilitychange', handleVisibilityChange);
        }

        // 4. Fullscreen Check
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

        // Initial Check & Listener
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


    // --- ACTIONS ---
    const performSystemCheck = async () => {
        setError("");
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setStream(mediaStream);
            setCameraVerified(true);
            setMicVerified(true);
            return mediaStream;
        } catch (err) {
            setError("Camera and Microphone access is REQUIRED.");
            setCameraVerified(false);
            setMicVerified(false);
            return null;
        }
    };

    const handleStart = async () => {
        const needsCam = config.camera || config.mic;
        const needsMobile = config.dual_camera;

        if (needsCam && (!cameraVerified || !stream)) {
            setError("Please complete the Laptop System Check.");
            return;
        }

        if (needsMobile && !mobileVerified) {
            setError("Please verify the Mobile 'Third Eye' connection.");
            return;
        }

        try {
            await document.documentElement.requestFullscreen();
        } catch (e) {
            console.error(e);
            setError("Fullscreen mode is mandatory. Please confirm execution.");
            return;
        }

        setLoading(true);
        if (stream) startRecording(stream);

        try {
            const res = await startExam(exam.id);
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

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec < 10 ? '0' : ''}${sec}`;
    };

    // --- PAUSED OVERLAY ---
    if (isPaused) {
        return (
            <div className="fixed inset-0 bg-black/95 z-[200] flex flex-col items-center justify-center text-white text-center p-8 backdrop-blur-md">
                <div className="bg-gray-900 p-10 rounded-2xl border border-orange-500 shadow-2xl max-w-md w-full animate-pulse">
                    <div className="w-20 h-20 bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-orange-500 mb-4">Exam Paused by Admin</h2>
                    <p className="text-gray-300">
                        The administrator has paused your exam session.
                        <br />
                        Please wait for instructions or resumed access.
                    </p>
                </div>
            </div>
        );
    }

    if (status === 'assigned') {
        const isDualCam = config.dual_camera;

        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white max-w-4xl w-full p-8 rounded-xl shadow-lg border text-center my-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">{exam.exams.title}</h1>
                    <p className="text-gray-600 mb-8 max-w-2xl mx-auto">{exam.exams.description}</p>

                    <div className="bg-blue-50 text-blue-800 p-6 rounded-lg text-left mb-8 space-y-2">
                        <h3 className="font-bold border-b border-blue-200 pb-2 mb-2">Exam Rules</h3>
                        {exam.scheduled_start_time && (
                            <li className="text-blue-900 bg-blue-100/50 p-1 rounded mb-1">
                                Start: <strong>{new Date(exam.scheduled_start_time).toLocaleString()}</strong>
                            </li>
                        )}
                        <li>Duration: <strong>{durationMins} mins</strong></li>
                        {config.tab_switch && <li><strong>Fullscreen & No Tab Switching:</strong> Violations are logged.</li>}
                        <li><strong>Camera Priority:</strong> {isDualCam ? "Dual Camera (Laptop + Mobile)" : "Laptop Camera Only"}</li>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        {/* 1. LAPTOP CHECK */}
                        {(config.camera || config.mic) && (
                            <div className="flex flex-col items-center gap-4 p-4 border rounded-lg bg-gray-50">
                                <h4 className="font-bold text-gray-700">1. Laptop Camera Check</h4>
                                <div className="w-64 h-48 bg-black rounded-lg overflow-hidden relative border-4 border-gray-200 flex items-center justify-center shadow-inner">
                                    {stream ? (
                                        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                                    ) : (
                                        <div className="text-gray-500 text-sm flex flex-col items-center">
                                            <span>Camera Preview</span>
                                        </div>
                                    )}
                                </div>

                                {!cameraVerified ? (
                                    <button onClick={performSystemCheck} className="px-6 py-2 bg-gray-800 text-white rounded hover:bg-black transition text-sm">
                                        Activate Laptop Camera
                                    </button>
                                ) : (
                                    <div className="text-green-600 font-bold flex items-center gap-2 text-sm">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                        Laptop Verified
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 2. MOBILE CHECK (Dual Cam) */}
                        {isDualCam && (
                            <div className="flex flex-col items-center gap-4 p-4 border rounded-lg bg-gray-50">
                                <h4 className="font-bold text-gray-700">2. Mobile "Third Eye" Check</h4>
                                <DualCameraSetup
                                    examId={exam.id}
                                    userId={userId}
                                    onReady={(ready) => {
                                        setMobileVerified(ready);
                                        if (ready) setLastHeartbeat(Date.now()); // Reset heartbeat on check success
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {error && <div className="text-red-600 bg-red-50 p-3 rounded mb-6 max-w-xl mx-auto border border-red-200">{error}</div>}

                    {/* Start Button */}
                    <div className="max-w-md mx-auto">
                        {exam.scheduled_start_time && (() => {
                            const startTime = new Date(exam.scheduled_start_time).getTime();
                            const now = new Date().getTime();
                            const diff = startTime - now;
                            const canEnter = diff <= (15 * 60 * 1000);

                            if (!canEnter) {
                                return (
                                    <div className="bg-yellow-50 text-yellow-800 p-4 rounded text-center border border-yellow-200 mb-4">
                                        <p className="font-bold">Exam Scheduled Later</p>
                                        <p className="text-sm">Entry allowed 15 mins before.</p>
                                    </div>
                                )
                            }
                            return null;
                        })()}

                        <button
                            onClick={handleStart}
                            disabled={
                                ((config.camera || config.mic) && !cameraVerified) ||
                                (isDualCam && !mobileVerified) ||
                                loading ||
                                (exam.scheduled_start_time && new Date(exam.scheduled_start_time).getTime() - new Date().getTime() > 15 * 60 * 1000)
                            }
                            className={`w-full py-4 text-lg font-bold rounded-xl text-white transition shadow-lg flex items-center justify-center gap-2
                                ${(((config.camera || config.mic) && !cameraVerified) || (isDualCam && !mobileVerified) || loading || (exam.scheduled_start_time && new Date(exam.scheduled_start_time).getTime() - new Date().getTime() > 15 * 60 * 1000))
                                    ? 'bg-gray-300 cursor-not-allowed shadow-none'
                                    : 'bg-green-600 hover:bg-green-700 transform hover:-translate-y-1'}
                            `}
                        >
                            {loading ? 'Starting...' : 'Start Exam'}
                        </button>
                        <p className="text-xs text-gray-400 mt-2">
                            Ensuring a fair exam environment.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (status === 'in_progress') {
        const activeSection = sections.find(s => s.id === activeSectionId);
        const displayQuestions = activeSection ? activeSection.questions : legacyQuestions;
        const currentQuestion = displayQuestions[currentQuestionIndex];

        // --- BLOCKING OVERLAY: MOBILE LOST ---
        if (config.dual_camera && !isMobileLive) {
            return (
                <div className="fixed inset-0 bg-black/95 z-[200] flex flex-col items-center justify-center text-white text-center p-8 backdrop-blur-md">
                    <div className="bg-gray-900 p-10 rounded-2xl border border-red-500 shadow-2xl max-w-md w-full animate-shake">
                        <div className="w-20 h-20 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        </div>
                        <h2 className="text-2xl font-bold text-red-500 mb-2">Third-Eye Disconnected</h2>
                        <p className="text-gray-300 mb-8 leading-relaxed">
                            We lost connection to your mobile camera. The exam is paused.
                            <br /><br />
                            <span className="text-sm bg-gray-800 p-2 rounded block">
                                Please <strong>wake up your phone</strong> or refresh the mobile page.
                            </span>
                        </p>

                        <div className="p-4 bg-black/30 rounded-lg text-sm text-gray-400">
                            Waiting for signal...
                        </div>
                    </div>
                </div>
            )
        }

        return (
            <div className="min-h-screen bg-gray-100 flex flex-col">
                {/* Top Bar */}
                <div className="bg-white shadow-sm border-b px-6 py-3 flex justify-between items-center sticky top-0 z-50">
                    <div className="flex items-center gap-4">
                        <h2 className="font-bold text-gray-800 truncate max-w-xs">{exam.exams.title}</h2>
                        {/* Live Cam Mini */}
                        {stream && (
                            <div className="w-16 h-12 bg-black rounded overflow-hidden border border-gray-300 shadow-inner">
                                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                            </div>
                        )}
                        <div className="flex gap-2 text-xs">
                            {tabSwitches > 0 && <span className="text-orange-600 font-semibold">⚠ Tabs: {tabSwitches}</span>}
                            {fullscreenExits > 0 && <span className="text-red-600 font-semibold">⚠ Fullscreen: {fullscreenExits}</span>}
                        </div>
                        {config.dual_camera && (
                            <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                Third-Eye Active
                            </div>
                        )}
                    </div>
                    <div className={`px-4 py-2 font-mono text-xl font-bold rounded ${timeLeft < 300 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-800'}`}>
                        {formatTime(timeLeft)}
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar / Tabs */}
                    <div className="w-64 bg-white border-r overflow-y-auto hidden md:flex flex-col">
                        <div className="p-4 border-b bg-gray-50">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Section</label>
                            <select
                                className="w-full border rounded p-2 text-sm bg-white"
                                value={activeSectionId}
                                onChange={(e) => setActiveSectionId(e.target.value)}
                            >
                                {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                            </select>
                        </div>

                        {/* Question Grid */}
                        <div className="p-4 grid grid-cols-5 gap-2 content-start">
                            {displayQuestions.map((q: any, idx: number) => {
                                const isAnswered = !!answers[q.id];
                                const isCurrent = idx === currentQuestionIndex;
                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => setCurrentQuestionIndex(idx)}
                                        className={`aspect-square rounded text-xs font-bold flex items-center justify-center transition border
                                             ${isCurrent ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300 border-blue-600' :
                                                isAnswered ? 'bg-green-100 text-green-700 border-green-300' :
                                                    'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}
                                         `}
                                    >
                                        {idx + 1}
                                    </button>
                                )
                            })}
                        </div>

                        <div className="mt-auto p-4 border-t bg-gray-50">
                            <button
                                onClick={() => {
                                    if (confirm("Are you sure you want to finish the exam? This action cannot be undone.")) {
                                        handleSubmit(false);
                                    }
                                }}
                                disabled={submitting}
                                className={`w-full py-3 rounded-lg font-bold text-white shadow transition
                                    ${submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}
                                `}
                            >
                                {submitting ? 'Submitting...' : 'Finish Exam'}
                            </button>
                        </div>
                    </div>

                    {/* Main Content */}
                    <main className="flex-1 overflow-y-auto p-6 relative flex flex-col items-center bg-gray-100/50">
                        {loading ? (
                            <div className="text-center py-20 text-gray-500">Loading questions...</div>
                        ) : currentQuestion ? (
                            <div className="w-full max-w-4xl flex-1 flex flex-col h-full max-h-[calc(100vh-140px)]">
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
                                    {/* Question Header */}
                                    <div className="bg-gray-50 px-8 py-5 border-b flex justify-between items-center shrink-0">
                                        <h3 className="text-lg font-bold text-gray-800">
                                            Question {currentQuestionIndex + 1} <span className="font-normal text-gray-400 text-sm">/ {displayQuestions.length}</span>
                                        </h3>
                                        <span className="text-xs font-bold px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full capitalize tracking-wide">
                                            {currentQuestion.type} • {currentQuestion.marks} Marks
                                        </span>
                                    </div>

                                    {/* Scrollable Content */}
                                    <div className="p-8 flex-1 overflow-y-auto">
                                        {currentQuestion.type === 'coding' ? (
                                            <div className="h-full flex flex-col">
                                                <h4 className="text-lg text-gray-900 font-medium mb-4 leading-relaxed">{currentQuestion.question}</h4>
                                                <div className="flex-1 border rounded-lg overflow-hidden min-h-[400px]">
                                                    <CodingEditor
                                                        question={currentQuestion}
                                                        assignmentId={exam.id}
                                                        questionIdx={currentQuestionIndex}
                                                        onStatusChange={(status) => {
                                                            setAnswers(prev => ({ ...prev, [currentQuestion.id]: status }));
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-8 max-w-3xl mx-auto">
                                                <p className="text-xl text-gray-800 whitespace-pre-wrap leading-relaxed font-serif">
                                                    {currentQuestion.question}
                                                </p>

                                                <hr className="border-gray-100" />

                                                {currentQuestion.type === 'mcq' && isActiveSectionMCQ(currentQuestion) && (
                                                    <div className="space-y-3">
                                                        {currentQuestion.options.map((opt: string, i: number) => (
                                                            <label
                                                                key={i}
                                                                className={`group flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                                                                    ${answers[currentQuestion.id] === opt
                                                                        ? 'border-blue-500 bg-blue-50/50 shadow-md transform scale-[1.01]'
                                                                        : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-gray-50'}
                                                                `}
                                                            >
                                                                <div className="relative flex items-center justify-center h-6 w-6 shrink-0">
                                                                    <input
                                                                        type="radio"
                                                                        name={currentQuestion.id}
                                                                        value={opt}
                                                                        checked={answers[currentQuestion.id] === opt}
                                                                        onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                                                                        className="peer h-5 w-5 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer appearance-none rounded-full border-2 checked:border-blue-600"
                                                                    />
                                                                    <div className="absolute w-2.5 h-2.5 bg-blue-600 rounded-full opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"></div>
                                                                </div>
                                                                <div className="ml-4 text-lg text-gray-700 group-hover:text-gray-900 font-medium">
                                                                    {opt}
                                                                </div>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Bar */}
                                    <div className="bg-gray-50 px-8 py-5 border-t flex justify-between items-center shrink-0">
                                        <button
                                            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                            disabled={currentQuestionIndex === 0}
                                            className="px-6 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:hover:bg-white font-medium transition shadow-sm"
                                        >
                                            &larr; Previous
                                        </button>

                                        <button
                                            onClick={() => {
                                                if (currentQuestionIndex < displayQuestions.length - 1) {
                                                    setCurrentQuestionIndex(prev => prev + 1);
                                                }
                                            }}
                                            disabled={currentQuestionIndex === displayQuestions.length - 1}
                                            className="px-8 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-400 font-bold shadow-md hover:shadow-lg transition transform active:scale-95"
                                        >
                                            Next Question &rarr;
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <p className="text-xl">No questions available in this section.</p>
                            </div>
                        )}
                    </main>
                </div>

                {/* Fullscreen Violation Overlay */}
                {fullscreenExits > 0 && fullscreenExits < 3 && status === 'in_progress' && (
                    <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center text-white text-center p-8 backdrop-blur-sm">
                        <div className="bg-gray-900 p-10 rounded-2xl border border-red-500/50 shadow-2xl max-w-lg">
                            <h2 className="text-4xl font-bold text-red-500 mb-6">WARNING</h2>
                            <p className="text-xl mb-2 font-medium">You have exited fullscreen mode.</p>
                            <p className="mb-8 text-gray-400">Violation <span className="text-white font-bold">{fullscreenExits}/3</span>. Upon the 3rd violation, your exam will be <u>automatically submitted</u>.</p>
                            <button
                                onClick={() => document.documentElement.requestFullscreen()}
                                className="px-8 py-3 bg-red-600 rounded-lg font-bold hover:bg-red-700 transition shadow-lg hover:shadow-red-900/50"
                            >
                                Return to Fullscreen
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return null;
}

// Helper to differentiate types
function isActiveSectionMCQ(q: any) {
    return q.type === 'mcq' || (q.options && q.options.length > 0);
}
