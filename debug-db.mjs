import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error("Missing keys");
    process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
    console.log("Checking tables...");
    const { count: cands, error: e1 } = await supabase.from('candidates').select('*', { count: 'exact', head: true });
    const { count: apps, error: e2 } = await supabase.from('applications').select('*', { count: 'exact', head: true });

    console.log("Candidates Table Count:", cands);
    if (e1) console.log("Candidates Error:", e1.message);

    console.log("Applications Table Count:", apps);
    if (e2) console.log("Applications Error:", e2.message);

    // Check one row from candidates to see structure
    if (cands > 0) {
        const { data } = await supabase.from('candidates').select('*').limit(1);
        console.log("Sample Candidate:", data?.[0]);
    }
}
run();
