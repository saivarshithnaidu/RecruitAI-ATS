"use client"

import { useState } from "react"
import { verifyExam } from "@/app/actions/exams"
import { Loader2, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"

export default function VerifyExamButton({ examId }: { examId: string }) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleVerify = async () => {
        if (!confirm("Are you sure you want to VERIFY this exam? Once verified, it can be assigned to candidates and cannot be modified.")) {
            return
        }

        setLoading(true)
        try {
            const result = await verifyExam(examId)
            if (result.success) {
                router.refresh()
            } else {
                alert(result.error || "Failed to verified exam")
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
            onClick={handleVerify}
            disabled={loading}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition disabled:opacity-50"
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Verify & Publish Exam
        </button>
    )
}
