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

async function checkIdTypes() {
    const interviewId = 'bc92407c-1eee-4840-93fa-896339df776a';
    console.log(`Checking question ID types for: ${interviewId}`);

    const { data: questions, error } = await supabase
        .from('interview_questions')
        .select('*')
        .eq('interview_id', interviewId);

    if (error) console.error("Error:", error);

    if (questions && questions.length > 0) {
        console.log("First Question:");
        console.log(questions[0]);
        console.log("Type of ID:", typeof questions[0].id);
    } else {
        console.log("No questions found (which is unexpected as I fixed them).");
    }
}

checkIdTypes();
