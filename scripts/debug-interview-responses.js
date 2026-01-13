import { createClient } from '@supabase/supabase-js';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

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

async function debugResponses() {
    const interviewId = 'bc92407c-1eee-4840-93fa-896339df776a';
    console.log(`Debugging interview: ${interviewId}`);

    // 1. Fetch Questions
    const { data: questions, error: qError } = await supabase
        .from('interview_questions')
        .select('id, question')
        .eq('interview_id', interviewId);

    if (qError) console.error("Q Error:", qError);
    console.log("\n--- Questions ---");
    console.table(questions);

    // 2. Fetch Responses
    const { data: responses, error: rError } = await supabase
        .from('interview_responses')
        .select('*')
        .eq('interview_id', interviewId);

    if (rError) console.error("R Error:", rError);

    console.log("\n--- Responses ---");
    if (!responses || responses.length === 0) {
        console.log("NO RESPONSES FOUND.");
    } else {
        console.table(responses);
    }
}

debugResponses();
