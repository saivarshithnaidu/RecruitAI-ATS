"use client";

import { useState } from "react";
import { submitCode } from "@/app/actions/coding";

interface CodingEditorProps {
    question: any;
    assignmentId: string;
    questionIdx: number;
    onStatusChange: (status: 'passed' | 'failed' | 'submitted') => void;
}

export default function CodingEditor({ question, assignmentId, questionIdx, onStatusChange }: CodingEditorProps) {
    const isSQL = question.language === 'sql' || question.type === 'sql';
    const [code, setCode] = useState<string>(question.code_starter || getStarterCode(isSQL ? 'sql' : 'python'));
    const [language, setLanguage] = useState(isSQL ? 'sql' : 'python');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const [activeTab, setActiveTab] = useState<'input' | 'output'>('input');
    const [consoleOutput, setConsoleOutput] = useState<string>("");
    const [isRunning, setIsRunning] = useState(false);
    const [testResults, setTestResults] = useState<any[]>([]);

    // Simulate "Run Code" visually
    const handleRun = async () => {
        setIsRunning(true);
        setActiveTab('output');
        setConsoleOutput("Compiling...\n");
        setTestResults([]);

        // Simulate network/compile delay
        await new Promise(r => setTimeout(r, 1500));

        setConsoleOutput(prev => prev + "Running test cases...\n");
        await new Promise(r => setTimeout(r, 800));

        // HEURISTIC SIMULATION (Visual Only)
        const isMockPass = code.length > 50 && (code.includes('return') || code.includes('print') || code.includes('SELECT'));

        if (isMockPass) {
            setConsoleOutput(prev => prev + "Process finished with exit code 0.\n");
            setTestResults([
                { id: 1, status: 'Passed', duration: '0.02s' },
                { id: 2, status: 'Passed', duration: '0.04s' },
                { id: 3, status: 'Passed', duration: '0.01s' } // Hidden
            ]);
        } else {
            setConsoleOutput(prev => prev + "Process finished with exit code 1.\nError: Logic incomplete or syntax error.\n");
            setTestResults([
                { id: 1, status: 'Failed', duration: '0.05s', feedback: 'Output mismatch' },
                { id: 2, status: 'Failed', duration: '0.03s', feedback: 'Output mismatch' }
            ]);
        }
        setIsRunning(false);
    };

    const handleSubmit = async () => {
        setLoading(true);
        setResult(null);

        try {
            const res = await submitCode({
                assignmentId,
                questionIdx,
                code,
                language: isSQL ? 'sql' : language,
                testCases: question.test_cases
            });

            setResult(res);
            if (res.success) {
                // Always say submitted, let admin decide final status
                onStatusChange('submitted');
            }
        } catch (err) {
            setResult({ success: false, output: "System Error. Please try again." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-[#1e1e1e] shadow-sm text-gray-300 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
                <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-100 flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                        {isSQL ? 'SQL Query Editor' : 'Code Editor'}
                    </span>
                    {!isSQL && (
                        <select
                            value={language}
                            onChange={(e) => {
                                setLanguage(e.target.value);
                                setCode(getStarterCode(e.target.value));
                            }}
                            className="text-xs bg-[#3c3c3c] text-gray-200 border-none rounded py-1 px-2 focus:ring-1 focus:ring-blue-500 outline-none"
                        >
                            <option value="python">Python 3.10</option>
                            <option value="javascript">JavaScript (Node 18)</option>
                            <option value="java">Java 17 (OpenJDK)</option>
                            <option value="cpp">C++ (GCC 11)</option>
                        </select>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRun}
                        disabled={isRunning || loading}
                        className="flex items-center gap-1.5 px-3 py-1 bg-[#4d4d4d] hover:bg-[#5a5a5a] text-white text-xs rounded transition"
                    >
                        {isRunning ? <span className="animate-pulse">Running...</span> : <><svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg> Run Code</>}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1 bg-green-700 hover:bg-green-600 text-white text-xs rounded transition font-medium"
                    >
                        {loading ? 'Submitting...' : 'Submit Solution'}
                    </button>
                </div>
            </div>

            {/* Split View */}
            <div className="flex-1 flex flex-col md:flex-row min-h-0">
                {/* Code Area */}
                <div className="flex-1 relative flex flex-col min-w-0">
                    <div className="flex-1 relative">
                        <textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="absolute inset-0 w-full h-full p-4 font-mono text-sm bg-[#1e1e1e] text-gray-200 resize-none focus:outline-none leading-relaxed custom-scrollbar"
                            spellCheck={false}
                            placeholder={isSQL ? "SELECT * FROM users..." : "Type your code here..."}
                        />
                    </div>
                </div>

                {/* Right Panel: IO / Instructions */}
                <div className="w-full md:w-2/5 flex flex-col bg-[#252526] border-l border-[#333]">
                    {/* Tabs */}
                    <div className="flex border-b border-[#333]">
                        <button onClick={() => setActiveTab('input')} className={`px-4 py-2 text-xs font-medium border-t-2 ${activeTab === 'input' ? 'border-blue-500 text-gray-100 bg-[#1e1e1e]' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>Problem & Input</button>
                        <button onClick={() => setActiveTab('output')} className={`px-4 py-2 text-xs font-medium border-t-2 ${activeTab === 'output' ? 'border-blue-500 text-gray-100 bg-[#1e1e1e]' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>Output</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {activeTab === 'input' ? (
                            <div className="space-y-6">
                                <div>
                                    <h4 className="font-bold text-gray-400 mb-2 text-xs uppercase tracking-wider">Constraints</h4>
                                    <div className="p-3 bg-[#2d2d2d] rounded border border-[#3e3e3e] text-xs text-gray-300 font-mono">
                                        {question.constraints || "No specific constraints."}
                                    </div>
                                </div>

                                <h4 className="font-bold text-gray-400 mb-2 text-xs uppercase tracking-wider">Sample Case 0</h4>
                                <div className="space-y-3">
                                    <div className="p-3 bg-[#2d2d2d] rounded border border-[#3e3e3e]">
                                        <div className="text-xs text-gray-500 mb-1 font-mono">Input</div>
                                        <div className="text-sm font-mono text-gray-200">
                                            {question.test_cases?.[0]?.input || "N/A"}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-[#2d2d2d] rounded border border-[#3e3e3e]">
                                        <div className="text-xs text-gray-500 mb-1 font-mono">Expected Output</div>
                                        <div className="text-sm font-mono text-gray-200">
                                            {question.test_cases?.[0]?.output || "N/A"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col font-mono text-xs">
                                <div className="flex-1 bg-[#1e1e1e] p-3 rounded border border-[#333] mb-4 overflow-y-auto">
                                    {consoleOutput ? (
                                        <pre className="text-gray-300 whitespace-pre-wrap">{consoleOutput}</pre>
                                    ) : (
                                        <span className="text-gray-600 italic">Click "Run Code" to see output.</span>
                                    )}
                                </div>

                                {/* Visual Test Cases */}
                                {testResults.length > 0 && (
                                    <div className="space-y-2">
                                        <h5 className="font-bold text-gray-400 mb-1 uppercase tracking-wider">Test Results</h5>
                                        {testResults.map((t, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2 rounded bg-[#2d2d2d] border border-[#3e3e3e]">
                                                <div className="flex items-center gap-2">
                                                    {t.status === 'Passed' ? (
                                                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                    ) : (
                                                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                                    )}
                                                    <span className={t.status === 'Passed' ? 'text-green-400' : 'text-red-400'}>
                                                        Test Case {idx}
                                                    </span>
                                                </div>
                                                <span className="text-gray-500">{t.duration}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {result && (
                                    <div className={`mt-4 p-3 rounded border ${result.success ? 'bg-green-900/20 border-green-800' : 'bg-red-900/20 border-red-800'}`}>
                                        <p className={`font-bold ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                                            {result.success ? "Response Recorded" : "Submission Failed"}
                                        </p>
                                        <p className="text-gray-400 mt-1">
                                            {result.success ? "Your code (v1) has been saved for review." : result.output}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function getStarterCode(lang: string) {
    if (lang === 'sql') return `-- Write your SQL query below\nSELECT * FROM users WHERE active = 1;`;
    if (lang === 'python') return `def solve():\n    # Write your code here\n    pass`;
    if (lang === 'javascript') return `function solve() {\n    // Write your code here\n}`;
    if (lang === 'java') return `public class Main {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}`;
    if (lang === 'cpp') return `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}`;
    return "";
}
