
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) process.exit(1);

const sb = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
    const email = 'recruitaiceo@company.com';
    console.log(`VERIFYING DELETION FOR: ${email}`);

    const { data: { users }, error: listError } = await sb.auth.admin.listUsers();

    if (listError) { console.error(listError); return; }

    const user = users.find(u => u.email === email);

    if (user) {
        console.log(`❌ USER STILL EXISTS! ID: ${user.id}`);

        // Try deleting again
        const { error: delErr } = await sb.auth.admin.deleteUser(user.id);
        if (delErr) console.log(`FAILED TO DELETE: ${delErr.message}`);
        else console.log("✅ DELETED NOW.");
    } else {
        console.log("✅ USER IS GONE. READY FOR SIGNUP.");
    }

    // Check profile
    const { data: profiles } = await sb.from('profiles').select('*').eq('email', email);
    if (profiles && profiles.length > 0) {
        console.log(`❌ PROFILE STILL EXISTS! Deleting...`);
        await sb.from('profiles').delete().eq('email', email);
        console.log("✅ PROFILE DELETED.");
    } else {
        console.log("✅ PROFILE IS GONE.");
    }
}

main();
