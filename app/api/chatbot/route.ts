import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { openai } from "@/lib/ai";

/**
 * RecruitAI Chatbot Assistant API
 * POST /api/chatbot
 * 
 * Context-aware AI responses for candidates.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { message, history = [] } = await req.json();

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        // 1. Fetch Candidate Context
        const userId = session.user.id;
        
        // Parallel fetch for speed
        const [profileRes, appRes, examRes] = await Promise.all([
            supabaseAdmin.from('candidate_profiles').select('*').eq('user_id', userId).single(),
            supabaseAdmin.from('applications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).single(),
            supabaseAdmin.from('exam_assignments').select('*, exams(title)').eq('candidate_id', userId).order('created_at', { ascending: false }).limit(1).single()
        ]);

        const profile = profileRes.data;
        const application = appRes.data;
        const exam = examRes.data;

        // 2. Build Context String
        const context = `
YOU ARE RECRUITAI ASSISTANT. Help the candidate with their recruitment journey.
CANDIDATE INFO:
- Name: ${profile?.full_name || session.user.name || "Candidate"}
- Email: ${session.user.email}

APPLICATION STATE:
- Status: ${application?.status || "NOT_APPLIED"}
- ATS Score: ${application?.ats_score || 0} (${getAtsCategory(application?.ats_score)})
- Role Applied: ${application?.role || "N/A"}

EXAM STATE:
- Exam Assigned: ${exam ? 'YES' : 'NO'}
- Exam Title: ${exam?.exams?.title || "N/A"}
- Exam Status: ${exam?.status || "N/A"}
- Scheduled Time: ${exam?.scheduled_start_time ? new Date(exam.scheduled_start_time).toLocaleString() : "Not Scheduled"}

GUIDELINES:
- ATS explanation: >70 = Qualified/Elite, 50-70 = Borderline Review, <50 = Not Shortlisted.
- SEB Instructions: To take exams, candidates MUST download the .seb file from their dashboard and install Safe Exam Browser.
- System Access: Candidates cannot enter exams from normal browsers like Chrome.
- Troubleshooting: If they miss a slot, guide them to contact HR or check for rescheduling options in the dashboard.
- Hallucination Check: If asked about salary, company policies, or personal data NOT in context, politely say you don't have that info and they should contact support@recruitaitech.in.
- Style: Professional, empathetic, and concise. Use bullet points for steps.
        `;

        // 3. Call AI
        const completion = await openai.chat.completions.create({
            model: "deepseek/deepseek-chat", // Default high perf model from ai.ts list
            messages: [
                { role: "system", content: context },
                ...history.slice(-5), // Last 5 messages for context
                { role: "user", content: message }
            ],
            max_tokens: 500,
            temperature: 0.7
        });

        const aiResponse = completion.choices[0].message.content;

        return NextResponse.json({ response: aiResponse });

    } catch (e: any) {
        console.error("Chatbot Error:", e);
        return NextResponse.json({ 
            response: "I'm experiencing a temporary connection issue. Please contact support@recruitaitech.in for immediate assistance." 
        }, { status: 500 });
    }
}

function getAtsCategory(score: number = 0) {
    if (score >= 70) return "Qualified / Elite Profile";
    if (score >= 50) return "Borderline Review Needed";
    return "Initial Screening Not Met";
}
