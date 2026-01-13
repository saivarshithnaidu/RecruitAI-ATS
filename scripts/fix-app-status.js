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

async function fixApplicationStatus() {
    const interviewId = 'bc92407c-1eee-4840-93fa-896339df776a';
    console.log(`Fixing application status for interview: ${interviewId}`);

    // Get application_id from interview
    const { data: interview } = await supabase
        .from('interviews')
        .select('application_id')
        .eq('id', interviewId)
        .single();

    if (!interview) {
        console.error("Interview not found");
        return;
    }

    console.log(`Found Application ID: ${interview.application_id}`);

    const { error } = await supabase
        .from('applications')
        .update({ status: 'INTERVIEW_SCHEDULED' })
        .eq('id', interview.application_id);

    if (error) {
        console.error("Update Failed:", error);
    } else {
        console.log("Successfully updated application status to 'INTERVIEW_SCHEDULED'.");
    }
}

fixApplicationStatus();
