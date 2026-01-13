
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

    console.log(`Verifying login for: ${email}`);

    const { data, error } = await sb.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error("❌ Login FAILED:", error.message);
    } else {
        console.log("✅ Login SUCCESS");
        console.log("User ID:", data.user.id);
    }
}

main();
