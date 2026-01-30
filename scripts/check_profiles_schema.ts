
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function checkSchema() {
    console.log("Fetching columns for 'candidate_profiles' table...");
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('candidate_profiles')
        .select('*')
        .limit(1);

    if (profileError) {
        console.error("Error fetching candidate_profiles:", profileError);
    } else if (profile && profile.length > 0) {
        console.log("candidate_profiles Columns:", Object.keys(profile[0]));
    }

    console.log("\nFetching columns for 'applications' table...");
    const { data: app, error: appError } = await supabaseAdmin
        .from('applications')
        .select('*')
        .limit(1);

    if (appError) {
        console.error("Error fetching applications:", appError);
    } else if (app && app.length > 0) {
        console.log("applications Columns:", Object.keys(app[0]));
    }
}

checkSchema();
