import Link from "next/link";
import React from "react";

export default function Footer() {
    return (
        <footer className="py-12 bg-white text-center text-sm text-gray-500 border-t border-gray-100 mt-auto">
            <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">
                <div className="flex items-center gap-2 mb-6 opacity-80">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-sm">R</div>
                    <span className="font-bold text-gray-700">RecruitAI</span>
                </div>

                <div className="flex flex-wrap justify-center gap-8 mb-8 text-gray-600">
                    <Link href="/privacy-policy" className="hover:text-blue-600 transition">
                        Privacy Policy
                    </Link>
                    <Link href="/terms-and-conditions" className="hover:text-blue-600 transition">
                        Terms & Conditions
                    </Link>
                    <a href="mailto:support@recruitaitech.in" className="hover:text-blue-600 transition">
                        Contact: support@recruitaitech.in
                    </a>
                </div>

                <p className="text-gray-400">
                    &copy; {new Date().getFullYear()} RecruitAI Tech. All rights reserved.
                </p>
            </div>
        </footer>
    );
}
