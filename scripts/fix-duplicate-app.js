
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixDuplicate() {
    const newestAppId = '5bc53f6c-700c-4cef-8415-0b544757f2d7'; // From debug output

    console.log(`Fixing Newest App: ${newestAppId}`);

    const { error } = await supabase
        .from('applications')
        .update({ status: 'HIRED' })
        .eq('id', newestAppId);

    if (error) console.error("Error:", error);
    else console.log("SUCCESS: Newest application forced to HIRED status.");
}

fixDuplicate();
