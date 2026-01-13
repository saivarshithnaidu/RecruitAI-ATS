
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Env Vars");
    process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
    const email = 'recruitaiceo@company.com';
    const password = 'sai@admin';

    console.log(`[Debug] Testing Login for: '${email}'`);
    console.log(`[Debug] Password: '${password}'`);
    console.log(`[Debug] Target URL: ${supabaseUrl}`);

    const { data, error } = await sb.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error("LOGIN FAILED in Script:");
        console.error("Message:", error.message);
        console.error("Status:", error.status);
    } else {
        console.log("LOGIN SUCCESS in Script!");
        console.log("User ID:", data.user.id);
        console.log("Email:", data.user.email);
        console.log("Role:", data.user.role);
    }
}

main();
