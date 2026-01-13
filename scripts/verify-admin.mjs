
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
    const email = 'recruitai@company.com';
    const password = 'password123';

    console.log(`1. Finding user...`);
    const { data: { users } } = await sb.auth.admin.listUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
        console.log("User not found. Creating...");
        await sb.auth.admin.createUser({
            email, password, email_confirm: true, user_metadata: { role: 'ADMIN' }
        });
    } else {
        console.log(`User found (${user.id}). Updating password...`);
        const { error } = await sb.auth.admin.updateUserById(user.id, {
            password: password,
            email_confirm: true, // Re-confirm just in case
            user_metadata: { role: 'ADMIN' }
        });
        if (error) console.error("Update failed:", error.message);
        else console.log("Password updated.");
    }

    // Verification Step
    console.log(`2. Verifying Login script-side...`);
    const { data, error: loginError } = await sb.auth.signInWithPassword({
        email,
        password
    });

    if (loginError) {
        console.error("❌ Login Verification Failed:", loginError.message);
    } else {
        console.log("✅ Login Verification Success!");
        console.log(`User ID: ${data.user.id}`);
        console.log("Credentials are VALID.");
    }
}

main();
