
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    console.warn('.env.local not found at', envPath);
}

// Now verify if they are loaded
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Environment variables not loaded even after dotenv config.');
    process.exit(1);
}

// Import supabaseAdmin AFTER setting env vars
// We need to use dynamic import or require to ensure env vars are set before the module evaluates
const { supabaseAdmin } = require('@/lib/supabaseAdmin');

async function checkApplications() {
    console.log('Checking applications...');
    const { data, error, count } = await supabaseAdmin
        .from('applications')
        .select('*', { count: 'exact' });

    if (error) {
        console.error('Error fetching applications:', error);
    } else {
        console.log('Total applications found:', count);
        if (data && data.length > 0) {
            console.log('Last 5 applications:', JSON.stringify(data.slice(0, 5), null, 2));
        } else {
            console.log('No applications in data array.');
        }
    }
}

checkApplications();
