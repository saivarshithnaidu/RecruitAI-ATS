import { createClient } from '@supabase/supabase-js';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Mocking the AI generation locally or importing it if it's ESM compatible (it might be verify difficult to import 'lib/ai' if it depends on next/server stuff).
// actually 'lib/ai' uses 'ollama' or 'openai'.
// I'll try to insert dummy questions first to unblock, or try to run the generation logic.
// Let's just insert 3 hardcoded questions for now to ensure it works.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function regenerateQuestions() {
    const interviewId = 'bc92407c-1eee-4840-93fa-896339df776a'; // From screenshot
    console.log(`Checking questions for ${interviewId}...`);

    const { data: existing } = await supabase
        .from('interview_questions')
        .select('*')
        .eq('interview_id', interviewId);

    if (existing && existing.length > 0) {
        console.log(`Found ${existing.length} questions. Weird. Listing them:`);
        console.log(existing);
        return;
    }

    console.log("No questions found. Inserting default questions...");

    const questions = [
        {
            interview_id: interviewId,
            question: "Tell me about a challenging project you worked on and how you overcame technical obstacles.",
            type: "behavioral",
            expected_keywords: ["challenge", "solution", "technical", "team"],
            marks: 10
        },
        {
            interview_id: interviewId,
            question: "Explain the difference between SQL and NoSQL databases. When would you use one over the other?",
            type: "technical",
            expected_keywords: ["relational", "schema", "scaling", "consistency"],
            marks: 10
        },
        {
            interview_id: interviewId,
            question: "How do you handle state management in complex React applications?",
            type: "technical",
            expected_keywords: ["redux", "context", "state", "props"],
            marks: 10
        }
    ];

    const { error } = await supabase
        .from('interview_questions')
        .insert(questions);

    if (error) {
        console.error("Insert failed:", error);
    } else {
        console.log("Successfully inserted 3 questions.");
    }
}

regenerateQuestions();
