"use client";

import { useState } from "react";
import { uploadCampaignEmails, processCampaignBatch } from "@/app/actions/campaign";
import { Loader2, FileSpreadsheet, Send, Zap, Info, CheckCircle2, AlertTriangle, Database } from "lucide-react";

/**
 * RecruitAI Campaign Client
 * Localized state management for outreach operations.
 */
export default function CampaignClient() {
    const [uploading, setUploading] = useState(false);
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setUploading(true);
        setStatus("Parsing & Storing Emails...");

        const formData = new FormData(e.currentTarget);
        const res = await uploadCampaignEmails(formData);

        if (res.success) {
            setStatus(`Successfully uploaded ${res.count} candidates.`);
            e.currentTarget.reset();
        } else {
            setStatus(`Error: ${res.error}`);
        }
        setUploading(false);
    };

    const handleManualRun = async () => {
        if (!confirm("Start manual batch send (Limit: 50)? This will run in your browser context.")) return;
        setSending(true);
        setStatus("Processing Outreach Batch...");
        
        const res = await processCampaignBatch(50);
        
        if (res.success) {
            setStatus(`Batch complete. Sent: ${res.sent}, Failed: ${res.failed}`);
        } else {
            setStatus(`Batch Error: ${res.error}`);
        }
        setSending(false);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Upload Area */}
            <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-6">
                <div className="flex items-center gap-4 text-blue-600 mb-2">
                    <FileSpreadsheet className="w-8 h-8" />
                    <h2 className="text-xl font-bold text-gray-900">Upload Outreach List</h2>
                </div>
                
                <form onSubmit={handleUpload} className="space-y-4">
                    <div className="border-2 border-dashed border-gray-100 p-10 rounded-2xl text-center bg-gray-50 hover:bg-gray-100 transition-all group">
                        <Database className="w-10 h-10 text-gray-300 mx-auto group-hover:text-blue-200 transition" />
                        <label className="block mt-4 text-sm font-bold text-gray-600 cursor-pointer">
                            <span className="text-blue-600 underline">Select Excel (.xlsx) file</span>
                            <input type="file" name="file" accept=".xlsx" className="hidden" onChange={(e) => {
                                if (e.target.files?.[0]) setStatus(`Ready to upload: ${e.target.files[0].name}`);
                            }} />
                        </label>
                        <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-widest">Required Columns: email | Optional: name, role</p>
                    </div>

                    <button 
                        disabled={uploading}
                        className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition disabled:opacity-50"
                    >
                        {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
                        {uploading ? "Uploading..." : "Process Spreadsheet"}
                    </button>
                </form>

                {status && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 text-sm
                        ${status.includes("Error") ? "bg-red-50 text-red-700 border border-red-100" : "bg-blue-50 text-blue-700 border border-blue-100"}
                    `}>
                        {status.includes("Error") ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        {status}
                    </div>
                )}
            </div>

            {/* Automation Area */}
            <div className="bg-gray-900 p-8 rounded-3xl text-white space-y-8 relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                        <Send className="w-8 h-8 text-blue-400" />
                        <h2 className="text-xl font-bold uppercase tracking-tight">Outreach Automation</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-3">
                            <h3 className="font-bold text-blue-300 flex items-center gap-2">
                                <Info className="w-4 h-4" />
                                How it works
                            </h3>
                            <ul className="text-xs text-gray-400 space-y-2 list-disc pl-4 leading-relaxed">
                                <li>The system fetches the next 50 <span className="text-white font-bold">PENDING</span> emails from your database.</li>
                                <li>Automation runs every 24 hours (or as scheduled via API).</li>
                                <li>Status is automatically updated to <span className="text-green-400 font-bold">SENT</span> or <span className="text-red-400 font-bold">FAILED</span>.</li>
                                <li>Rate limiting ensures 1 message per minute drip-delivery.</li>
                            </ul>
                        </div>

                        <div className="flex flex-col gap-3">
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Maintenance Actions</p>
                            <button 
                                onClick={handleManualRun}
                                disabled={sending}
                                className="w-full bg-white text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition disabled:opacity-50"
                            >
                                {sending ? <Loader2 className="w-5 h-5 animate-spin text-black" /> : <Zap className="w-5 h-5 fill-black" />}
                                {sending ? "Sending Batch..." : "Force Start Daily Batch (50)"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Decorative Element */}
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl"></div>
            </div>
        </div>
    );
}
