import LandingNavbar from "../components/LandingNavbar";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RecruitAI Features – Advanced AI Exams, ATS & Proctoring",
  description: "Explore how RecruitAI Tech transforms hiring with AI resume screening, secure online exams, and automated technical interviews. Discover our next-gen hiring features.",
  alternates: {
    canonical: "https://recruitaitech.in/features",
  },
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <LandingNavbar />
      
      <main className="flex-grow pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-6">
              Empowering the Future of Hiring
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              RecruitAI combines cutting-edge artificial intelligence with a seamless user experience 
              to provide an all-in-one hiring platform that is fair, fast, and secure.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-32">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">AI Resume Screening (ATS)</h2>
                <p className="text-gray-600 mb-6 leading-relaxed">
                    Our AI models analyze resumes with high precision, matching skills and experience 
                    to your exact job requirements. No more manual sorting of thousands of applications.
                </p>
                <ul className="space-y-4">
                    <FeatureItem text="Instant ATS scoring and ranking" />
                    <FeatureItem text="Skill gap analysis" />
                    <FeatureItem text="Auto-shortlisting based on custom criteria" />
                </ul>
            </div>
            <div className="bg-blue-50 rounded-3xl p-12 aspect-video flex items-center justify-center">
                <span className="text-8-xl">🤖</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-32 md:flex-row-reverse">
             <div className="order-2 md:order-1 bg-purple-50 rounded-3xl p-12 aspect-video flex items-center justify-center">
                <span className="text-8-xl">🛡️</span>
            </div>
            <div className="order-1 md:order-2">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Secure AI Proctored Exams</h2>
                <p className="text-gray-600 mb-6 leading-relaxed">
                    Maintain the integrity of your assessments with our advanced AI proctoring system. 
                    Monitor candidates in real-time and detect malpractice automatically.
                </p>
                <ul className="space-y-4">
                    <FeatureItem text="Webcam & Audio monitoring" />
                    <FeatureItem text="Tab-switch and copy-paste detection" />
                    <FeatureItem text="AI-generated dynamic question banks" />
                </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-32">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">AI-Driven Technical Interviews</h2>
                <p className="text-gray-600 mb-6 leading-relaxed">
                    Scale your interview process with automated technical rounds. 
                    Our AI conducts voice-based interviews, evaluating technical depth and communication skills.
                </p>
                <ul className="space-y-4">
                    <FeatureItem text="Natural language technical questions" />
                    <FeatureItem text="Sentiment and confidence analysis" />
                    <FeatureItem text="Instant interview transcripts and summaries" />
                </ul>
            </div>
            <div className="bg-green-50 rounded-3xl p-12 aspect-video flex items-center justify-center">
                <span className="text-8-xl">💻</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function FeatureItem({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">✓</div>
            <span className="text-gray-700 font-medium">{text}</span>
        </div>
    );
}
