import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSlots() {
    console.log(`[DEBUG] Checking Exam Slots...`);
    console.log(`Current Server Time: ${new Date().toISOString()}`);

    const { data: slots, error } = await supabase
        .from('exam_slots')
        .select('*')
        .order('start_time', { ascending: true });

    if (error) {
        console.error("Error fetching slots:", error);
        return;
    }

    console.log(`Found ${slots.length} slots total.`);

    slots.forEach(s => {
        console.log(`- Slot ID: ${s.id.slice(0, 8)} | Exam: ${s.exam_id.slice(0, 8)} | Start: ${new Date(s.start_time).toLocaleString()} | End: ${new Date(s.end_time).toLocaleString()} | Max: ${s.max_candidates}`);
    });

    // Check strict future query
    const now = new Date().toISOString();
    const { data: futureSlots } = await supabase
        .from('exam_slots')
        .select('*')
        .gte('start_time', now);

    console.log(`\nSlots visible to candidate (start_time >= ${now}): ${futureSlots?.length || 0}`);
}

checkSlots();
