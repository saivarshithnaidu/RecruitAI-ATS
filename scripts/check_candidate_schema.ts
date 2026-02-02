import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function checkSchema() {
    console.log("Fetching columns for 'candidate_profiles' table...");
    const { data, error } = await supabaseAdmin
        .from('candidate_profiles')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching candidate_profiles:", error);
        return;
    }

    if (data && data.length > 0) {
        console.log("Columns found in row 1:", Object.keys(data[0]));
    } else {
        console.log("No rows found. Attempting to insert dummy to see structure or assume from previous knowledge.");
        // Try to get structure via RPC if possible, or just fail softly.
        // Actually, let's try to select specific columns we plan to add to see if they exist (will error if they don't).
        const { error: colError } = await supabaseAdmin
            .from('candidate_profiles')
            .select('address_city')
            .limit(1);

        if (colError) {
            console.log("address_city column check failed (Expected if not exists):", colError.message);
        } else {
            console.log("address_city column ALREADY EXISTS.");
        }
    }
}

checkSchema();
