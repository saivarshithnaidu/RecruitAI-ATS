import { verifyEmail } from "@/app/actions/auth";
import Link from "next/link";
import { Suspense } from "react";

// Suspense wrapper for searchParams usage if needed, but Page props are async in App Router
export default async function VerifyPage({
    searchParams,
}: {
    searchParams: { token: string };
}) {
    const token = searchParams.token;
    let success = false;
    let message = "";

    if (!token) {
        message = "No token provided.";
    } else {
        const result = await verifyEmail(token);
        if (result.success) {
            success = true;
            message = "Email verified successfully! You can now apply for jobs.";
        } else {
            message = result.error || "Verification failed.";
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        {success ? "Verification Complete" : "Verification Failed"}
                    </h2>
                    <p className={`mt-2 text-center text-sm ${success ? 'text-green-600' : 'text-red-600'}`}>
                        {message}
                    </p>
                </div>

                <div className="mt-5 text-center">
                    <Link href={success ? "/dashboard" : "/"} className="font-medium text-blue-600 hover:text-blue-500">
                        {success ? "Go to Dashboard" : "Back to Home"}
                    </Link>
                </div>
            </div>
        </div>
    );
}
