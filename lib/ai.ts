import OpenAI from "openai";
import mammoth from 'mammoth';
import { extractTextWithHF } from "./pdf-service";

// Initialize OpenAI client with strict API Key validation
const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error("AI configuration error: OPENROUTER_API_KEY is missing. Please set it in .env.local");
}

export const openai = new OpenAI({
  apiKey: apiKey,
  baseURL: "https://openrouter.ai/api/v1",
});

const MODELS = [
  "deepseek/deepseek-chat",
  "mistralai/mistral-7b-instruct",
  "meta-llama/llama-3-8b-instruct"
];

export async function extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    if (mimeType === 'application/pdf') {
      console.log("[ATS] Primary Phase: HF Service Start...");
      
      // 1. Primary: HuggingFace Service (with Health check + Retry)
      const hfText = await extractTextWithHF(buffer);
      if (hfText && hfText.length > 50) return hfText;

      // 2. Fallback: Local Node-based Parser (Zero Failure Layer)
      console.warn("[ATS] HF Service failed. Phase 2: Local pdf-parse fallback start...");
      // @ts-ignore
      const pdfParse = await import('pdf-parse');
      // @ts-ignore
      const data = await pdfParse.default(buffer);
      
      if (!data.text || data.text.length < 10) {
        throw new Error("Fallback parser returned empty text");
      }
      
      console.log("[ATS] Fallback SUCCESS. Data extracted locally.");
      return data.text;

    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer: buffer });
      return result.value;
    }
    return '';
  } catch (error) {
    console.error("Text Extraction Error (All Methods Failed):", error);
    throw new Error("Failed to extract text from resume - Zero Failure Fallback also failed.");
  }
}

// Robust JSON Cleaner
function cleanAndParseJSON(text: string): any {
  let clean = text.replace(/```json\s*|\s*```/g, "").trim();
  clean = clean.replace(/\/\/.*$/gm, "");
  clean = clean.replace(/,(\s*[}\]])/g, '$1');
  return JSON.parse(clean);
}

async function generateWithOpenRouter(prompt: string): Promise<any> {
    const startTime = Date.now();
    for (const model of MODELS) {
        try {
            console.log(`[AI] Attempting generation with model: ${model}`);
            const completion = await openai.chat.completions.create({
                model: model,
                messages: [
                    { role: "system", content: "You are a strict JSON API. Return valid JSON only." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" }
            });
            const content = completion.choices[0].message.content;
            if (!content) throw new Error("Empty response");
            return cleanAndParseJSON(content);
        } catch (error: any) {
            console.warn(`[AI] Model ${model} failed:`, error.message);
        }
    }
    throw new Error("All AI models failed.");
}

export async function generateExamPaper(role: string, skills: string[], difficulty: string): Promise<any> {
    const prompt = `Generate exam questions for ${role}. Skills: ${skills.join(', ')}. Difficulty: ${difficulty}. Output JSON: { "questions": [...] }`;
    return await generateWithOpenRouter(prompt);
}

export async function generateInterviewQuestions(role: string, skills: string[]): Promise<any[]> {
    const prompt = `Generate 5 interview questions for ${role}. Skills: ${skills.join(', ')}. Return JSON: { "questions": [{ "question": "...", "type": "technical"|"behavioral" }] }`;
    try {
        const result = await generateWithOpenRouter(prompt);
        return result.questions || [];
    } catch (e) {
        return [{ question: "Tell me about your experience.", type: "behavioral" }];
    }
}

export async function evaluateInterviewResponses(questions: string[], answers: string[]): Promise<{ score: number, result: string }> {
    const prompt = `Evaluate interview. Questions: ${questions.join(' | ')}. Answers: ${answers.join(' | ')}. Return JSON: { "score": number, "result": "PASSED"|"FAILED" }`;
    try {
        const result = await generateWithOpenRouter(prompt);
        return { score: result.score || 0, result: result.result || 'FAILED' };
    } catch (e) {
        return { score: 0, result: 'PENDING' };
    }
}
