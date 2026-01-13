import { createClient } from '@supabase/supabase-js';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkInterview() {
    const email = 'cuvar0508@gmail.com';
    console.log(`Checking interview for ${email}...`);

    // 1. Get Profile ID
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

    if (!profile) {
        console.log('Profile NOT found');
        return;
    }
    console.log(`Profile ID: ${profile.id}`);

    // 2. Get Interviews
    const { data: interviews, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('candidate_id', profile.id);

    if (error) {
        console.error('Error fetching interviews:', error);
    } else {
        console.log(`Found ${interviews.length} interviews:`);
        interviews.forEach(i => console.log(i));
    }
}

checkInterview();
