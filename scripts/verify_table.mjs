import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTable() {
    console.log('Checking invite_clicks table...');

    // Try to select
    const { data, error } = await supabase.from('invite_clicks').select('count', { count: 'exact', head: true });

    if (error) {
        if (error.code === '42P01') { // relation does not exist
            console.error('❌ Table invite_clicks does NOT exist.');
        } else {
            console.error('❌ Error assessing table:', error.message);
        }
    } else {
        console.log('✅ Table invite_clicks exists.');

        // Try to insert a dummy record to be sure
        const { error: insertError } = await supabase.from('invite_clicks').insert({
            invite_token: 'TEST_VERIFY',
            ip_address: '127.0.0.1'
        });

        if (insertError) {
            console.error('❌ Insert failed:', insertError.message);
        } else {
            console.log('✅ Write access confirmed.');

            // Clean up
            await supabase.from('invite_clicks').delete().eq('invite_token', 'TEST_VERIFY');
            console.log('✅ Cleanup done.');
        }
    }
}

checkTable();
