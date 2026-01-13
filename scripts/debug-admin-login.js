import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl ? 'Found' : 'Missing');
console.log('Supabase Key:', supabaseServiceKey ? 'Found' : 'Missing');

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
    const email = 'recruitai@company.com';
    const password = 'admin123';

    console.log(`Checking user: ${email}`);

    // 1. Check if user exists in profiles
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

    if (error) {
        console.error('Error fetching profile:', error);
    }

    if (!profile) {
        console.log('Profile not found.');
        // Try to create it if it doesn't exist? 
        // Usually we'd need an ID from auth.users, but here we are using manual auth on profiles?
        // The previous implementation replaced Supabase Auth with manual bcrypt on profiles table?
        // Let's check lib/auth.ts again. Yes: "1. MANUAL AUTH VIA PROFILES TABLE"

        // So we can just insert into profiles if we want, but ideally it should link to auth.users if ever we switch back.
        // However, the error says 'Profile not found' so let's just see.
    } else {
        console.log('Profile found:', {
            id: profile.id,
            email: profile.email,
            role: profile.role,
            has_hash: !!profile.password_hash
        });

        if (profile.password_hash) {
            const match = await bcrypt.compare(password, profile.password_hash);
            console.log('Bcrypt comparison result:', match);

            if (!match) {
                console.log('Password mismatch!');
                // Update the password
                const newHash = await bcrypt.hash(password, 10);
                console.log('Updating password hash...');
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ password_hash: newHash })
                    .eq('id', profile.id);

                if (updateError) console.error('Error updating hash:', updateError);
                else console.log('Password hash updated successfully.');
            }
        } else {
            console.log('No password hash set on profile. Setting it now...');
            const newHash = await bcrypt.hash(password, 10);
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ password_hash: newHash })
                .eq('id', profile.id);

            if (updateError) console.error('Error updating hash:', updateError);
            else console.log('Password hash set successfully.');
        }
    }
}

main();
