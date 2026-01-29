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
                onStatusChange(res.passed ? 'passed' : 'failed');
            }
        } catch (err) {
            setResult({ success: false, output: "System Error. Please try again." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-white shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-800 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                        {isSQL ? 'SQL Query Editor' : 'Coding Assessment'}
                    </span>
                    {!isSQL && (
                        <select
                            value={language}
                            onChange={(e) => {
                                setLanguage(e.target.value);
                                setCode(getStarterCode(e.target.value));
                            }}
                            className="text-xs border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1"
                        >
                            <option value="python">Python</option>
                            <option value="javascript">JavaScript</option>
                            <option value="java">Java</option>
                            <option value="cpp">C++</option>
                        </select>
                    )}
                </div>
                <div className="text-xs text-gray-400 font-medium">
                    Strict Logic Evaluation Mode
                </div>
            </div>

            {/* Disclaimer Banner */}
            <div className="bg-yellow-50 px-4 py-2 border-b border-yellow-100 flex items-start gap-2">
                <svg className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <p className="text-xs text-yellow-800">
                    <strong>Assessment Mode:</strong> Your code will be evaluated against multiple <strong>hidden test cases</strong> for logical correctness.
                    {isSQL ? ' Queries are executed against a read-only database instance.' : ' No real-time output is shown until submission.'}
                </p>
            </div>

            {/* Split View */}
            <div className="flex-1 flex flex-col md:flex-row h-[500px]">
                {/* Code Area */}
                <div className="flex-1 border-r border-gray-200 bg-[#1e1e1e] flex flex-col">
                    <div className="flex-1 relative">
                        <textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="absolute inset-0 w-full h-full p-4 font-mono text-sm bg-[#1e1e1e] text-gray-200 resize-none focus:outline-none leading-relaxed"
                            spellCheck={false}
                            placeholder={isSQL ? "SELECT * FROM users..." : "Type your code here..."}
                        />
                    </div>
                </div>

                {/* Info / Result Area */}
                <div className="w-full md:w-1/3 flex flex-col bg-gray-50 border-l">
                    <div className="flex-1 p-5 overflow-y-auto">
                        <h4 className="font-bold text-gray-700 mb-2 text-sm uppercase tracking-wider">Problem Constraints</h4>
                        <div className="p-3 bg-white rounded border border-gray-200 text-xs text-gray-600 mb-6 whitespace-pre-wrap font-mono">
                            {question.constraints || "No specific constraints."}
                        </div>

                        {isSQL ? (
                            <div className="mb-6">
                                <h4 className="font-bold text-gray-700 mb-2 text-sm uppercase tracking-wider">Database Schema</h4>
                                <div className="p-3 bg-blue-50 rounded border border-blue-100 text-xs font-mono text-blue-900 overflow-x-auto">
                                    {question.schema_description || "Table: users\n(id INT, name VARCHAR, email VARCHAR)"}
                                </div>
                            </div>
                        ) : (
                            <div className="mb-6">
                                <h4 className="font-bold text-gray-700 mb-2 text-sm uppercase tracking-wider">Sample Test Case</h4>
                                {question.test_cases?.[0] ? (
                                    <div className="space-y-2">
                                        <div className="text-xs bg-white p-2 rounded border border-gray-200">
                                            <div className="font-mono text-gray-500 mb-1">Input:</div>
                                            <div className="font-mono text-gray-900 bg-gray-50 p-1 rounded">
                                                {typeof question.test_cases[0].input === 'object' ? JSON.stringify(question.test_cases[0].input) : question.test_cases[0].input}
                                            </div>
                                            <div className="font-mono text-gray-500 mb-1 mt-2">Expected Output:</div>
                                            <div className="font-mono text-gray-900 bg-gray-50 p-1 rounded">
                                                {typeof question.test_cases[0].output === 'object' ? JSON.stringify(question.test_cases[0].output) : question.test_cases[0].output}
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-gray-400 italic text-right">+ {Math.max(0, (question.test_cases?.length || 0) - 1)} hidden test cases</p>
                                    </div>
                                ) : <p className="text-xs text-gray-400 italic">No sample cases provided.</p>}
                            </div>
                        )}

                        {/* Evaluation Result */}
                        {result && (
                            <div className={`mt-4 p-4 rounded-lg border shadow-sm animate-fade-in
                                ${result.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}
                            `}>
                                <div className="flex items-center gap-2 mb-3">
                                    {result.passed ? (
                                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    ) : (
                                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    )}
                                    <h3 className={`font-bold ${result.passed ? 'text-green-800' : 'text-red-800'}`}>
                                        {result.passed ? 'Solution Accepted' : 'Evaluation Failed'}
                                    </h3>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between border-b border-black/5 pb-2">
                                        <span className="text-gray-600">Status</span>
                                        <span className={`font-mono font-bold ${result.passed ? 'text-green-700' : 'text-red-700'}`}>
                                            {result.passed ? 'PASSED' : 'FAILED'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-b border-black/5 pb-2">
                                        <span className="text-gray-600">Test Cases</span>
                                        <span className="font-mono text-gray-800">
                                            {result.testCasesPassed} / {result.totalTestCases}
                                        </span>
                                    </div>
                                    <div className="pt-2">
                                        <span className="text-gray-600 block mb-1">Feedback</span>
                                        <p className="font-mono text-xs bg-white/50 p-2 rounded border border-black/5 text-gray-800">
                                            {result.output}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-white border-t">
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className={`w-full py-3 rounded-lg font-bold text-white shadow-md transition flex items-center justify-center gap-2
                                ${loading
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 transform hover:-translate-y-0.5'}
                            `}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Evaluating Solution...
                                </>
                            ) : (
                                <>
                                    <span>Submit Limit: Unlimited</span>
                                    <span className="mx-2">|</span>
                                    Submit Solution &rarr;
                                </>
                            )}
                        </button>
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
