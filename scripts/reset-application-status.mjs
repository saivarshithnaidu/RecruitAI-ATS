import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase Credentials');
    process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function resetStatus() {
    console.log(`[RESET] Forcing application status reset...`);

    try {
        // 1. Reset 'EXAM_ASSIGNED' back to 'SHORTLISTED'
        const { data, error, count } = await supabase
            .from('applications')
            .update({ status: 'SHORTLISTED' })
            .eq('status', 'EXAM_ASSIGNED')
            .select();

        if (error) throw error;

        console.log(`✅ successfully reset ${data?.length || 0} applications from 'EXAM_ASSIGNED' to 'SHORTLISTED'.`);

        // Optional: Check status just to show user
        const { count: shortlistedCount } = await supabase
            .from('applications')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'SHORTLISTED');

        console.log(`ℹ️ Total candidates now 'SHORTLISTED': ${shortlistedCount}`);

    } catch (e) {
        console.error(`❌ Error resetting status:`, e);
    }
}

resetStatus();
