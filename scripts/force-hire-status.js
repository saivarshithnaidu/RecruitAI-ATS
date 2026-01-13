
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function forceHire() {
    const interviewId = '93b0c50a-342d-426e-b77b-a30eb227ba8a';
    console.log(`Force Hiring for Interview: ${interviewId}`);

    // Get App ID
    const { data: interview } = await supabase
        .from('interviews')
        .select('application_id')
        .eq('id', interviewId)
        .single();

    if (!interview || !interview.application_id) {
        console.error("Interview or App ID not found");
        return;
    }

    // Force Update
    const { error } = await supabase
        .from('applications')
        .update({ status: 'HIRED' })
        .eq('id', interview.application_id);

    if (error) console.error("Error:", error);
    else console.log("SUCCESS: Application forced to HIRED status.");
}

forceHire();
