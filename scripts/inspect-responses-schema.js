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

async function inspectSchema() {
    console.log("Fetching columns for 'interview_responses'...");

    // We can't access information_schema via standard client directly usually due to permissions,
    // BUT we can try RPC if available, or just error inference. 
    // However, the error message "Could not find the 'transcribed_answer' column" is pretty explicit.
    // Let's try to deduce the column by checking if 'answer' or 'transcript' exists by trying a select?

    // Actually, sometimes we can read metadata if we are service role.
    // Let's try to just select * from interview_responses limit 1 and see the keys.

    const { data, error } = await supabase
        .from('interview_responses')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Select Error:", error);
    } else {
        if (data && data.length > 0) {
            console.log("Existing Row Keys:", Object.keys(data[0]));
        } else {
            console.log("Table is empty, cannot infer keys from rows.");

            // Fallback: Try to insert with a different probable key and see if it works.
            console.log("Trying insertion with 'answer' column...");
            const { error: insertError } = await supabase
                .from('interview_responses')
                .insert({
                    interview_id: 'd123f098-21af-45b7-b438-b09e210405f5', // Valid ID from user logs
                    question_id: '7c71de67-99a5-4b4a-b998-e734a6413ee2', // Valid ID from logs
                    answer: 'Test Answer',
                    score: 0
                });

            if (insertError) {
                console.log("Insert 'answer' failed:", insertError.message);

                console.log("Trying insertion with 'transcript' column...");
                const { error: insertError2 } = await supabase
                    .from('interview_responses')
                    .insert({
                        interview_id: 'd123f098-21af-45b7-b438-b09e210405f5',
                        question_id: '7c71de67-99a5-4b4a-b998-e734a6413ee2',
                        transcript: 'Test Answer',
                        score: 0
                    });

                if (insertError2) {
                    console.log("Insert 'transcript' failed:", insertError2.message);
                } else {
                    console.log("SUCCESS! Column name is 'transcript'");
                }
            } else {
                console.log("SUCCESS! Column name is 'answer'");
            }
        }
    }
}

inspectSchema();
