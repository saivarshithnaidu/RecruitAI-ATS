
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
    console.log(`Force Resolving Duplicates for ${email}...`);

    const { data: users } = await supabaseAdmin.from('applications').select('user_id').eq('email', email);
    if (!users.length) return console.log('User not found');
    const userId = users[0].user_id;

    // Get ALL interviews
    const { data: interviews } = await supabaseAdmin
        .from('interviews')
        .select('*')
        .eq('candidate_id', userId)
        .order('created_at', { ascending: false });

    if (!interviews.length) return console.log('No interviews found.');

    const [latest, ...others] = interviews;
    console.log(`KEEPING Latest: ID=${latest.id} (Status: ${latest.status}) Created=${latest.created_at}`);

    // Update Latest to SCHEDULED just in case
    const { error: upError } = await supabaseAdmin.from('interviews').update({ status: 'scheduled' }).eq('id', latest.id);
    if (upError) console.error('Latest Update Error:', upError);
    else console.log('Updated Latest to SCHEDULED.');

    // Cancel ALL others
    for (const other of others) {
        console.log(`Cancelling: ID=${other.id} (Old Status: ${other.status})`);
        const { error: dupError } = await supabaseAdmin.from('interviews').update({ status: 'cancelled' }).eq('id', other.id);
        if (dupError) console.error('Duplicate Cancel Error:', dupError);
    }

    console.log('DONE.');
}

main();
