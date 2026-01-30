import { verifyMobileToken } from "@/lib/proctor-token";
import MobileCameraView from "@/components/candidate/MobileCameraView";
import { AlertTriangle } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function MobileSessionPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;

    if (!token) {
        return <ErrorState message="Invalid Token" />;
    }

    try {
        const payload = verifyMobileToken(token);
        if (!payload) throw new Error("Invalid or Expired Token");

        return <MobileCameraView examId={payload.examId} userId={payload.userId} />;

    } catch (e) {
        return <ErrorState message="Session Expired. Please refresh QR code." />;
    }
}

function ErrorState({ message }: { message: string }) {
    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Error</h2>
            <p className="text-gray-400">{message}</p>
        </div>
    )
}
