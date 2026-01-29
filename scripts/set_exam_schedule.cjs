const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load envs
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setSchedule() {
    const assignmentId = 'c6635e0a-a70f-47a0-85b6-a047ad8c5202'; // From previous check output

    // Set time to 1 hour from now
    const now = new Date();
    const future = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour later

    console.log(`Updating assignment ${assignmentId} to start at ${future.toISOString()}`);

    const { error } = await supabase
        .from('exam_assignments')
        .update({
            scheduled_start_time: future.toISOString(),
            duration_override_minutes: 60
        })
        .eq('id', assignmentId);

    if (error) {
        console.error('Error updating assignment:', error);
    } else {
        console.log('Success! Schedule set.');
    }
}

setSchedule();
