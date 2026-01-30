
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
    const email = 'cuvar0508@gmail.com';
    // 1. Get User
    const { data: apps } = await supabaseAdmin.from('applications').select('user_id').eq('email', email);
    if (!apps.length) return console.log('User not found');
    const userId = apps[0].user_id;

    // 2. Get Interview
    const { data: interviews } = await supabaseAdmin
        .from('interviews')
        .select('*')
        .eq('candidate_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

    if (interviews?.length) {
        console.log(`INTERVIEW_STATUS: ${interviews[0].status}`);
    } else {
        console.log('NO_INTERVIEW');
    }
}

main();
