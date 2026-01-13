"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function LandingNavbar() {
    const { data: session } = useSession();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <nav
            className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? "bg-white/90 backdrop-blur-md shadow-sm py-4" : "bg-transparent py-6"
                }`}
        >
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl shadow-md">
                        R
                    </div>
                    <span className={`text-xl font-bold tracking-tight transition-colors ${scrolled ? 'text-gray-900' : 'text-gray-900'}`}>
                        RecruitAI
                    </span>
                </div>

                {/* Links (Desktop) */}
                <div className="hidden md:flex items-center gap-8">
                    <Link href="/" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition">
                        Home
                    </Link>
                    <Link href="/apply" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition">
                        Apply
                    </Link>
                    <Link href="#features" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition">
                        Features
                    </Link>
                </div>

                {/* Auth Buttons */}
                <div className="flex items-center gap-4">
                    {session ? (
                        <Link
                            href={session.user?.role === "ADMIN" ? "/admin/dashboard" : "/candidate/application"}
                            className="px-5 py-2.5 bg-gray-900 text-white font-medium rounded-full hover:bg-gray-800 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm"
                        >
                            Dashboard
                        </Link>
                    ) : (
                        <>
                            <Link
                                href="/auth/login"
                                className="hidden sm:block text-sm font-medium text-gray-700 hover:text-blue-600 transition"
                            >
                                Log In
                            </Link>
                            <Link
                                href="/auth/signup"
                                className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 transition shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm"
                            >
                                Get Started
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
