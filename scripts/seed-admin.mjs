
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase URL or Key");
    process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function main() {
    const email = 'admin1@example.com';
    const password = 'password123';

    console.log(`Seeding Admin: ${email}...`);

    // 1. Try to create user
    const { data, error } = await sb.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: 'ADMIN', full_name: 'System Admin' }
    });

    if (error) {
        if (error.message.includes('already registered') || error.status === 422) {
            console.log("User already exists. Updating password...");
            // 2. If exists, update password
            const { data: users } = await sb.auth.admin.listUsers();
            const user = users.users.find(u => u.email === email);

            if (user) {
                const { error: updateError } = await sb.auth.admin.updateUserById(user.id, {
                    password: password,
                    user_metadata: { role: 'ADMIN', full_name: 'System Admin' }
                });
                if (updateError) console.error("Update failed:", updateError.message);
                else console.log("Password updated successfully.");
            } else {
                console.error("User exists but not found in list?");
            }
        } else {
            console.error("Error creating user:", error.message);
        }
    } else {
        console.log("Admin user created successfully.");
    }
}

main();
