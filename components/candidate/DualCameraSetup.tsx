"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { generateMobileConnectToken } from "@/app/actions/proctor";
import { supabaseClient } from "@/lib/supabaseClient";
import { Smartphone, CheckCircle, Loader2, RefreshCw } from "lucide-react";

interface DualCameraSetupProps {
    examId: string;
    userId: string;
    onReady: (isReady: boolean) => void;
}

export default function DualCameraSetup({ examId, userId, onReady }: DualCameraSetupProps) {
    const [qrUrl, setQrUrl] = useState<string>("");
    const [status, setStatus] = useState<'generating' | 'waiting' | 'connected' | 'error'>('generating');
    // Using simple client is fine here as we just need presence/broadcast check
    const supabase = supabaseClient;

    useEffect(() => {
        generateToken();
        const channel = setupRealtime();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const generateToken = async () => {
        try {
            setStatus('generating');
            const { url } = await generateMobileConnectToken(examId);

            // If no base URL in env, construct from window
            const finalUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
            setQrUrl(finalUrl);
            setStatus('waiting');
        } catch (e) {
            console.error(e);
            setStatus('error');
        }
    };

    const setupRealtime = () => {
        const channel = supabase.channel(`proctor-${examId}`);

        channel
            .on('broadcast', { event: 'mobile-connected' }, (payload: any) => {
                const data = payload.payload || payload; // handle potential nesting differences
                if (data.userId === userId) {
                    setStatus('connected');
                    onReady(true);
                }
            })
            .on('broadcast', { event: 'mobile-disconnected' }, (payload: any) => {
                const data = payload.payload || payload;
                if (data.userId === userId) {
                    setStatus('waiting');
                    onReady(false);
                }
            })
            .subscribe();

        return channel;
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm max-w-md w-full mx-auto">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-600" />
                Mobile Camera Setup ("Third Eye")
            </h3>

            <div className="flex flex-col items-center">
                {status === 'generating' && (
                    <div className="h-48 flex items-center justify-center text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                )}

                {status === 'error' && (
                    <div className="text-red-500 py-8 text-center">
                        <p>Failed to load QR Code.</p>
                        <button onClick={generateToken} className="text-blue-600 underline mt-2">Retry</button>
                    </div>
                )}

                {status === 'waiting' && qrUrl && (
                    <div className="text-center animate-in fade-in">
                        <div className="bg-white p-4 rounded-lg border-2 border-gray-100 shadow-inner mb-4 inline-block">
                            <QRCodeSVG value={qrUrl} size={180} level="H" />
                        </div>
                        <p className="text-sm font-medium text-gray-800 mb-1">Scan with your phone camera</p>
                        <p className="text-xs text-gray-500">Opens a secure camera link. No app required.</p>

                        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Waiting for connection...
                        </div>
                    </div>
                )}

                {status === 'connected' && (
                    <div className="text-center py-8">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-short">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h4 className="font-bold text-green-700 text-lg">Mobile Connected</h4>
                        <p className="text-sm text-gray-500 mt-1">Camera is active. Please place your phone as instructed.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
