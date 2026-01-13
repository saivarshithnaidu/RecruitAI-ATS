
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
    console.log(`FINAL DELETION for: ${email}...`);

    // 1. Find and Delete Auth User
    const { data: { users }, error: listError } = await sb.auth.admin.listUsers();

    if (listError) {
        console.error("Error listing users:", listError.message);
        return;
    }

    const user = users.find(u => u.email === email);

    if (user) {
        console.log(`Deleting Auth User ${user.id}...`);
        const { error: deleteError } = await sb.auth.admin.deleteUser(user.id);

        if (deleteError) console.error("Error deleting auth user:", deleteError.message);
        else console.log("✅ Auth User deleted.");
    } else {
        console.log("Auth User not found.");
    }

    // 2. Delete from Profiles (Cleanup)
    try {
        const { error: profileError } = await sb
            .from('profiles')
            .delete()
            .eq('email', email);

        if (profileError) console.log("Profile delete error (ignore if already gone):", profileError.message);
        else console.log("✅ Profile data cleaned up.");
    } catch (e) {
        // failed silently
    }
}

main();
