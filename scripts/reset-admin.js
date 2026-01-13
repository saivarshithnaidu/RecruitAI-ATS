import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function resetPassword() {
    const email = 'recruitai@company.com';
    const password = 'admin123';

    console.log(`Resetting password for ${email} to ${password}`);

    const newHash = await bcrypt.hash(password, 10);

    // First, check if user exists
    const { data: profile } = await supabaseAdmin.from('profiles').select('id, email').eq('email', email).single();

    if (!profile) {
        console.log("User not found, creating user...");
        // Logic to create user if needed, but for now just error
        console.error("User does not exist!");
        return;
    }

    const { error } = await supabaseAdmin
        .from('profiles')
        .update({ password_hash: newHash })
        .eq('email', email);

    if (error) console.error('Error updating:', error);
    else console.log('Password reset successfully.');
}

resetPassword();
