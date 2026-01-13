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
    const [code, setCode] = useState<string>("// Write your solution here\n");
    const [language, setLanguage] = useState("python");
    const [output, setOutput] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string>("pending"); // pending, running, passed, failed

    const handleRun = async () => {
        setLoading(true);
        setOutput("Compiling and running test cases...");
        setStatus("running");

        try {
            const res = await submitCode({
                assignmentId,
                questionIdx,
                code,
                language,
                testCases: question.test_cases
            });

            if (res.error) {
                setOutput(`Error: ${res.error}`);
                setStatus("failed");
                onStatusChange("failed");
            } else {
                setOutput(res.output || "Execution finished.");
                setStatus(res.passed ? "passed" : "failed");
                onStatusChange(res.passed ? "passed" : "failed");
            }
        } catch (err) {
            setOutput("System Error during execution.");
            setStatus("failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-white shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b">
                <div className="flex items-center gap-4">
                    <span className="font-semibold text-gray-700">Coding Editor</span>
                    <select
                        value={language}
                        onChange={(e) => setCode(getStarterCode(e.target.value))}
                        /* @ts-ignore */
                        onChangeCapture={(e) => setLanguage(e.currentTarget.value)}
                        className="text-sm border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                        <option value="python">Python</option>
                        <option value="javascript">JavaScript</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                    </select>
                </div>
                <div className="text-xs text-gray-500">
                    Auto-saved
                </div>
            </div>

            {/* Split View */}
            <div className="flex-1 flex flex-col md:flex-row">
                {/* Code Area */}
                <div className="flex-1 border-r border-gray-200 bg-[#1e1e1e]">
                    <textarea
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="w-full h-full p-4 font-mono text-sm bg-[#1e1e1e] text-gray-200 resize-none focus:outline-none"
                        spellCheck={false}
                        placeholder="Type your code here..."
                    />
                </div>

                {/* Output & Info Area */}
                <div className="w-full md:w-1/3 flex flex-col bg-gray-50">
                    <div className="flex-1 p-4 overflow-y-auto">
                        <h4 className="font-bold text-gray-700 mb-2">Problem Constraints</h4>
                        <p className="text-xs text-gray-600 mb-4 whitespace-pre-wrap">{question.constraints || "No specific constraints."}</p>

                        <h4 className="font-bold text-gray-700 mb-2">Test Cases</h4>
                        <div className="space-y-2">
                            {question.test_cases?.map((tc: any, i: number) => (
                                <div key={i} className="text-xs bg-white p-2 rounded border border-gray-200">
                                    <div className="font-mono text-gray-500">In: {tc.input}</div>
                                    <div className="font-mono text-gray-800">Out: {tc.output}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 bg-gray-900 text-white h-40 overflow-y-auto font-mono text-xs border-t border-gray-700">
                        <div className="text-gray-400 mb-1">CONSOLE OUTPUT:</div>
                        <div className={status === 'passed' ? 'text-green-400' : status === 'failed' ? 'text-red-400' : 'text-gray-300'}>
                            {output || "Ready to run."}
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="p-3 bg-white border-t flex justify-end gap-3">
                <button
                    onClick={handleRun}
                    disabled={loading}
                    className={`px-4 py-2 rounded text-sm font-medium transition flex items-center gap-2
                        ${loading ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-green-600 hover:bg-green-700 text-white shadow-sm'}
                    `}
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Compiling...
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            Run Code
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

function getStarterCode(lang: string) {
    if (lang === 'python') return `def solve():\n    # Write your code here\n    pass`;
    if (lang === 'javascript') return `function solve() {\n    // Write your code here\n}`;
    if (lang === 'java') return `public class Main {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}`;
    if (lang === 'cpp') return `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}`;
    return "";
}
