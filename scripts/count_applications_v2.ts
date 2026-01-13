
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load env explicitly
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Env Vars in script:", { supabaseUrl, hasKey: !!supabaseKey });
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function countApps() {
    console.log("Counting applications (Direct)...");
    const { count, data, error } = await supabaseAdmin
        .from('applications')
        .select('*', { count: 'exact' });

    if (error) {
        fs.writeFileSync('debug_apps.txt', `Error: ${JSON.stringify(error)}`);
        return;
    }

    let output = `Total: ${count}\n`;
    if (data) {
        data.forEach(a => {
            output += `ID: ${a.id} | Email: ${a.email} | Status: ${a.status} | CreatedAt: ${a.created_at}\n`;
        });
    }
    fs.writeFileSync('debug_apps.txt', output);
    console.log("Written to debug_apps.txt");
}

countApps();
