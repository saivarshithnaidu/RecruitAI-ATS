"use client";

import { useState, useEffect } from "react";

interface CodeAnalysisViewerProps {
    question: any;
    assignmentId: string;
    questionIdx: number;
    onStatusChange: (answer: string) => void;
}

export default function CodeAnalysisViewer({ question, assignmentId, questionIdx, onStatusChange }: CodeAnalysisViewerProps) {
    const [answer, setAnswer] = useState("");

    // Load existing answer if any (would need to assume passed via props or state, but simplistically we start empty or local state)
    // In ExamInterface we sync state: answers[id].
    // We should probably init state from props if passed.
    // For now, let's just handle local updates propagating up.

    useEffect(() => {
        // Debounce update to parent
        const timer = setTimeout(() => {
            onStatusChange(answer);
        }, 500);
        return () => clearTimeout(timer);
    }, [answer, onStatusChange]);

    const language = question.language || 'javascript';
    const subtype = question.subtype || 'debug'; // find-bug, fix-logic, predict-output

    return (
        <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-[#1e1e1e] shadow-sm text-gray-300 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-900 text-blue-100 uppercase tracking-wider">
                        {language}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">
                        {subtype.replace('-', ' ').toUpperCase()}
                    </span>
                </div>
                <div className="text-xs text-gray-500">
                    Read-Only Mode
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row min-h-0">
                {/* Code Area - Read Only */}
                <div className="flex-1 relative flex flex-col min-w-0 border-r border-[#333]">
                    <div className="absolute inset-0">
                        <textarea
                            value={question.code_snippet || "// No code provided"}
                            readOnly
                            className="w-full h-full p-4 font-mono text-sm bg-[#1e1e1e] text-gray-200 resize-none focus:outline-none leading-relaxed custom-scrollbar"
                            spellCheck={false}
                        />
                    </div>
                </div>

                {/* Answer Area */}
                <div className="w-full md:w-2/5 flex flex-col bg-[#252526]">
                    <div className="px-4 py-3 border-b border-[#333] bg-[#2d2d2d]">
                        <h4 className="font-bold text-gray-200 text-sm">Your Analysis</h4>
                        <p className="text-xs text-gray-500 mt-1">
                            {subtype === 'find-bug' ? "Identify the bug and explain why it occurs." :
                                subtype === 'fix-logic' ? "Provide the corrected logic or code snippet." :
                                    subtype === 'predict-output' ? "What will be the output of this code?" :
                                        "Provide your answer below."}
                        </p>
                    </div>

                    <div className="flex-1 relative">
                        <textarea
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            className="absolute inset-0 w-full h-full p-4 font-mono text-sm bg-[#1e1e1e] text-gray-200 resize-none focus:outline-none leading-relaxed custom-scrollbar placeholder-gray-600"
                            placeholder="Type your answer here..."
                            spellCheck={false}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
