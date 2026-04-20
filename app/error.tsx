
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    const isDev = process.env.NODE_ENV === 'development';

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="p-8 text-center space-y-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-50 text-red-500 mb-2">
                        <AlertTriangle className="w-10 h-10" />
                    </div>
                    
                    <div className="space-y-2">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">System Error</h1>
                        <p className="text-slate-500 font-medium leading-relaxed">
                            We've encountered an unexpected issue. Our team has been notified.
                        </p>
                    </div>

                    {isDev && (
                        <div className="text-left mt-6 p-4 bg-slate-900 rounded-xl overflow-x-auto">
                            <p className="text-red-400 font-mono text-xs mb-2">Detailed Error (Dev Only):</p>
                            <pre className="text-slate-300 font-mono text-[10px] whitespace-pre-wrap">
                                {error.message}
                                {"\n\n"}
                                {error.stack}
                            </pre>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        <button
                            onClick={() => reset()}
                            className="flex-1 flex items-center justify-center gap-2 py-4 bg-blue-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-blue-700 transition-all active:scale-95 shadow-xl shadow-blue-600/20"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            Try Again
                        </button>
                        <Link
                            href="/"
                            className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-100 text-slate-900 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
                        >
                            <Home className="w-4 h-4" />
                            Return Home
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

