
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase URL or Key");
    process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
    const email = 'recruitai@company.com';
    const newPassword = 'password123'; // Hardcoded for recovery

    console.log(`Resetting password for: ${email}...`);

    // List users to find ID
    const { data: { users }, error: listError } = await sb.auth.admin.listUsers();

    if (listError) {
        console.error("Failed to list users:", listError.message);
        return;
    }

    const user = users.find(u => u.email === email);

    if (user) {
        const { error: updateError } = await sb.auth.admin.updateUserById(user.id, {
            password: newPassword,
            user_metadata: { role: 'ADMIN' } // Ensure admin role
        });

        if (updateError) {
            console.error("Failed to update password:", updateError.message);
        } else {
            console.log(`\nSUCCESS: Password updated.\nEmail: ${email}\nPassword: ${newPassword}`);
        }
    } else {
        console.log("User not found. Creating new admin user...");
        const { error: createError } = await sb.auth.admin.createUser({
            email,
            password: newPassword,
            email_confirm: true,
            user_metadata: { role: 'ADMIN', full_name: 'RecruitAI Admin' }
        });

        if (createError) {
            console.error("Failed to create user:", createError.message);
        } else {
            console.log(`\nSUCCESS: Account created.\nEmail: ${email}\nPassword: ${newPassword}`);
        }
    }
}

main();
