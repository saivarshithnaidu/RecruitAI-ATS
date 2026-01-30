
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
    const { data: users } = await supabaseAdmin.from('applications').select('user_id').eq('email', email);
    const userId = users[0].user_id;

    const { data: interviews } = await supabaseAdmin
        .from('interviews')
        .select('id, status, created_at, scheduled_at')
        .eq('candidate_id', userId)
        .in('status', ['scheduled', 'in_progress'])
        .order('created_at', { ascending: false });

    console.log(`ACTIVE INTERVIEWS (${interviews.length}):`);
    interviews.forEach(i => console.log(`ID=${i.id} STATUS=${i.status} CREATED=${i.created_at}`));
}

main();
