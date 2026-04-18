import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./components/Providers";
import Footer from "@/components/Footer";
import Chatbot from "@/components/Chatbot";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RecruitAI – AI Hiring Platform with Online Exams & ATS",
  description: "RecruitAI is a next-generation AI hiring platform featuring automated exams, ATS, and smart proctoring. Streamline your recruitment process with cutting-edge AI technology.",
  keywords: ["RecruitAI", "AI Hiring", "ATS", "AI Exams", "Automated Interviews", "Hiring Platform India", "Recruitment Software"],
  authors: [{ name: "RecruitAI Team" }],
  viewport: "width=device-width, initial-scale=1",
  metadataBase: new URL("https://recruitaitech.in"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "RecruitAI – AI Hiring Platform with Online Exams & ATS",
    description: "Advanced ATS, AI Exams, and Automated Interviews. Secure, fair, and fast hiring driven by Next-Gen AI.",
    url: "https://recruitaitech.in",
    siteName: "RecruitAI",
    images: [
      {
        url: "/preview.png",
        width: 1200,
        height: 630,
        alt: "RecruitAI Platform Preview",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RecruitAI – AI Hiring Platform with Online Exams & ATS",
    description: "Advanced ATS, AI Exams, and Automated Interviews. Secure, fair, and fast hiring driven by Next-Gen AI.",
    images: ["/preview.png"],
  },
  verification: {
    google: "TO_BE_ADDED",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased`}>
        <Providers session={session}>
          {children}
          <Chatbot />
        </Providers>
        <Footer />
      </body>
    </html>
  );
}
