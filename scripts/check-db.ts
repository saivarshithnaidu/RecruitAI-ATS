
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local or .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function checkDb() {
    const { count: appCount, error: appError } = await supabaseAdmin
        .from('applications')
        .select('*', { count: 'exact', head: true });

    if (appError) console.error('App Error:', appError);
    else console.log('APPLICATION COUNT:', appCount);

    const { data: apps } = await supabaseAdmin
        .from('applications')
        .select('*, profiles(*)')
        .limit(2);

    console.log('Sample Data:', JSON.stringify(apps, null, 2));
}

checkDb();
