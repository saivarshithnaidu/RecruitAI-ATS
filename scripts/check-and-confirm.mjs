
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
    console.log(`Checking status for: ${email}...`);

    const { data: { users }, error: listError } = await sb.auth.admin.listUsers();

    if (listError) {
        console.error("Error listing users:", listError.message);
        return;
    }

    const user = users.find(u => u.email === email);

    if (user) {
        console.log(`User Found: ${user.id}`);
        console.log(`- Email Confirmed At: ${user.email_confirmed_at}`);
        console.log(`- Role: ${user.role}`);

        if (!user.email_confirmed_at) {
            console.log("⚠️ Email NOT confirmed. Attempting manual confirmation...");
            const { error: confirmError } = await sb.auth.admin.updateUserById(user.id, {
                email_confirm: true
            });

            if (confirmError) console.error("Failed to confirm:", confirmError.message);
            else console.log("✅ Email manually confirmed.");
        } else {
            console.log("✅ Email is already confirmed.");
        }

    } else {
        console.log("❌ User NOT found. Signup might have failed completely.");
    }
}

main();
