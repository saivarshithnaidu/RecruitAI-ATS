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

async function checkSchema() {
    console.log("Checking schema for 'interview_responses'...");

    // We can query information_schema.columns through the standard client if we have select permissions?
    // Often limited. But let's try.
    // If not, we'll try to insert a dummy UUID into question_id and catch the error message.

    try {
        const { error } = await supabase
            .from('interview_responses')
            .insert({
                interview_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
                question_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
                candidate_id: '00000000-0000-0000-0000-000000000000',
                transcribed_answer: 'Test',
                score: 0
            });

        if (error) {
            console.log("Insert Attempt Error:", error.message);
            console.log("Details:", error.details);
            console.log("Hint:", error.hint);
            // If error says "invalid input syntax for type bigint", we found the smoking gun.
        } else {
            console.log("Insert with UUIDs succeeded (unexpected for dummy data, but means schema is compatible).");
            // Clean up if it actually worked (unlikely due to FK constraints)
        }
    } catch (e) {
        console.error("Exception:", e);
    }
}

checkSchema();
