
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
    const password = 'password123';

    console.log(`Creating CEO Admin: ${email}...`);

    const { data, error } = await sb.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: 'ADMIN', full_name: 'CEO Admin' }
    });

    if (error) {
        console.log("User might exist, updating password...");
        // logic to update if exists, similar to before
        const { data: { users } } = await sb.auth.admin.listUsers();
        const user = users.find(u => u.email === email);
        if (user) {
            await sb.auth.admin.updateUserById(user.id, { password, user_metadata: { role: 'ADMIN' } });
            console.log("Password updated for existing CEO account.");
        } else {
            console.error("Error:", error.message);
        }
    } else {
        console.log("✅ CEO Admin Created Successfully.");
    }
}

main();
