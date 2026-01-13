
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function checkSchema() {
    console.log("Fetching columns for 'profiles' table...");
    // Supabase RPC or just try to select * limit 1 to see keys if RPC not available easily for schema
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching profiles:", error);
        return;
    }

    if (data && data.length > 0) {
        console.log("Columns found in row 1:", Object.keys(data[0]));
    } else {
        console.log("No rows found. Cannot deduce columns from data. Trying to insert dummy to see error.");
    }
}

checkSchema();
