"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, AlertTriangle } from "lucide-react";

export default function ReuploadResume() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError("");
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError("Please select a file first.");
            return;
        }

        setUploading(true);
        setError("");

        try {
            const formData = new FormData();
            formData.append('resume', file);

            const res = await fetch('/api/candidate/reupload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                // Show Server Error Message including internal details if any
                const msg = data.message || "Upload failed";
                const internal = data.internal ? ` (${data.internal})` : "";
                throw new Error(msg + internal);
            }

            // Success
            alert("Resume uploaded successfully");
            router.refresh();
            setFile(null); // Clear file input
            // UI will naturally update on refresh as status changes from parse_failed

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Something went wrong.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
            <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="text-yellow-600 w-6 h-6" />
                <h3 className="text-lg font-semibold text-yellow-800">Resume Parsing Failed</h3>
            </div>

            <p className="text-yellow-700 mb-6">
                Please upload your resume again to continue ATS evaluation. Ensure the file is clear and readable (PDF/DOCX).
            </p>

            <div className="space-y-4">
                <input
                    type="file"
                    accept=".pdf,.docx,.doc"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
                />

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                    {uploading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <Upload className="w-4 h-4 mr-2" />
                            Re-upload Resume
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
