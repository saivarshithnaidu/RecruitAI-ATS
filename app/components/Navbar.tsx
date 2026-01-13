'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

/**
 * ========================
 * PUBLIC NAVBAR
 * Component: Navbar (Public)
 * 
 * Usage:
 * - Used in (public)/layout.tsx
 * - Shows: Brand, Apply Now, Login.
 * - If logged in, buttons redirect to appropriate dashboard indirectly via checks, 
 *   but visually this is just the entry point.
 * ========================
 */
export default function Navbar() {
    const pathname = usePathname();
    const { data: session } = useSession();

    // Auth pages don't need the navbar links, or maybe they do? kept logic simplest.
    const isAuthPage = pathname.startsWith("/auth");

    return (
        <nav className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link href="/" className="flex-shrink-0 flex items-center">
                            <span className="text-xl font-bold text-blue-600">RecruitAI</span>
                        </Link>
                    </div>

                    {!isAuthPage && (
                        <div className="flex items-center space-x-4">
                            {!session ? (
                                <>
                                    <Link href="/apply" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md font-medium">
                                        Apply Now
                                    </Link>
                                    <Link href="/auth/login" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md font-medium">
                                        Login
                                    </Link>
                                </>
                            ) : (
                                // If logged in on public page, provide button to go to dashboard
                                <Link
                                    href={session.user?.role === 'ADMIN' ? "/admin/dashboard" : "/candidate/application"}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700"
                                >
                                    Go to Dashboard
                                </Link>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
