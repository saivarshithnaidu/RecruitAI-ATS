
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
    console.log(`Fixing for ${email}...`);

    // 1. Get User
    const { data: apps } = await supabaseAdmin.from('applications').select('user_id').eq('email', email);
    if (!apps.length) return console.log('User not found');
    const userId = apps[0].user_id;

    // 2. Get Latest Interview (including expired ones)
    const { data: interviews } = await supabaseAdmin
        .from('interviews')
        .select('*')
        .eq('candidate_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

    if (!interviews || !interviews.length) return console.log('No interview found to fix.');

    const interview = interviews[0];
    console.log('Found Interview:', { id: interview.id, status: interview.status, time: interview.scheduled_at });

    // 3. Force Update to SCHEDULED
    const { error: updateError } = await supabaseAdmin
        .from('interviews')
        .update({ status: 'scheduled' })
        .eq('id', interview.id);

    if (updateError) console.error('Update Failed:', updateError);
    else console.log('Interview status updated to SCHEDULED');

    // 4. Update Application Status just in case
    const { error: appUpdateError } = await supabaseAdmin
        .from('applications')
        .update({ status: 'INTERVIEW_SCHEDULED' })
        .eq('user_id', userId);

    if (appUpdateError) console.error('App Update Failed:', appUpdateError);
    else console.log('Application status set to INTERVIEW_SCHEDULED');
}

main();
