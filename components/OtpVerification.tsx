"use client";

import { useState } from "react";
import { requestOtp, verifyOtp } from "@/app/actions/otp";

interface Props {
    type: 'email' | 'phone';
    isVerified: boolean;
    target?: string | null;
    label?: string;
}

export default function OtpVerification({ type, isVerified, target, label }: Props) {
    const [status, setStatus] = useState<'idle' | 'input' | 'processing' | 'success'>('idle');
    const [otp, setOtp] = useState("");
    const [message, setMessage] = useState("");

    const displayLabel = label || (type === 'email' ? 'Email Address' : 'Phone Number');

    async function handleRequestOtp() {
        if (!target) {
            setMessage(`Please add your ${displayLabel.toLowerCase()} in your profile first.`);
            return;
        }

        setStatus('processing');
        setMessage("");

        try {
            const res = await requestOtp(type);
            if (res.error) {
                setMessage(res.error);
                setStatus('idle');
            } else {
                setMessage(`OTP sent to ${target}`);
                setStatus('input');
            }
        } catch (e) {
            setMessage("Failed to request OTP");
            setStatus('idle');
        }
    }

    async function handleVerifyOtp() {
        if (otp.length !== 6) {
            setMessage("Please enter a valid 6-digit OTP");
            return;
        }

        setStatus('processing');

        try {
            const res = await verifyOtp(type, otp);
            if (res.error) {
                setMessage(res.error);
                setStatus('input');
            } else {
                // Success - Force reload to update server component status
                window.location.reload();
            }
        } catch (e) {
            setMessage("Verification failed");
            setStatus('input');
        }
    }

    if (isVerified) {
        return (
            <div className="flex justify-between items-center py-2">
                <div>
                    <span className="block text-sm font-medium text-gray-700">{displayLabel}</span>
                    <span className="block text-xs text-gray-500 truncate max-w-[150px]">{target || 'N/A'}</span>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Verified
                </span>
            </div>
        );
    }

    return (
        <div className="py-2">
            <div className="flex justify-between items-center mb-2">
                <span className="block text-sm font-medium text-gray-700">{displayLabel}</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Unverified
                </span>
            </div>

            <p className="text-xs text-gray-500 mb-3">{target || 'No details provided'}</p>

            {status === 'idle' && (
                <button
                    onClick={handleRequestOtp}
                    disabled={!target}
                    className="w-full text-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300"
                >
                    Verify Now
                </button>
            )}

            {status === 'input' && (
                <div className="space-y-3">
                    <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                        placeholder="Enter 6-digit OTP"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                    <button
                        onClick={handleVerifyOtp}
                        className="w-full text-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                        Submit OTP
                    </button>
                    <button onClick={() => setStatus('idle')} className="text-xs text-gray-500 hover:text-gray-700 w-full text-center">
                        Cancel
                    </button>
                </div>
            )}

            {status === 'processing' && (
                <div className="text-sm text-center text-gray-500">Processing...</div>
            )}

            {message && (
                <p className={`mt-2 text-xs ${message.includes("sent") ? "text-green-600" : "text-red-500"}`}>
                    {message}
                </p>
            )}
        </div>
    );
}
