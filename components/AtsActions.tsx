"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { generateAtsScore } from "@/app/actions/ats"
import { Loader2, Eye, Cpu } from "lucide-react"

interface AtsActionsProps {
    application: {
        id: string
        ats_score: number | null
        ats_summary: string | null
        status: string
    }
}

export default function AtsActions({ application }: AtsActionsProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [showSummary, setShowSummary] = useState(false)

    // Helper to determine badge color
    const getScoreColor = (score: number) => {
        if (score >= 85) return "bg-green-100 text-green-800 border-green-200"
        if (score >= 70) return "bg-blue-100 text-blue-800 border-blue-200"
        return "bg-gray-100 text-gray-800 border-gray-200"
    }

    const handleScore = async () => {
        if (!confirm("Generate ATS Score for this candidate? This can only be done once.")) return

        setLoading(true)
        try {
            const result = await generateAtsScore(application.id)
            if (result.success) {
                router.refresh()
            } else {
                alert("Failed to generate score: " + (result.error || "Unknown error"))
            }
        } catch (error) {
            console.error(error)
            alert("An error occurred during scoring.")
        } finally {
            setLoading(false)
        }
    }

    // STATE 1: ALREADY SCORED
    if (application.ats_score !== null) {
        return (
            <div className="flex flex-col items-start gap-2">
                <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-bold ${getScoreColor(application.ats_score)}`}>
                    <span>{application.ats_score}%</span>
                    {application.status === 'SCORED_FALLBACK' && (
                        <span className="text-[9px] uppercase tracking-tighter opacity-75">(Fallback)</span>
                    )}
                </div>

                <button
                    onClick={() => setShowSummary(!showSummary)}
                    className="text-xs flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors font-medium"
                >
                    <Eye className="w-3 h-3" />
                    {showSummary ? "Hide Summary" : "View Assessment"}
                </button>

                {showSummary && application.ats_summary && (
                    <div className="absolute z-50 mt-8 w-72 p-4 bg-white rounded-lg shadow-xl border border-slate-200 text-sm text-slate-700 leading-relaxed dark:bg-slate-900 dark:text-slate-300 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-2 pb-2 border-b">
                            <h4 className="font-semibold text-slate-900 dark:text-white">AI Assessment</h4>
                            <button onClick={() => setShowSummary(false)} className="text-xs text-slate-400 hover:text-slate-600">Close</button>
                        </div>
                        <p className="max-h-60 overflow-y-auto text-xs">{application.ats_summary}</p>
                    </div>
                )}
            </div>
        )
    }

    // STATE 2: NOT SCORED (Show Button)
    return (
        <button
            onClick={handleScore}
            disabled={loading || application.status === 'parse_failed'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
        >
            {loading ? (
                <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Scoring...
                </>
            ) : (
                <>
                    <Cpu className="w-3 h-3" />
                    Score AI
                </>
            )}
        </button>
    )
}
