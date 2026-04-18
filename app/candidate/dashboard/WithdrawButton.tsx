"use client";

import { withdrawApplication } from "@/app/actions/application";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WithdrawButton({ applicationId }: { applicationId: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleWithdraw = async () => {
        if (!confirm("Are you sure you want to withdraw your application? This action cannot be undone immediately.")) {
            return;
        }

        setLoading(true);
        const res = await withdrawApplication(applicationId);

        if (!res.success) {
            alert(res.message);
        } else {
            router.refresh(); // Refresh to show updated status
        }
        setLoading(false);
    };

    return (
        <button
            onClick={handleWithdraw}
            disabled={loading}
            className="text-red-600 hover:text-red-800 text-sm font-medium underline disabled:opacity-50"
        >
            {loading ? "Withdrawing..." : "Withdraw Application"}
        </button>
    );
}
