
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local or .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
    const email = 'cuvar0508@gmail.com';
    console.log(`Checking for ${email}...`);

    const { data: apps, error: appError } = await supabaseAdmin
        .from('applications')
        .select('id, status, user_id')
        .eq('email', email);

    if (appError) return console.error(appError);
    if (!apps.length) return console.log('No App');

    const app = apps[0];
    console.log(`APPLICATION: ID=${app.id} STATUS=${app.status} USER=${app.user_id}`);

    const { data: interviews, error: intError } = await supabaseAdmin
        .from('interviews')
        .select('id, status, scheduled_at')
        .eq('candidate_id', app.user_id);

    if (intError) return console.error(intError);

    console.log('INTERVIEWSFOUND:', interviews.length);
    interviews.forEach(i => {
        console.log(`- ID=${i.id} STATUS=${i.status} DATE=${i.scheduled_at}`);
    });
}

main();
