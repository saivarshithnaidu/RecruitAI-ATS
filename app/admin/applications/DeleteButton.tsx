"use client";

import { deleteApplication } from "@/app/actions/application";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteApplicationButton({ applicationId }: { applicationId: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to CLOSE this application? This is a soft delete.")) {
            return;
        }

        setLoading(true);
        const res = await deleteApplication(applicationId);

        if (!res.success) {
            alert(res.message);
        } else {
            router.refresh();
        }
        setLoading(false);
    };

    return (
        <button
            onClick={handleDelete}
            disabled={loading}
            className="text-red-500 hover:text-red-700 text-xs font-semibold ml-2 disabled:opacity-50"
            title="Close Application"
        >
            {loading ? "..." : "🗑️"}
        </button>
    );
}
