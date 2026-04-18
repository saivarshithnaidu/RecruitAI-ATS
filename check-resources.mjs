import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function check() {
    console.log('--- Checking Buckets ---');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) console.error('Buckets error:', bucketsError);
    else console.log('Existing buckets:', buckets.map(b => b.name));

    console.log('\n--- Checking Tables ---');
    const tables = ['exams', 'exam_questions', 'company_documents'];
    for (const table of tables) {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error) console.log(`Table '${table}' error:`, error.message);
        else console.log(`Table '${table}' exists.`);
    }
}

check();
