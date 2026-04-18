import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { openai } from "@/lib/ai";
import { retrieveContext } from "@/lib/rag";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    try {
        const { prompt, role, difficulty, count, type } = await req.json();

        if (!prompt) {
            return NextResponse.json({ success: false, message: "Prompt is required" }, { status: 400 });
        }

        // 1. RAG: Retrieve context from company documents based on prompt
        const contextChunks = await retrieveContext(prompt, 5);
        const contextText = contextChunks.map((c: any) => c.content).join("\n---\n");

        // 2. Prepare AI Prompt
        const aiPrompt = `
            You are an expert ${role} interviewer and examiner. 
            Generate ${count || 5} ${type || 'mixed'} questions for a ${difficulty || 'medium'} level exam.
            
            REFERENCE CONTEXT FROM COMPANY DOCUMENTS:
            ${contextText || "No relevant document context found. Use general knowledge for the specified role."}
            
            USER SPECIFIC INSTRUCTIONS:
            "${prompt}"
            
            STRICT JSON OUTPUT FORMAT:
            {
              "questions": [
                {
                  "question": "Question text here",
                  "type": "mcq" | "coding" | "theory",
                  "options": ["A", "B", "C", "D"], // Only for mcq
                  "correct_answer": "Option value or correct logic",
                  "source_context": "Short snippet from provided context as reference",
                  "marks": number
                }
              ]
            }
        `;

        // 3. Call Gemini (via OpenRouter)
        const completion = await openai.chat.completions.create({
            model: "google/gemini-2.0-flash-001",
            messages: [
                { role: "system", content: "You are a professional exam generator. Output JSON only." },
                { role: "user", content: aiPrompt }
            ],
            response_format: { type: "json_object" }
        });

        const content = completion.choices[0].message.content;
        if (!content) throw new Error("Empty AI response");

        // Use standard cleaner to ensure valid JSON
        const result = JSON.parse(content.replace(/```json\s*|\s*```/g, "").trim());

        return NextResponse.json({ 
            success: true, 
            questions: result.questions,
            trace: contextChunks.map((c: any) => ({ doc_name: c.metadata?.source, snippet: c.content.slice(0, 100) + "..." }))
        });

    } catch (error: any) {
        console.error("[AI-Generator-API] Error:", error.message);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
