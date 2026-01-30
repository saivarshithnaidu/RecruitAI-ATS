
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
    // 1. Get User ID
    const { data: users } = await supabaseAdmin.from('applications').select('user_id').eq('email', 'cuvar0508@gmail.com');
    if (!users.length) return console.log('User not found');
    const userId = users[0].user_id;

    // 2. Get ANY Interview
    const { data: interviews } = await supabaseAdmin.from('interviews').select('id, status, scheduled_at').eq('candidate_id', userId);

    console.log('JSON_START');
    console.log(JSON.stringify(interviews, null, 2));
    console.log('JSON_END');
}

main();
