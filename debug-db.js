const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const envPath = path.resolve(__dirname, '.env.local');
dotenv.config({ path: envPath });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("URL:", url ? "Found" : "Missing");
console.log("KEY:", key ? "Found" : "Missing");

if (!url || !key) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
    try {
        console.log("Checking 'applications' table...");
        const { count: apps, error: err1 } = await supabase.from('applications').select('*', { count: 'exact', head: true });
        if (err1) console.error("Error accessing applications:", err1.message);
        else console.log('Applications Count:', apps);

        console.log("Checking 'candidates' table...");
        const { count: cands, error: err2 } = await supabase.from('candidates').select('*', { count: 'exact', head: true });
        if (err2) console.error("Error accessing candidates:", err2.message);
        else console.log('Candidates Count:', cands);

    } catch (e) {
        console.error("Unexpected error:", e);
    }
}

run();
