
import OpenAI from "openai";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

if (!apiKey) {
    console.error("Missing API Key");
    process.exit(1);
}

const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: "https://openrouter.ai/api/v1",
});

const MODELS = [
    "deepseek/deepseek-chat",
    "mistralai/mistral-7b-instruct-v0.2",
    "qwen/qwen-2.5-7b-instruct:free"
];

async function generateWithOpenRouter(prompt) {
    for (const model of MODELS) {
        try {
            console.log(`[Test] Attempting generation with model: ${model}`);
            const completion = await openai.chat.completions.create({
                model: model,
                messages: [
                    { role: "system", content: "You are a helpful JSON API." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" },
                max_tokens: 4096
            });

            const content = completion.choices[0].message.content;
            if (!content) throw new Error("Empty response");

            const parsed = JSON.parse(content);
            console.log(`[Test] SUCCESS with ${model}`);
            return parsed;

        } catch (error) {
            console.warn(`[Test] FAIL ${model}:`, error.message);
        }
    }
    throw new Error("All AI models failed.");
}

async function main() {
    const role = "Frontend Developer";
    const skills = ["React", "TypeScript", "Tailwind"];
    const difficulty = "Intermediate";

    const prompt = `You are a strict technical examiner. Generate a complete 3-section exam for:
Role: ${role}
Skills: ${skills.join(', ')}
Difficulty: ${difficulty}

MANDATORY STRUCTURE:
SECTION 1: Aptitude (10 Questions)
- 7 Quantitative MCQs
- 3 Logical Reasoning MCQs

SECTION 2: Verbal Ability (5 Questions)
- 5 Verbal/Grammar MCQs

SECTION 3: Coding (2 Questions)
- 2 Coding Problems suitable for ${role}
- MUST allow Python, Java, C++, JS solutions.

RETURN JSON ONLY with this exact schema:
{
  "sections": [
    {
      "id": "section_1",
      "title": "Aptitude & Logical",
      "questions": [
        {
          "id": 1,
          "question": "Question text",
          "type": "mcq",
          "options": ["A", "B", "C", "D"],
          "correct_answer": "Option string",
          "marks": 2
        }
      ]
    },
    {
      "id": "section_2",
      "title": "Verbal Ability",
      "questions": []
    },
    {
      "id": "section_3",
      "title": "Coding Challenge",
      "questions": []
    }
  ]
}`;

    try {
        const result = await generateWithOpenRouter(prompt);
        console.log("Final Result Keys:", Object.keys(result));
    } catch (e) {
        console.error("FINAL ERROR:", e.message);
    }
}

main();
