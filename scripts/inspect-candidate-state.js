
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

async function inspectUser() {
    const email = 'cuvar0508@gmail.com';
    console.log(`Inspecting App for: ${email}`);

    const { data: apps, error } = await supabase
        .from('applications')
        .select('*')
        .eq('email', email);

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log("Applications found:", apps);

    if (apps.length > 0) {
        const appId = apps[0].id;
        const { data: interview } = await supabase
            .from('interviews')
            .select('*')
            .eq('application_id', appId);
        console.log("Linked Interview:", interview);
    }
}

inspectUser();
