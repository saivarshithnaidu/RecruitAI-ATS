
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.log("Missing credentials");
    process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function testLogin() {
    console.log("Testing login for recruitaiceo@company.com...");
    const { data, error } = await sb.auth.signInWithPassword({
        email: 'recruitaiceo@company.com',
        password: 'password123'
    });

    if (error) {
        console.error("Login failed:", error.message);
    } else {
        console.log("Login successful!");
        console.log("User:", data.user.email);
    }
}

testLogin();
