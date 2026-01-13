'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminNavbar() {
    const { data: session } = useSession();
    const pathname = usePathname();

    const navItems = [
        { name: 'Dashboard', href: '/admin/dashboard' },
        { name: 'Exams', href: '/admin/exams' },
    ];

    return (
        <nav className="bg-gray-800 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <Link href="/admin/dashboard" className="flex-shrink-0">
                            <span className="text-xl font-bold">RecruitAI Admin</span>
                        </Link>
                        <div className="hidden md:block">
                            <div className="ml-10 flex items-baseline space-x-4">
                                {navItems.map((item) => {
                                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={`px-3 py-2 rounded-md text-sm font-medium ${isActive
                                                ? 'bg-gray-900 text-white'
                                                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                                }`}
                                        >
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center">
                            <span className="text-sm text-gray-300 mr-3">{session?.user?.email}</span>
                            <span className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-200 mr-2 uppercase tracking-wide">ADMIN</span>
                            <button
                                onClick={() => signOut({ callbackUrl: '/' })}
                                className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
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
