"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mic, Video as VideoIcon, Volume2, ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import { submitInterviewResponse, completeInterview } from "@/app/actions/interview";

interface Question {
    id: string;
    question: string;
    type: string;
}

export default function InterviewSession({
    interviewId,
    questions
}: {
    interviewId: string,
    questions: Question[]
}) {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(-1); // -1 = Intro/Start
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [status, setStatus] = useState<'idle' | 'speaking' | 'listening' | 'submitting'>('idle');
    const [error, setError] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recognitionRef = useRef<any>(null);

    const isRecordingRef = useRef(false);

    // Initialize Camera
    useEffect(() => {
        async function setupMedia() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Media Access Error:", err);
                setError("Camera/Microphone access denied. Please allow permissions.");
            }
        }
        setupMedia();
        return () => {
            if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
        };
    }, []);

    // Speech Recognition Setup
    useEffect(() => {
        if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    setTranscript(prev => prev + " " + finalTranscript);
                }
            };

            recognition.onerror = (event: any) => {
                if (event.error === 'no-speech') {
                    // Ignore no-speech error, just means silence
                    return;
                }
                console.error("Speech Recognition Error:", event.error);
            };

            recognition.onend = () => {
                // Auto-restart if we are supposed to be recording
                if (isRecordingRef.current) {
                    try {
                        recognition.start();
                    } catch (e) {
                        // ignore if already started
                    }
                }
            };

            recognitionRef.current = recognition;
        } else {
            setError("Your browser does not support Speech Recognition. Please use Chrome.");
        }
    }, []);

    // TTS Reader
    const speakQuestion = (text: string) => {
        if ('speechSynthesis' in window) {
            setStatus('speaking');
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.onend = () => {
                setStatus('listening');
                startRecording();
            };
            window.speechSynthesis.speak(utterance);
        } else {
            // Fallback if no TTS
            setStatus('listening');
            startRecording();
        }
    };

    const startRecording = () => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
                setIsRecording(true);
                isRecordingRef.current = true;
            } catch (e) { console.log("Already started"); }
        }
    };

    const stopRecording = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsRecording(false);
            isRecordingRef.current = false;
        }
        window.speechSynthesis.cancel();
    };

    const handleStart = () => {
        setCurrentIndex(0);
        setTimeout(() => speakQuestion(questions[0].question), 500);
    };

    const handleNext = async () => {
        stopRecording();
        setStatus('submitting');

        console.log("Submitting Answer:", {
            interviewId,
            questionId: questions[currentIndex]?.id,
            answer: transcript
        });

        // Submit current answer
        const result = await submitInterviewResponse({
            interviewId,
            questionId: questions[currentIndex].id,
            answer: transcript
        });

        console.log("Submission Result:", result);

        setTranscript("");

        if (currentIndex < questions.length - 1) {
            const nextIdx = currentIndex + 1;
            setCurrentIndex(nextIdx);
            setTimeout(() => speakQuestion(questions[nextIdx].question), 500);
        } else {
            await handleFinish();
        }
    };

    const handleFinish = async () => {
        await completeInterview(interviewId);
        alert("Interview Completed!");
        router.push('/candidate/application');
    };

    if (error) return <div className="p-8 text-red-600 text-center">{error}</div>;

    const currentQuestion = currentIndex >= 0 ? questions[currentIndex] : null;
    const progress = ((currentIndex + 1) / questions.length) * 100;

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                <h1 className="text-xl font-bold text-blue-400">RecruitAI Interview</h1>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        {isRecording ? <Mic className="w-4 h-4 text-red-500 animate-pulse" /> : <Mic className="w-4 h-4" />}
                        {isRecording ? "Recording..." : "Mic Ready"}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
                    {/* Left: AI / Question Area */}
                    <div className="p-8 flex flex-col justify-center items-center bg-gradient-to-br from-gray-800 to-gray-900 relative">
                        {currentIndex === -1 ? (
                            <div className="text-center max-w-md">
                                <h2 className="text-3xl font-bold mb-4">Ready to Begin?</h2>
                                <p className="text-gray-400 mb-8">
                                    The AI interviewer will ask you {questions.length} questions.
                                    Your answers will be transcribed and analyzed.
                                    Speak clearly.
                                </p>
                                <button
                                    onClick={handleStart}
                                    className="px-8 py-3 bg-blue-600 rounded-full text-lg font-bold hover:bg-blue-700 transition"
                                >
                                    Start Interview
                                </button>
                            </div>
                        ) : (
                            <div className="w-full max-w-xl">
                                <div className="mb-4 text-sm text-blue-400 font-mono">
                                    Question {currentIndex + 1} of {questions.length}
                                </div>
                                <h2 className="text-2xl md:text-3xl font-medium leading-relaxed mb-8">
                                    {currentQuestion?.question}
                                </h2>

                                <div className="flex justify-center mb-8">
                                    {status === 'speaking' && (
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <div key={i} className="w-1 h-8 bg-blue-500 animate-wave rounded-full" style={{ animationDelay: `${i * 0.1}s` }} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* AI Avatar Placeholder */}
                        <div className="absolute bottom-8 left-8 w-16 h-16 rounded-full bg-blue-600/20 border border-blue-500/50 flex items-center justify-center animate-pulse">
                            <div className="w-3 h-3 bg-blue-400 rounded-full" />
                        </div>
                    </div>

                    {/* Right: Camera & Transcript */}
                    <div className="p-8 bg-black flex flex-col">
                        <div className="relative aspect-video bg-gray-800 rounded-xl overflow-hidden shadow-2xl mb-6 border border-gray-700">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover transform scale-x-[-1]"
                            />
                            <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/60 rounded text-xs text-white flex items-center gap-1">
                                <VideoIcon className="w-3 h-3" /> You
                            </div>
                        </div>

                        {currentIndex !== -1 && (
                            <div className="flex-1 flex flex-col">
                                <label className="text-sm text-gray-400 mb-2">Your Answer (Transcribing...)</label>
                                <textarea
                                    value={transcript}
                                    onChange={(e) => setTranscript(e.target.value)}
                                    className="flex-1 w-full bg-gray-800 border border-gray-700 rounded-lg p-4 text-white resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Speak your answer..."
                                />

                                <div className="mt-6 flex justify-end">
                                    <button
                                        onClick={handleNext}
                                        disabled={status === 'submitting'}
                                        className="flex items-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-lg font-bold hover:bg-gray-200 transition disabled:opacity-50"
                                    >
                                        {status === 'submitting' ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" /> Saving...
                                            </>
                                        ) : (
                                            <>
                                                Next Question <ArrowRight className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            {currentIndex !== -1 && (
                <div className="h-1 bg-gray-800">
                    <div
                        className="h-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
        </div>
    );
}
