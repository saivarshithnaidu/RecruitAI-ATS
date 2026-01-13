
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

async function debugCandidate() {
    const email = 'cuvar0508@gmail.com';

    // 1. Get User ID
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email);

    console.log("Profiles:", profiles);
    if (!profiles || profiles.length === 0) return;
    const userId = profiles[0].id;

    // 2. Get All Applications
    const { data: apps } = await supabase
        .from('applications')
        .select('id, status, created_at, email')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    let output = '';
    output += `User ID: ${userId}\n\n`;

    output += "ALL APPLICATIONS (Ordered by Newest First):\n";
    apps.forEach((app, i) => {
        output += `[${i}] ID: ${app.id} | Status: ${app.status} | Created: ${app.created_at}\n`;
    });

    // 3. Get Interviews
    const { data: interviews } = await supabase
        .from('interviews')
        .select('id, status, application_id, scheduled_at')
        .eq('candidate_id', userId);

    output += "\nINTERVIEWS:\n";
    interviews.forEach(int => {
        output += `ID: ${int.id} | Status: ${int.status} | Linked App ID: ${int.application_id}\n`;
    });

    console.log(output);
    const fs = await import('fs');
    fs.writeFileSync('scripts/debug-stats.txt', output);
}

debugCandidate();
