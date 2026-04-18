"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, User, Bot, Loader2, Info, FileText, Lock, Mail } from "lucide-react";
import { useSession } from "next-auth/react";

/**
 * RecruitAI Assistant Chatbot
 */
export default function Chatbot() {
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Filter: only show for candidates or logged in users
    if (!session || !session.user) return null;

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSendMessage = async (msgText: string, isAuto = false) => {
        const userMsg = { role: "user", content: msgText };
        setMessages(prev => [...prev, userMsg]);
        if (!isAuto) setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/chatbot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    message: msgText,
                    history: messages.slice(-5) 
                }),
            });

            const data = await response.json();
            setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again later." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const quickActions = [
        { label: "Application Status", icon: <FileText className="w-3 h-3" />, query: "What is my application status and ATS score?" },
        { label: "Exam Help (SEB)", icon: <Lock className="w-3 h-3" />, query: "How do I take the exam? What is Safe Exam Browser?" },
        { label: "Resume Guidance", icon: <Info className="w-3 h-3" />, query: "Explain my ATS score and how to improve my resume." },
        { label: "Support", icon: <Mail className="w-3 h-3" />, query: "I need technical support/HR contact." },
    ];

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Panel */}
            {isOpen && (
                <div className="mb-4 w-80 sm:w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
                    {/* Header */}
                    <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-white/20 rounded-lg">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm leading-none">RecruitAI Assistant</h3>
                                <span className="text-[10px] text-blue-100">Online | AI Powered</span>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Chat Area */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 scroll-smooth">
                        {messages.length === 0 && (
                            <div className="text-center py-8 space-y-4">
                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                                    <Bot className="w-6 h-6" />
                                </div>
                                <p className="text-sm text-gray-500 font-medium px-6">
                                    Hello! I'm your AI hiring assistant. How can I help you today?
                                </p>
                                <div className="grid grid-cols-2 gap-2 px-2">
                                    {quickActions.map((action, i) => (
                                        <button 
                                            key={i}
                                            onClick={() => handleSendMessage(action.query, true)}
                                            className="p-2 text-[11px] text-left border border-gray-200 bg-white hover:border-blue-500 hover:text-blue-600 rounded-xl transition-all flex flex-col gap-1 shadow-sm"
                                        >
                                            <span className="text-gray-400">{action.icon}</span>
                                            <span className="font-bold">{action.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                                    m.role === 'user' 
                                        ? 'bg-blue-600 text-white rounded-br-none shadow-md' 
                                        : 'bg-white text-gray-800 rounded-bl-none border border-gray-100 shadow-sm'
                                }`}>
                                    <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white p-3 rounded-2xl rounded-bl-none border border-gray-100 shadow-sm">
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <form 
                        onSubmit={(e) => { e.preventDefault(); if (input.trim()) handleSendMessage(input); }}
                        className="p-4 bg-white border-t border-gray-100 flex gap-2"
                    >
                        <input
                            type="text"
                            placeholder="Type your question..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                        />
                        <button 
                            disabled={isLoading || !input.trim()}
                            className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            )}

            {/* Toggle Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95
                    ${isOpen ? 'bg-red-500 rotate-90' : 'bg-blue-600'}
                `}
            >
                {isOpen ? <X className="text-white w-6 h-6" /> : <MessageSquare className="text-white w-6 h-6" />}
            </button>
        </div>
    );
}
