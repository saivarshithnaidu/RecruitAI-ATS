import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from .env.local strictly
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    console.log('URL:', supabaseUrl ? 'Found' : 'Missing');
    console.log('Key:', supabaseServiceKey ? 'Found' : 'Missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectInterview() {
    // ID from the admin screenshot (URL params)
    const interviewId = '93b0c50a-342d-426e-b77b-a30eb227ba8a';

    console.log(`Inspecting Interview: ${interviewId}`);

    const { data: interview, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('id', interviewId)
        .single();

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log("Interview Record:", interview);

    if (interview.application_id) {
        const { data: app } = await supabase
            .from('applications')
            .select('*')
            .eq('id', interview.application_id)
            .single();
        console.log("Linked Application:", app);
    } else {
        console.error("!!! WARNING: No application_id linked to this interview !!!");
    }
}

inspectInterview();
