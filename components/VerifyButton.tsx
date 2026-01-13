"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2 } from "lucide-react";

export default function VerifyButton({ userId }: { userId: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);

    const handleVerify = async (action: 'approve' | 'reject') => {
        if (!confirm(`Are you sure you want to ${action} this candidate?`)) return;

        setLoading(action);
        try {
            const res = await fetch('/api/admin/verify-candidate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, action })
            });

            if (!res.ok) {
                const err = await res.json();
                alert(err.message || 'Action failed');
                return;
            }

            // Success
            router.refresh(); // Refresh server component to show new status
        } catch (error) {
            console.error(error);
            alert("Something went wrong");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={() => handleVerify('approve')}
                disabled={!!loading}
                className="inline-flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
            >
                {loading === 'approve' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                Verify
            </button>
            <button
                onClick={() => handleVerify('reject')}
                disabled={!!loading}
                className="inline-flex items-center px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
            >
                {loading === 'reject' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <X className="w-3 h-3 mr-1" />}
                Reject
            </button>
        </div>
    );
}
