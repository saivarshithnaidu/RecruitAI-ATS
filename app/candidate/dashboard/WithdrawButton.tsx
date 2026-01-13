"use client"

import { useState } from "react"
import { withdrawApplication } from "@/app/actions/application"
import { Loader2, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

export default function WithdrawButton({ applicationId }: { applicationId: string }) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleWithdraw = async () => {
        if (!confirm("Are you sure you want to withdraw your application? This action cannot be undone immediately, but you can re-apply.")) {
            return
        }

        setLoading(true)
        try {
            const result = await withdrawApplication(applicationId)
            if (result.success) {
                alert("Application withdrawn successfully.")
                router.refresh()
            } else {
                alert(result.message || "Failed to withdraw.")
            }
        } catch (error) {
            console.error(error)
            alert("An error occurred.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleWithdraw}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 bg-red-50 px-3 py-2 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Withdraw Application
        </button>
    )
}
