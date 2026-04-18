"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { FileQuestion, Home, LayoutDashboard, ArrowLeft, Loader2 } from "lucide-react";

export default function NotFound() {
    const { data: session, status } = useSession();

    // While loading session, show a simple loader
    if (status === "loading") {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
        );
    }

    // REQUIREMENT 3: If not logged in, show simple 404 or redirect (using window.location for hard redirect in client component)
    if (!session) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 text-center">
                <div className="space-y-6">
                    <FileQuestion className="w-20 h-20 text-blue-500 mx-auto" />
                    <h1 className="text-3xl font-bold text-white uppercase tracking-tight">404 - Not Found</h1>
                    <p className="text-slate-400">Please sign in to access this page.</p>
                    <Link 
                        href="/auth/login" 
                        className="inline-block px-8 py-4 bg-blue-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-blue-700 transition-all active:scale-95 shadow-xl shadow-blue-600/20"
                    >
                        Sign In Now
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-sans">
            <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
                {/* Visual Icon */}
                <div className="relative inline-block">
                    <div className="absolute inset-0 bg-blue-600/20 blur-3xl rounded-full"></div>
                    <div className="relative bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
                        <FileQuestion className="w-20 h-20 text-blue-500 mx-auto" />
                    </div>
                </div>

                {/* Text Content */}
                <div className="space-y-4">
                    <h1 className="text-4xl font-black text-white tracking-tight uppercase">
                        Page Not Found
                    </h1>
                    <p className="text-slate-400 text-lg font-medium leading-relaxed">
                        The page you’re looking for doesn’t exist or has been moved to a new location.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 gap-4 pt-4">
                    <Link 
                        href="/" 
                        className="flex items-center justify-center gap-3 py-4 bg-white text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-200 transition-all active:scale-95 shadow-xl"
                    >
                        <Home className="w-4 h-4" />
                        Go Home
                    </Link>
                    <Link 
                        href="/candidate/application" 
                        className="flex items-center justify-center gap-3 py-4 bg-blue-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-blue-700 transition-all active:scale-95 shadow-xl shadow-blue-600/20"
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        Go to Dashboard
                    </Link>
                    <button 
                        onClick={() => typeof window !== 'undefined' && window.history.back()}
                        className="flex items-center justify-center gap-3 py-4 bg-slate-900 border border-slate-800 text-slate-400 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-800 transition-all active:scale-95"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Previous
                    </button>
                </div>

                {/* Footer Logo/Branding */}
                <div className="pt-8 opacity-30">
                    <span className="font-black text-white text-xl tracking-tighter italic">RecruitAI</span>
                </div>
            </div>
        </div>
    );
}
