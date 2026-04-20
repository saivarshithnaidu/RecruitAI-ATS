
import { supabaseAdmin } from './lib/supabaseAdmin.js';

async function main() {
    try {
        const { data, error } = await supabaseAdmin
            .from('applications')
            .select('*')
            .limit(1);

        if (error) {
            console.error("Supabase Error:", error);
            return;
        }

        if (data && data.length > 0) {
            console.log("Columns in 'applications':", Object.keys(data[0]));
        } else {
            console.log("No data in 'applications' table to infer columns.");
        }
    } catch (e) {
        console.error("Exception:", e);
    }
}

main();
