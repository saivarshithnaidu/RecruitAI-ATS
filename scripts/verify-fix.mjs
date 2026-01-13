
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    console.error("Missing Env Vars");
    process.exit(1);
}

const sbAnon = createClient(supabaseUrl, supabaseAnonKey);
const sbAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function main() {
    const email = `test_auto_verify_${Date.now()}@example.com`;
    const password = 'password123';

    console.log(`[Verify] Testing with email: ${email}`);

    // 1. Simulate Signup Action (using Admin client)
    console.log("[Verify] Step 1: Simulated Signup (Admin -> Create User w/ Confirm)");
    const { data: userData, error: createError } = await sbAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // THE KEY FIX
        user_metadata: { full_name: 'Test User' }
    });

    if (createError) {
        console.error("[Verify] Create User Failed:", createError);
        process.exit(1);
    }
    console.log(`[Verify] User created: ${userData.user.id}`);

    // 2. Simulate Login Action (using Anon client)
    console.log("[Verify] Step 2: Simulated Login (Anon -> SignInWithPassword)");
    const { data: loginData, error: loginError } = await sbAnon.auth.signInWithPassword({
        email,
        password
    });

    if (loginError) {
        console.error("[Verify] Login Failed:", loginError.message);
        if (loginError.message === 'Email not confirmed') {
            console.error("[Verify] FAIL: Email still requires confirmation!");
        }
        process.exit(1);
    }

    if (loginData.session) {
        console.log("[Verify] SUCCESS: Login successful immediately after signup!");
        console.log(`[Verify] Session Token: ${loginData.session.access_token.substring(0, 15)}...`);
    } else {
        console.error("[Verify] FAIL: No session returned.");
    }

    // Cleanup
    console.log("[Verify] Cleaning up...");
    await sbAdmin.auth.admin.deleteUser(userData.user.id);
    console.log("[Verify] Cleanup done.");
}

main();
