"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
    MessageSquare, Send, FileText, Upload, Plus, 
    Trash2, Edit, Save, BookOpen, Brain, 
    CheckCircle, AlertCircle, Loader2, RefreshCw
} from "lucide-react";
import { useRouter } from "next/navigation";
import { saveAiExamTemplate } from "@/app/actions/exams";

/**
 * AI EXAM GENERATOR - ADMIN STUDIO
 */

export default function AIExamGeneratorPage() {
    // 1. Documents State
    const [documents, setDocuments] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [fetchingDocs, setFetchingDocs] = useState(false);

    // 2. Chat State
    const [messages, setMessages] = useState<any[]>([
        { role: 'assistant', content: 'Hello Admin! I am your AI Exam Assistant. Upload some company docs and tell me what kind of exam you want to create.' }
    ]);
    const [prompt, setPrompt] = useState("");
    const [generating, setGenerating] = useState(false);

    // 3. Generation Config
    const [role, setRole] = useState("Software Engineer");
    const [difficulty, setDifficulty] = useState("medium");
    const [count, setCount] = useState(5);
    const [type, setType] = useState("mixed");

    // 4. Results State
    const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
    const [traceability, setTraceability] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);

    const router = useRouter();

    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchDocs();
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const fetchDocs = async () => {
        setFetchingDocs(true);
        try {
            const res = await fetch('/api/admin/exams/documents');
            const json = await res.json();
            if (json.success) setDocuments(json.data);
        } catch (e) {
            console.error("Failed to fetch docs");
        } finally {
            setFetchingDocs(false);
        }
    };

    const handleSaveTemplate = async () => {
        if (generatedQuestions.length === 0) return;
        
        setSaving(true);
        try {
            const title = `AI ${role} - ${difficulty.toUpperCase()} Template`;
            const description = `AI-powered evaluation for ${role} role covering generated topics.`;
            
            const res = await saveAiExamTemplate({
                title,
                description,
                role,
                difficulty,
                questions: generatedQuestions
            });

            if (res.success) {
                alert("Exam template saved successfully! Redirecting to exams...");
                router.push('/admin/exams');
            } else {
                alert("Failed to save: " + res.error);
            }
        } catch (e) {
            alert("Error saving template");
        } finally {
            setSaving(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/admin/exams/documents", {
                method: "POST",
                body: formData
            });
            const json = await res.json();
            if (json.success) {
                alert("Document processed for RAG analysis!");
                fetchDocs();
            } else {
                alert("Upload failed: " + json.message);
            }
        } catch (e) {
            alert("Network error during upload");
        } finally {
            setUploading(false);
        }
    };

    const handleSend = async () => {
        if (!prompt.trim()) return;

        const userMsg = { role: 'user', content: prompt };
        setMessages(prev => [...prev, userMsg]);
        setPrompt("");
        setGenerating(true);

        try {
            const res = await fetch("/api/admin/exams/ai-generator", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, role, difficulty, count, type })
            });

            const json = await res.json();
            if (json.success) {
                setMessages(prev => [...prev, { role: 'assistant', content: `Success! I have generated ${json.questions.length} questions based on your documents. Look at the preview panel to your right.` }]);
                setGeneratedQuestions(json.questions);
                setTraceability(json.trace || []);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: "Error: " + json.message }]);
            }
        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Network error occurred." }]);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] bg-[#fafafa]">
            
            {/* SIDE PANEL: DOCUMENTS (25%) */}
            <div className="w-80 border-r bg-white p-6 overflow-y-auto flex flex-col">
                <div className="flex items-center gap-2 mb-8">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                    <h2 className="text-lg font-black tracking-tighter">AI KNOWLEDGE BASE</h2>
                </div>

                <div className="space-y-4 flex-grow">
                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center">
                        <input type="file" id="doc-upload" onChange={handleUpload} className="hidden" accept=".pdf,.docx" />
                        <label htmlFor="doc-upload" className="cursor-pointer">
                            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                            <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                {uploading ? "Processing..." : "Upload Context Doc"}
                            </div>
                        </label>
                    </div>

                    <div className="space-y-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Active Documents</p>
                        {fetchingDocs ? (
                            <div className="flex justify-center p-4"><Loader2 className="animate-spin text-slate-300" /></div>
                        ) : documents.map(doc => (
                            <div key={doc.id} className="p-3 bg-white border border-slate-100 rounded-xl flex items-center gap-3 group hover:border-blue-200 transition-all shadow-sm translate-y-0 hover:-translate-y-0.5">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-700 truncate">{doc.name}</p>
                                    <p className="text-[9px] text-slate-400 font-medium uppercase">{new Date(doc.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-8 pt-8 border-t">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-4 tracking-widest">AI Config</p>
                    <div className="space-y-3">
                        <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="w-full text-xs font-bold border-slate-200 rounded-xl bg-slate-50">
                            <option value="easy">Beginner</option>
                            <option value="medium">Intermediate</option>
                            <option value="hard">Expert</option>
                        </select>
                        <select value={type} onChange={e => setType(e.target.value)} className="w-full text-xs font-bold border-slate-200 rounded-xl bg-slate-50">
                            <option value="mixed">Mixed Types</option>
                            <option value="mcq">MCQ Only</option>
                            <option value="coding">Coding Problems</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* MAIN AREA: CHAT (40%) */}
            <div className="flex-grow flex flex-col bg-[#fdfdfd] border-r">
                <div className="p-6 border-b flex items-center justify-between bg-white shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                             <Brain className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-sm font-black uppercase tracking-tight">Exam AI Generator</h1>
                            <p className="text-[10px] text-green-600 font-bold flex items-center gap-1 uppercase italic"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> RAG Engine Online</p>
                        </div>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto p-6 space-y-6">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                                m.role === 'user' 
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 rounded-br-none' 
                                : 'bg-white border border-slate-100 text-slate-700 shadow-sm rounded-bl-none'
                            }`}>
                                {m.content}
                            </div>
                        </div>
                    ))}
                    {generating && (
                        <div className="flex justify-start">
                             <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm italic text-xs text-slate-400 flex items-center gap-3">
                                 <Loader2 className="w-4 h-4 animate-spin" /> Retrieving context and building questions...
                             </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                <div className="p-6 bg-white border-t">
                    <div className="flex gap-4 p-2 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner group-focus-within:border-blue-300 transition-all">
                        <input 
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && handleSend()}
                            placeholder="e.g. Generate 5 backend MCQs from my policy doc..."
                            className="bg-transparent border-none focus:ring-0 flex-1 text-sm font-medium px-4"
                        />
                        <button onClick={handleSend} disabled={generating} className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* RESULTS PREVIEW (35%) */}
            <div className="w-[500px] flex flex-col bg-slate-50 overflow-y-auto p-8">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Question Preview</h3>
                    <div className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[9px] font-black uppercase text-slate-500 shadow-sm flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500" /> {generatedQuestions.length} Items
                    </div>
                </div>

                <div className="space-y-4">
                    {generatedQuestions.length === 0 ? (
                         <div className="h-64 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 p-10 text-center">
                             <MessageSquare className="w-12 h-12 mb-4 opacity-10" />
                             <p className="text-[10px] font-bold uppercase tracking-widest leading-loose">Generated questions will appear here. Start a chat or upload documentation.</p>
                         </div>
                    ) : generatedQuestions.map((q, i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 group">
                            <div className="flex justify-between items-start mb-3">
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[8px] font-black uppercase rounded-lg border border-indigo-100 tracking-tighter">
                                    {q.type}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="p-1 hover:text-blue-500"><Edit className="w-3 h-3" /></button>
                                    <button className="p-1 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                </div>
                            </div>
                            <p className="text-sm font-bold text-slate-800 mb-3">{q.question}</p>
                            {q.type === 'mcq' && (
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    {q.options?.map((opt: string, idx: number) => (
                                        <div key={idx} className="text-[10px] p-2 bg-slate-50 rounded-lg text-slate-600 font-medium border border-slate-100">
                                            {opt}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="text-[9px] font-medium text-slate-400 bg-slate-50 p-2 rounded-lg italic">
                                <span className="text-indigo-600 font-black uppercase not-italic mr-1">Source:</span> {q.source_context || "General Training Data"}
                            </div>
                        </div>
                    ))}
                </div>

                {generatedQuestions.length > 0 && (
                    <div className="mt-8 pt-8 border-t border-slate-200">
                         <button 
                            onClick={handleSaveTemplate}
                            disabled={saving || generatedQuestions.length === 0}
                            className={`w-full py-4 bg-green-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-green-600/20 hover:bg-green-700 transition-all transform active:scale-95 flex items-center justify-center gap-3 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                         >
                             {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                             {saving ? "Saving Template..." : "Save as Exam Template"}
                         </button>
                         <p className="text-[9px] text-center text-slate-400 font-black uppercase tracking-widest mt-4 italic opacity-50 underline cursor-pointer hover:opacity-100">Discard all questions</p>
                    </div>
                )}
            </div>
        </div>
    );
}
