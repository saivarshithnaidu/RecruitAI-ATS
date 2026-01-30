
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
    console.log(`Fixing Duplicates for ${email}...`);

    // 1. Get User ID
    const { data: users } = await supabaseAdmin.from('applications').select('user_id').eq('email', email);
    if (!users.length) return console.log('User not found');
    const userId = users[0].user_id;

    // 2. Find ALL Active Interviews
    const { data: interviews } = await supabaseAdmin
        .from('interviews')
        .select('*')
        .eq('candidate_id', userId)
        .in('status', ['scheduled', 'in_progress'])
        .order('created_at', { ascending: false }); // Newest first

    if (!interviews || interviews.length <= 1) {
        return console.log('No duplicates found or only 1 interview exists. Usage OK.');
    }

    console.log(`Found ${interviews.length} active interviews. Keeping the newest one.`);

    const [latest, ...duplicates] = interviews;
    console.log(`Keeping: ID=${latest.id} CreatedAt=${latest.created_at}`);

    // 3. Expire duplicates
    for (const dup of duplicates) {
        console.log(`Expiring duplicate: ID=${dup.id} CreatedAt=${dup.created_at}`);
        await supabaseAdmin
            .from('interviews')
            .update({ status: 'expired' })
            .eq('id', dup.id);
    }

    console.log('Done resolving duplicates.');
}

main();
