import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RecruitAI - AI-Powered Hiring Platform",
  description: "Advanced ATS, AI Exams, and Automated Interviews.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased`}>
        <Providers>
          {children}
        </Providers>
        <footer className="py-4 text-center text-xs text-gray-500 bg-gray-50 mt-auto">
          &copy; {new Date().getFullYear()} RecruitAI. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
