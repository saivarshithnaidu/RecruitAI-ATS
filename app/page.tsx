"use client";

import Link from "next/link";
import LandingNavbar from "./components/LandingNavbar";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <LandingNavbar />

      {/* 1. HERO SECTION */}
      <section className="relative pt-40 pb-20 lg:pt-52 lg:pb-32 overflow-hidden bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50">
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="inline-block py-1.5 px-4 rounded-full bg-blue-100/50 text-blue-700 text-sm font-bold tracking-wide mb-8 border border-blue-200 animate-fade-in-up">
            🚀 NEXT GEN HIRING PLATFORM
          </div>
          <h1 className="text-5xl lg:text-7xl font-extrabold text-gray-900 tracking-tight leading-[1.1] mb-8 animate-fade-in-up delay-100">
            Hire Smarter with <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              AI-Driven Assessments
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-in-up delay-200">
            RecruitAI automates resume screening, exams, and interviews using secure AI technology, ensuring a fair and fast hiring process.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-300">
            <Link
              href="/apply"
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-xl hover:shadow-blue-600/20 transform hover:-translate-y-1"
            >
              Apply for Jobs
            </Link>
            <Link
              href="#workflow"
              className="w-full sm:w-auto px-8 py-4 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold text-lg hover:bg-gray-50 transition shadow-sm hover:shadow-md transform hover:-translate-y-1"
            >
              How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* 2. WHY RECRUITAI (FEATURES) */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Why RecruitAI?</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              We leverage cutting-edge AI to make hiring fair, fast, and secure.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon="🤖"
              title="AI Resume Screening"
              desc="Accurate ATS scoring using advanced AI models to match skills perfectly."
            />
            <FeatureCard
              icon="🛡️"
              title="Secure Online Exams"
              desc="AI-proctored exams with real-time malpractice detection and monitoring."
            />
            <FeatureCard
              icon="💻"
              title="Skill-Based Hiring"
              desc="Coding challenges and real-world assessments to prove your capabilities."
            />
            <FeatureCard
              icon="⚖️"
              title="Fair & Transparent"
              desc="No bias. No shortcuts. Pure merit-based evaluation for every candidate."
            />
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS (WORKFLOW) */}
      <section id="workflow" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-gray-500">Your journey from application to offer.</p>
          </div>

          <div className="flex flex-col md:flex-row items-start justify-between relative space-y-8 md:space-y-0">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-12 left-0 w-full h-1 bg-gray-200 -z-10"></div>

            <Step number="1" title="Apply for a Job" desc="Submit your resume & details." />
            <Step number="2" title="AI Screening" desc="Instant ATS score analysis." />
            <Step number="3" title="Online Exam" desc="AI-proctored secure test." />
            <Step number="4" title="AI Interview" desc="Voice-based technical round." />
            <Step number="5" title="Final Selection" desc="Get hired based on merit." />
          </div>
        </div>
      </section>

      {/* 4. EXAM SECURITY & TRUST */}
      <section className="py-24 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                Uncompromised Exam Security
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Our platform ensures integrity with enterprise-grade proctoring features. We detect violations in real-time to ensure every hire is genuine.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <SecurityPoint text="Webcam & Mic Monitoring" />
                <SecurityPoint text="Tab-Switch Detection" />
                <SecurityPoint text="Anti-Copy/Paste Protection" />
                <SecurityPoint text="AI Impersonation Check" />
              </div>
            </div>
            <div className="lg:w-1/2 bg-gray-100 rounded-2xl p-8 aspect-video flex items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-blue-600/5 group-hover:bg-blue-600/10 transition"></div>
              <div className="text-center">
                <div className="text-6xl mb-4">🔒</div>
                <div className="font-bold text-gray-400">Secure Environment Active</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FOR CANDIDATES */}
      <section className="py-24 bg-blue-600 text-white relative overflow-hidden">
        {/* Decorative Circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2"></div>

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl lg:text-4xl font-bold mb-8">Built for Candidates</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 text-blue-100">
            <div>
              <div className="text-2xl mb-2">📊</div>
              <h3 className="font-bold text-white mb-1">Transparent Evaluation</h3>
              <p className="text-sm">Know exactly where you stand with instant scores.</p>
            </div>
            <div>
              <div className="text-2xl mb-2">🔄</div>
              <h3 className="font-bold text-white mb-1">Real-Time Updates</h3>
              <p className="text-sm">Track your application status at every step.</p>
            </div>
            <div>
              <div className="text-2xl mb-2">🔐</div>
              <h3 className="font-bold text-white mb-1">Secure Data</h3>
              <p className="text-sm">Your personal information is encrypted and safe.</p>
            </div>
          </div>
          <Link
            href="/auth/signup"
            className="inline-block px-8 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg hover:bg-gray-100 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            Create Profile & Apply
          </Link>
        </div>
      </section>

      {/* 6. FOR COMPANIES (Footer Pre-amble) */}
      <section className="py-16 bg-gray-900 text-gray-400 text-center border-b border-gray-800">
        <div className="max-w-3xl mx-auto px-6">
          <h3 className="text-white font-bold text-xl mb-4">Are you an Employer?</h3>
          <p className="mb-6">RecruitAI helps companies hire faster with AI-driven assessments.</p>
          <button disabled className="px-6 py-2 border border-gray-700 rounded-lg text-sm bg-gray-800/50 opacity-70 cursor-not-allowed">
            Employer Access (Coming Soon)
          </button>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="py-12 bg-white text-center text-sm text-gray-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-6 opacity-70">
            <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 font-bold text-sm">R</div>
            <span className="font-bold text-gray-700">RecruitAI</span>
          </div>

          <div className="flex gap-8 mb-8">
            <a href="#" className="hover:text-blue-600 transition">Privacy Policy</a>
            <a href="#" className="hover:text-blue-600 transition">Terms of Service</a>
            <a href="#" className="hover:text-blue-600 transition">Contact Support</a>
          </div>

          <p>&copy; {new Date().getFullYear()} RecruitAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

// Sub-components for cleanliness
function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition hover:-translate-y-1 group">
      <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center mb-6 text-3xl group-hover:bg-blue-50 transition">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-500 leading-relaxed text-sm">{desc}</p>
    </div>
  );
}

function Step({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <div className="flex-1 flex flex-col items-center text-center relative z-10 group">
      <div className="w-12 h-12 rounded-full bg-white border-4 border-gray-100 flex items-center justify-center font-bold text-blue-600 mb-4 shadow-sm group-hover:border-blue-100 group-hover:scale-110 transition">
        {number}
      </div>
      <h4 className="font-bold text-gray-900 mb-1">{title}</h4>
      <p className="text-xs text-gray-500 max-w-[150px]">{desc}</p>
    </div>
  );
}

function SecurityPoint({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs font-bold">✓</div>
      <span className="font-medium text-gray-700">{text}</span>
    </div>
  );
}
