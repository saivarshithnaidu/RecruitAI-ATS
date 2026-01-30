import { verifyMobileToken } from "@/lib/proctor-token";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, CheckCircle } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function MobileConnectPage({ searchParams }: { searchParams: Promise<{ token: string }> }) {
    const { token } = await searchParams;

    if (!token) {
        return <ErrorState message="No token provided." />;
    }

    try {
        const payload = verifyMobileToken(token);
        if (!payload) throw new Error("Invalid token");

        // Token is valid, show start button
        return (
            <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-2xl max-w-sm w-full">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>

                    <h1 className="text-2xl font-bold mb-2">Connected!</h1>
                    <p className="text-gray-400 mb-8 text-sm">
                        You are ready to start the Third-Eye camera session for your desktop exam.
                    </p>

                    <div className="bg-blue-900/30 p-4 rounded-lg text-left mb-8 border border-blue-500/30">
                        <h3 className="text-blue-400 font-bold text-xs uppercase tracking-wider mb-2">Instructions</h3>
                        <ul className="text-sm text-gray-300 space-y-2 list-disc pl-4">
                            <li>Place phone behind or to the side of you.</li>
                            <li>Ensure it sees your screen and you.</li>
                            <li>Keep this tab open. Do not lock phone.</li>
                        </ul>
                    </div>

                    <Link
                        href={`/third-eye/session/${token}`}
                        className="block w-full py-4 bg-green-600 rounded-xl font-bold hover:bg-green-700 transition active:scale-95"
                    >
                        Start Camera
                    </Link>
                </div>
                <p className="mt-8 text-xs text-gray-500">RecruitAI Proctoring System v2.0</p>
            </div>
        );

    } catch (e) {
        return <ErrorState message="Token expired or invalid. Please refresh the QR code on your desktop." />;
    }
}

function ErrorState({ message }: { message: string }) {
    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-red-900/20 p-8 rounded-2xl border border-red-500/50 max-w-sm w-full">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h1 className="text-xl font-bold text-red-500 mb-2">Connection Failed</h1>
                <p className="text-gray-400 text-sm">{message}</p>
            </div>
        </div>
    );
}
