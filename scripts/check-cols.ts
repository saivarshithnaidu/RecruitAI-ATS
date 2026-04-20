
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function main() {
    try {
        const { data, error } = await supabaseAdmin
            .from('applications')
            .select('*')
            .limit(1);

        if (error) {
            console.error("Error:", error);
            return;
        }

        if (data && data.length > 0) {
            console.log("Columns:", Object.keys(data[0]));
        } else {
            console.log("No data found in applications table.");
        }
    } catch (e) {
        console.error("Exception:", e);
    }
}

main();
