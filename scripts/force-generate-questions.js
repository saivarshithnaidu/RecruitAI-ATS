import { createClient } from '@supabase/supabase-js';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
// import { generateInterviewQuestions } from '../lib/ai.js'; // Removed

// Since we can't easily import TS lib in checking script without ts-node, 
// I'll just write the insertion logic directly here using the same fallback logic I just fixed.
// Or I can use the existing 'fix-missing-questions.js' logic but updated.

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

async function forceGenerate() {
    const interviewId = '4fb14621-9430-4a3d-9ec0-dd0b7123b162'; // New User Interview ID from screenshot
    console.log(`Force generating questions for: ${interviewId}`);

    // Fallback/Default Questions (guaranteed to work)
    const questions = [
        { question: "Describe your experience with React state management.", type: "technical", expected_keywords: ["redux", "context", "state"] },
        { question: "How do you optimize a Next.js application for performance?", type: "technical", expected_keywords: ["static", "server-side", "image"] },
        { question: "Explain the difference between SQL and NoSQL databases.", type: "technical", expected_keywords: ["relational", "document", "schema"] },
        { question: "Tell me about a time you resolved a conflict in a team.", type: "behavioral", expected_keywords: ["communication", "resolution"] },
        { question: "What is your approach to testing your code?", type: "technical", expected_keywords: ["unit", "integration", "jest"] }
    ];

    const payload = questions.map(q => ({
        interview_id: interviewId,
        question: q.question,
        type: q.type,
        expected_keywords: q.expected_keywords,
        marks: 10
    }));

    const { error } = await supabase
        .from('interview_questions')
        .insert(payload);

    if (error) {
        console.error("Force Insert Validation Failed:", error);
    } else {
        console.log("SUCCESS: Default questions inserted manually.");
    }
}

forceGenerate();
