
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
    console.log(`Resetting user: ${email}...`);

    // 1. Find User by Email
    const { data: { users }, error: listError } = await sb.auth.admin.listUsers();

    if (listError) {
        console.error("Error listing users:", listError.message);
        return;
    }

    const user = users.find(u => u.email === email);

    if (user) {
        console.log(`Found Auth User ${user.id}. Deleting...`);
        const { error: deleteError } = await sb.auth.admin.deleteUser(user.id);

        if (deleteError) {
            console.error("Error deleting auth user:", deleteError.message);
        } else {
            console.log("✅ Auth User deleted.");
        }
    } else {
        console.log("Auth User not found (might already be deleted).");
    }

    // 2. Delete from Profiles (in case of no cascade or orphaned row)
    // Note: If you don't use 'profiles' or if it cascades, this might be redundant but safe.
    // We try to delete based on email if your schema supports it, or we skip if we can't find ID.
    // If the auth user was just deleted, we might not have the ID anymore if we didn't find it above.
    // But we can try deleting by email if the column exists.

    try {
        const { error: profileError } = await sb
            .from('profiles')
            .delete()
            .eq('email', email);

        if (profileError) {
            console.log("Note: Could not delete from profiles (or table doesn't exist/no access):", profileError.message);
        } else {
            console.log("✅ Profile cleanup attempted.");
        }
    } catch (e) {
        console.log("Profile cleanup skipped or failed.", e.message);
    }
}

main();
