import OpenAI from "openai";
import mammoth from 'mammoth';

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
      // @ts-ignore
      const pdfParse = await import('pdf-parse');
      // @ts-ignore
      const data = await pdfParse.default(buffer);
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
    console.error("Text Extraction Error:", error);
    throw new Error("Failed to extract text from resume");
  }
}

// ... Unchanged ATS/Interview functions would go here if they existed in this file, 
// but based on previous read, this file mostly contained the AI logic which we are replacing.
// If there were other exports like `generateScore`, they should be preserved.
// checking previous content... `generateScore` wasn't shown in the view, but `generateMCQs` etc were.
// Wait, the previous file had "skipping unchanged ATS / Interview functions" comment at line 32.
// I must ensure I don't delete them if they exist. 
// However, the `view_file` output previously showed lines 1-155 and I didn't see `generateScore` logic explicitly, 
// likely it was represented by the comment `// ... (skipping unchanged ATS / Interview functions) ...` 
// which suggests the tool might have truncated or I missed it.
// Actually, looking at the previous view_file output (Step 15), line 32 was a comment literally written in the code or by the tool?
// "32: // ... (skipping unchanged ATS / Interview functions) ..."
// No, wait, if the tool returned that, it means the file literally contains that comment?
// StartLine 1 to 155.
// Let me re-read carefully.
// Ah, the file content I saw in Step 15 lines 1-32:
// 1-30 are imports and extractTextFromBuffer.
// 32 says `// ... (skipping unchanged ATS / Interview functions) ...`. 
// This implies the file I read ALREADY had that comment and missing code? 
// OR the tool output truncated it? The tool said "Showing lines 1 to 155" and "Total Lines: 155". 
// It seems the previous agent might have written that comment as a placeholder? 
// Or the user's codebase literally has that comment.
// Use `view_file` again to be absolutely sure before I overwrite potentially hidden code?
// No, if "Total Lines: 155" matches the number of lines shown, then that IS the file content.
// So I will proceed with replacing the AI part. I'll keep the `extractTextFromBuffer` and replace the rest.

// Robust JSON Cleaner
function cleanAndParseJSON(text: string): any {
  // 1. Remove markdown code blocks (```json ... ```)
  let clean = text.replace(/```json\s*|\s*```/g, "").trim();
  // 2. Remove comments (// ...) - Basic heuristic
  clean = clean.replace(/\/\/.*$/gm, "");
  // 3. Remove trailing commas (e.g. "a": 1, } -> "a": 1 })
  clean = clean.replace(/,(\s*[}\]])/g, '$1');

  return JSON.parse(clean);
}

async function generateWithOpenRouter(prompt: string): Promise<any> {
  const maxTotalTime = 300000; // 5 mins total hard stop
  const startTime = Date.now();

  for (const model of MODELS) {
    if (Date.now() - startTime > maxTotalTime) break;

    try {
      console.log(`[AI] Attempting generation with model: ${model}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s per request

      try {
        const completion = await openai.chat.completions.create({
          model: model,
          messages: [
            { role: "system", content: "You are a strict JSON API. Return valid JSON only. No markdown. No comments. Keep questions concise." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          max_tokens: 4096
        }, { signal: controller.signal });

        clearTimeout(timeoutId);

        const content = completion.choices[0].message.content;
        if (!content) throw new Error("Empty response from AI provider");

        try {
          const parsed = cleanAndParseJSON(content);
          console.log(`[AI] Success with model: ${model}`);
          return parsed;
        } catch (parseError) {
          console.warn(`[AI] JSON Parse Error for ${model}:`, content.substring(0, 100) + "...");
          throw new Error("Invalid JSON received");
        }

      } catch (reqError: any) {
        clearTimeout(timeoutId);
        throw reqError;
      }

    } catch (error: any) {
      console.warn(`[AI] Model ${model} failed:`, error.message || error);
      // Continue to next model
    }
  }
  throw new Error(`All AI models failed. Please try again later or check API credits.`);
}

async function generateSection(
  sectionId: string,
  title: string,
  details: string,
  count: number,
  role: string,
  skills: string[],
  difficulty: string
): Promise<any> {
  const prompt = `Generate ${count} ${title} questions for a ${difficulty} level exam.
Role: ${role}
Skills: ${skills.join(', ')}
Details: ${details}

STRICT JSON ONLY. No markdown. No comments.
Schema:
{
  "questions": [
    {
      "id": number,
      "question": "text",
      "type": "${sectionId === 'section_4' ? 'coding' : 'mcq'}",
      ${sectionId === 'section_4' ? `
      "input_format": "...",
      "output_format": "...",
      "constraints": "...",
      "test_cases": [{"input": "...", "output": "..."}],
      ` : `"options": ["A", "B", "C", "D"], "correct_answer": "Option string",`}
      "marks": ${sectionId === 'section_4' ? 20 : 1}
    }
  ]
}`;

  try {
    const result = await generateWithOpenRouter(prompt);
    return {
      id: sectionId,
      title: title,
      questions: result.questions || []
    };
  } catch (e) {
    console.error(`Failed to generate section ${sectionId}`, e);
    // Return empty section as fallback to prevent total failure
    return { id: sectionId, title: title, questions: [] };
  }
}

export async function generateExamPaper(role: string, skills: string[], difficulty: string): Promise<any> {
  console.log(`[AI] Starting Parallel Exam Generation for ${role}...`);

  try {
    const results = await Promise.all([
      generateSection('section_1', 'Aptitude & Logical Reasoning', '10 Quantitative (Math/Data), 10 Logical Reasoning (Patterns/Puzzles)', 20, role, skills, difficulty),
      generateSection('section_2', 'Verbal Ability', '10 Verbal/Grammar MCQs (English comprehension)', 10, role, skills, difficulty),
      generateSection('section_3', 'Technical', `20 Technical MCQs based on: ${skills.join(', ')}`, 20, role, skills, difficulty),
      generateSection('section_4', 'Coding', '1 Coding Problem (Algorithms/DS)', 1, role, skills, difficulty)
    ]);

    // Validate
    const totalQs = results.reduce((acc, sec) => acc + sec.questions.length, 0);
    if (totalQs < 10) {
      throw new Error("AI generated too few questions. Please retry.");
    }

    return results;

  } catch (error) {
    console.error("Exam Generation Final Failure:", error);
    throw error;
  }
}

// Phase 3: AI Interviewer

export async function generateInterviewQuestions(role: string, skills: string[]): Promise<any[]> {
  const prompt = `You are a strict technical interviewer.
Generate 5 interview questions for:
Role: ${role}
Skills: ${skills.join(', ')}

Mix of Technical (conceptual/coding) and Behavioral.

Return JSON ONLY with this schema:
{
  "questions": [
    {
      "question": "Question text here?",
      "type": "technical" | "behavioral",
      "expected_keywords": ["keyword1", "keyword2"]
    }
  ]
}`;

  try {
    const result = await generateWithOpenRouter(prompt);
    return result.questions || [];
  } catch (error) {
    console.error("Interview Question Generation Failed:", error);
    return [
      { question: "Describe your experience with the tech stack mentioned in your resume.", type: "behavioral", expected_keywords: ["experience", "projects"] },
      { question: "How do you handle debugging complex issues?", type: "technical", expected_keywords: ["debugging", "tools", "process"] },
      { question: "Explain a challenging project you worked on recently.", type: "behavioral", expected_keywords: ["challenge", "solution"] },
      { question: "What are your strengths and weaknesses?", type: "behavioral", expected_keywords: ["strengths", "weaknesses"] },
      { question: "Why do you want to join this company?", type: "behavioral", expected_keywords: ["motivation", "culture"] }
    ];
  }
}

export async function evaluateInterviewResponses(questions: string[], answers: string[]): Promise<{ score: number, result: string }> {
  const qaPairs = questions.map((q, i) => `Q: ${q}\nA: ${answers[i] || "No answer"}`).join('\n\n');

  const prompt = `You are a technical hiring manager. Evaluate the following interview candidate.
    
${qaPairs}

Rate the candidate on a scale of 0 to 100 based on technical depth, clarity, and correctness.
Pass Mark is 70.

Return JSON ONLY:
{
  "score": number,
  "result": "PASSED" | "FAILED",
  "reason": "short summary"
}`;

  try {
    const result = await generateWithOpenRouter(prompt);
    return {
      score: result.score || 0,
      result: result.result || 'FAILED'
    };
  } catch (error) {
    console.error("Interview Evaluation Failed:", error);
    return { score: 0, result: 'PENDING' }; // Manual review fallback
  }
}

