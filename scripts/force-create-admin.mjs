
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
    const password = 'password123';

    console.log(`Force Re-creating Admin: ${email}...`);

    // 1. Find user
    const { data: { users }, error: listError } = await sb.auth.admin.listUsers();
    if (listError) {
        console.error("List users failed:", listError.message);
        return;
    }

    const existingUser = users.find(u => u.email === email);

    // 2. Delete if exists
    if (existingUser) {
        console.log(`Found existing user ${existingUser.id}. Deleting...`);
        const { error: deleteError } = await sb.auth.admin.deleteUser(existingUser.id);
        if (deleteError) {
            console.error("Delete failed:", deleteError.message);
            return;
        }
        console.log("User deleted.");
    }

    // 3. Create fresh
    console.log("Creating new user...");
    const { data, error: createError } = await sb.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: 'ADMIN', full_name: 'RecruitAI SuperAdmin' }
    });

    if (createError) {
        console.error("Create failed:", createError.message);
    } else {
        console.log("\n✅ SUCCESS: User Created Completely New.");
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log("Please copy-paste these credentials exactly.");
    }
}

main();
