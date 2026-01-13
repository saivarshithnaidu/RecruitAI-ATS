
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
    const password = 'saiceo';

    console.log(`Ensuring CEO Admin: ${email} with password '${password}'...`);

    // 1. Check if user exists
    const { data: { users }, error: listError } = await sb.auth.admin.listUsers();

    if (listError) {
        console.error("Error listing users:", listError.message);
        return;
    }

    const user = users.find(u => u.email === email);

    if (user) {
        // UPDATE existing
        console.log(`User found (${user.id}). Updating password...`);
        const { error: updateError } = await sb.auth.admin.updateUserById(user.id, {
            password: password,
            email_confirm: true,
            user_metadata: { role: 'ADMIN', full_name: 'CEO Admin' }
        });

        if (updateError) {
            console.error("Error updating user:", updateError.message);
        } else {
            console.log("✅ Password updated to 'saiceo'.");
        }
    } else {
        // CREATE new
        console.log("User not found. Creating new admin...");
        const { data, error: createError } = await sb.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role: 'ADMIN', full_name: 'CEO Admin' }
        });

        if (createError) {
            console.error("Error creating user:", createError.message);
        } else {
            console.log("✅ User created with password 'saiceo'.");

            // Also ensure profile exists
            if (data.user) {
                const { error: profileError } = await sb
                    .from('profiles')
                    .upsert({
                        id: data.user.id,
                        user_id: data.user.id,
                        email: email,
                        full_name: 'CEO Admin',
                        role: 'ADMIN',
                        email_verified: true
                    }, { onConflict: 'id' });

                if (profileError) console.log("Profile upsert warning:", profileError.message);
                else console.log("✅ Profile ensured.");
            }
        }
    }
}

main();
