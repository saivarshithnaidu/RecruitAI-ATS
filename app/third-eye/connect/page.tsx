"use client";

import nextDynamic from 'next/dynamic';
import { Suspense } from 'react';

// Use dynamic import with ssr: false to prevent useSearchParams() from breaking production build during prerender
const ConnectContent = nextDynamic(() => import("./ConnectContent"), { ssr: false });

export const dynamic = 'force-dynamic';

export default function MobileConnectPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6 text-center">
                <p>Loading...</p>
            </div>
        }>
            <ConnectContent />
        </Suspense>
    );
}
