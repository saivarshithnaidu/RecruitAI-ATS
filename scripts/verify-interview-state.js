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

async function verifyState() {
    const interviewId = 'bc92407c-1eee-4840-93fa-896339df776a';
    console.log(`Verifying interview: ${interviewId}`);

    const { data: interview, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('id', interviewId)
        .single();

    if (error) {
        console.error("Error fetching interview:", error);
        return;
    }

    console.log("Interview Record:");
    console.log(interview);

    console.log(`Candidate ID: ${interview.candidate_id}`);
    console.log(`Status: ${interview.status}`);

    // Check Application
    const { data: app, error: appError } = await supabase
        .from('applications')
        .select('*')
        .eq('id', interview.application_id)
        .single();

    if (appError) {
        console.error("App fetch error:", appError);
    } else {
        console.log("Application Record:");
        console.log(`ID: ${app.id}`);
        console.log(`Status: ${app.status}`);
        console.log(`User ID: ${app.user_id}`);
    }

    if (app.user_id !== interview.candidate_id) {
        console.error("MISMATCH: App User ID vs Interview Candidate ID");
    } else {
        console.log("MATCH: Candidate IDs match.");
    }
}

verifyState();
