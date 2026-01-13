"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Types for Web Speech API
interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: () => void;
    stop: () => void;
    onresult: (event: any) => void;
    onerror: (event: any) => void;
    onend: (event: any) => void;
}

export default function InterviewInterface({ interviewId, initialQuestions }: { interviewId: string, initialQuestions: string[] }) {
    const router = useRouter();

    // Conversation State
    const [messages, setMessages] = useState<{ role: 'ai' | 'user', text: string }[]>([
        { role: 'ai', text: "Hello! I am your AI Interviewer. I'm going to ask you a few technical questions. Please answer clearly. Are you ready?" }
    ]);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [processing, setProcessing] = useState(false);

    // Refs
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const synthRef = useRef<SpeechSynthesis | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // --- INIT ---
    useEffect(() => {
        // Initialize TTS
        if (typeof window !== 'undefined') {
            synthRef.current = window.speechSynthesis;

            // Speak init message
            speak(messages[0].text);
        }

        // Initialize STT
        if (typeof window !== 'undefined' && (window as any).webkitSpeechRecognition) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event: any) => {
                let final = '';
                let interim = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        final += event.results[i][0].transcript;
                    } else {
                        interim += event.results[i][0].transcript;
                    }
                }
                if (final) {
                    setTranscript(prev => prev + " " + final);
                }
            };

            recognition.onerror = (event: any) => {
                console.error("Speech Error", event.error);
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        } else {
            alert("Your browser does not support Speech Recognition. Please use Chrome/Edge.");
        }
    }, [messages]); // messages dependency only for initial mount read

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, transcript]);


    // --- ACTIONS ---

    const speak = (text: string) => {
        if (!synthRef.current) return;
        setIsSpeaking(true);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.onend = () => setIsSpeaking(false);
        synthRef.current.speak(utterance);
    };

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            setTranscript("");
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

    const submitAnswer = async () => {
        if (!transcript.trim()) return;

        recognitionRef.current?.stop();
        setIsListening(false);

        const answer = transcript.trim();
        setMessages(prev => [...prev, { role: 'user', text: answer }]);
        setTranscript("");
        setProcessing(true);

        // Simple Flow: Just ask next question from list
        // In a real advanced version, we'd send the answer to AI to get a dynamic follow-up.
        // For Phase 6 default, we just iterate the pre-generated questions.

        setTimeout(async () => {
            const nextIdx = currentQuestionIdx + 1;

            // Save Partial Response (Optional - handled by bulk submit at end usually, but safer to sync)
            await fetch('/api/candidate/interview/sync', {
                method: 'POST',
                body: JSON.stringify({
                    interviewId,
                    question: initialQuestions[currentQuestionIdx],
                    answer: answer
                })
            });

            if (nextIdx < initialQuestions.length) {
                const nextQ = initialQuestions[nextIdx];
                setMessages(prev => [...prev, { role: 'ai', text: nextQ }]);
                setCurrentQuestionIdx(nextIdx);
                speak(nextQ);
            } else {
                const closing = "Thank you. That completes the interview. I am submitting your responses now.";
                setMessages(prev => [...prev, { role: 'ai', text: closing }]);
                speak(closing);

                // Final Submit
                await fetch('/api/candidate/interview/submit', {
                    method: 'POST',
                    body: JSON.stringify({ interviewId, completed: true }) // Logic handled in API
                });

                setTimeout(() => window.location.reload(), 3000);
            }
            setProcessing(false);
        }, 1000);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] bg-gray-50 rounded-xl shadow-lg overflow-hidden border border-gray-200">
            {/* Header / Visualization */}
            <div className="bg-white p-4 border-b flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                    <h2 className="font-bold text-gray-800">AI Interviewer</h2>
                </div>
                <div className="text-sm text-gray-500">
                    Question {currentQuestionIdx + 1} / {initialQuestions.length}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-4 rounded-xl text-lg shadow-sm
                            ${m.role === 'user'
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-white text-gray-800 border rounded-bl-none'}
                        `}>
                            {m.text}
                        </div>
                    </div>
                ))}

                {/* Live Transcript Preview */}
                {isListening && (
                    <div className="flex justify-end">
                        <div className="max-w-[80%] p-4 rounded-xl bg-blue-50 text-blue-800 border-2 border-blue-100 border-dashed animate-pulse italic">
                            {transcript || "Listening..."}
                        </div>
                    </div>
                )}

                {processing && (
                    <div className="flex justify-start">
                        <div className="p-4 rounded-xl bg-gray-100 text-gray-500 italic flex items-center gap-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                            Thinking...
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Controls */}
            <div className="bg-white p-6 border-t shadow-inner z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleListening}
                        disabled={processing || isSpeaking}
                        className={`p-4 rounded-full transition shadow-lg transform active:scale-95 flex items-center justify-center
                            ${isListening
                                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse ring-4 ring-red-200'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'}
                            ${(processing || isSpeaking) ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    >
                        {isListening ? (
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"></path></svg>
                        ) : (
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                        )}
                    </button>

                    <div className="flex-1">
                        <input
                            type="text"
                            disabled
                            value={isListening ? "Listening..." : transcript}
                            placeholder={isSpeaking ? "AI is speaking..." : "Click microphone to speak your answer"}
                            className="w-full px-4 py-3 bg-gray-50 border rounded-lg text-gray-500 italic"
                        />
                    </div>

                    <button
                        onClick={submitAnswer}
                        disabled={!transcript.trim() || processing}
                        className={`px-8 py-3 rounded-lg font-bold text-white transition shadow-md
                             ${(!transcript.trim() || processing) ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 transform hover:-translate-y-1'}
                        `}
                    >
                        Send Answer
                    </button>
                </div>
                <p className="text-center text-xs text-gray-400 mt-4">
                    Browser Speech API used. Please allow microphone access.
                </p>
            </div>
        </div>
    );
}
