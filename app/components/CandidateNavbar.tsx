'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

export default function CandidateNavbar() {
    const { data: session } = useSession();

    return (
        <nav className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link href="/candidate/application" className="flex-shrink-0 flex items-center">
                            <span className="text-xl font-bold text-blue-600">RecruitAI</span>
                        </Link>
                    </div>

                    <div className="flex items-center space-x-4">
                        <Link href="/candidate/application" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md font-medium">
                            My Application
                        </Link>
                        <Link href="/candidate/profile" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md font-medium">
                            My Profile
                        </Link>

                        <div className="flex items-center ml-4 border-l pl-4 border-gray-200">
                            <span className="text-sm text-gray-500 mr-2 max-w-[150px] truncate">{session?.user?.email}</span>
                            <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600 mr-2 uppercase tracking-wide">CANDIDATE</span>
                            <button
                                onClick={() => signOut({ callbackUrl: '/' })}
                                className="text-gray-500 hover:text-red-600 px-3 py-2 rounded-md font-medium text-sm"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
