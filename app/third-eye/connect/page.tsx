
import { Suspense } from 'react';
import ConnectContent from './ConnectContent';

/*
 * MOBILE CONNECT PAGE (SERVER COMPONENT)
 * FORCE DYNAMIC to avoid Prerender errors with SearchParams (which are used in the client child)
 * We treat this as the entry point.
 */
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
