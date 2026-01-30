
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
    console.log(`Debug Page Logic for ${email}...`);

    // 1. Get User ID (simulate session.user.id)
    const { data: users } = await supabaseAdmin.from('applications').select('user_id').eq('email', email);
    if (!users.length) return console.log('User not found');
    const userId = users[0].user_id;
    console.log('User ID:', userId);

    // 2. Exact Query from page.tsx (lines 74-79)
    const query = supabaseAdmin
        .from('interviews')
        .select('*')
        .eq('candidate_id', userId)
        .in('status', ['scheduled', 'in_progress']); // Only active interviews

    // Check raw count first
    const { data: rawData, error: rawError } = await query;
    console.log('Raw Matches Count:', rawData?.length);
    if (rawData) {
        rawData.forEach(r => console.log(`- RAW: id=${r.id} status=${r.status}`));
    }
    if (rawError) console.error('Raw Error:', rawError);

    // Check maybeSingle behavior
    const { data: interview, error } = await supabaseAdmin
        .from('interviews')
        .select('*')
        .eq('candidate_id', userId)
        .in('status', ['scheduled', 'in_progress']) // Only active interviews
        .maybeSingle();

    console.log('page.tsx `maybeSingle` Result:', {
        data: interview ? { id: interview.id, status: interview.status } : null,
        error: error
    });

}

main();
