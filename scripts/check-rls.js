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

async function checkRLS() {
    console.log("Checking RLS policies...");

    const { data, error } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'interview_responses');

    if (error) {
        console.error("Error fetching policies:", error);
        return;
    }

    if (data.length === 0) {
        console.log("NO RLS POLICIES FOUND for 'interview_responses'. If RLS is enabled, inserts might fail for non-service roles.");
    } else {
        console.table(data);
    }

    // Check if RLS is enabled on the table
    const { data: tableInfo, error: tableError } = await supabase
        .rpc('check_rls_enabled', { table_name: 'interview_responses' });

    // Standard RPC might not exist, let's try a direct query if possible, or just infer.
    // Actually, I can't easily check 'pg_class' via client if I don't have direct SQL access or RPC.
    // But usually Supabase enables RLS by default.
}

checkRLS();
