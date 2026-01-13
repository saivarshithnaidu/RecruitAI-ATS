
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

const sb = createClient(supabaseUrl, supabaseAnonKey); // ANON CLIENT

async function main() {
    const email = 'recruitaiceo@company.com';
    // User claims they are entering the password they just signed up with.
    // I will try to LOGIN using the standard API.

    // NOTE: I cannot know the user's password. 
    // But I can check if the USER exists via a different method if I had admin access.
    // Here I will try a "known" wrong password to see the error, 
    // and then I will try to SIGN UP again to see if it allows duplicates?

    console.log(`Checking ANON access for: ${supabaseUrl}`);

    // 1. Try a dummy login
    console.log("Attempting login with 'saiceo' (just in case)...");
    const { data, error } = await sb.auth.signInWithPassword({
        email,
        password: 'saiceo'
    });

    if (error) {
        console.log("Login Error:", error.message);
        console.log("Status:", error.status);
    } else {
        console.log("Login SUCCESS with 'saiceo'!");
    }
}

main();
