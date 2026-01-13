import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Mimic lib/supabaseAdmin.ts logic to see if it would fail
const supabaseUrlEnv = process.env.SUPABASE_URL;
const nextPublicSupabaseUrlEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('--- DEBUGGING AUTH FLOW ---');
console.log('SUPABASE_URL env:', supabaseUrlEnv ? 'Set' : 'Unset');
console.log('NEXT_PUBLIC_SUPABASE_URL env:', nextPublicSupabaseUrlEnv ? 'Set' : 'Unset');

// Use what the app uses to test connectivity
const effectiveUrl = supabaseUrlEnv || nextPublicSupabaseUrlEnv;

if (!effectiveUrl || !supabaseServiceRoleKey) {
    console.error('CRITICAL: Missing credentials.');
    process.exit(1);
}

const supabaseAdmin = createClient(effectiveUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function testAuth(emailInput, passwordInput) {
    const email = emailInput.trim().toLowerCase();
    const password = passwordInput.trim();

    console.log(`\nTesting Login for: '${email}'`);
    console.log(`Password: '${password}'`);

    // 1. Fetch Profile
    const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

    if (error) {
        console.error('FAIL: Database Error fetching profile:', error.message);
        // Also check if this is a connection error
        if (error.message.includes('fetch') || error.message.includes('connection')) {
            console.error('This looks like a network/connection issue.');
        }
        return;
    }

    if (!profile) {
        console.error('FAIL: Profile not found in database.');
        return;
    }

    console.log('SUCCESS: Profile found.', { id: profile.id, email: profile.email, has_hash: !!profile.password_hash });

    // 2. Check Hash
    if (!profile.password_hash) {
        console.error('FAIL: No password_hash on profile.');
        return;
    }

    const isValid = await bcrypt.compare(password, profile.password_hash);

    if (!isValid) {
        console.error('FAIL: INVALID password. bcrypt.compare returned false.');
        // Debug hash
        console.log('Hash in DB:', profile.password_hash);
        // update it to be correct for sure
        const newHash = await bcrypt.hash(password, 10);
        console.log(`Generating new hash for '${password}': ${newHash}`);

        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ password_hash: newHash })
            .eq('id', profile.id);

        if (!updateError) console.log('FIX: Updated password hash to be correct.');
        else console.error('FIX FAIL: Could not update hash:', updateError);

    } else {
        console.log('SUCCESS: Password is VALID.');
    }
}

// Run test
testAuth('recruitai@company.com', 'admin123');
