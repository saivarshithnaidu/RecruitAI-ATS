
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkTables() {
    console.log("Checking tables...");

    // 1. Check 'profiles'
    const { data: profiles, error: pError } = await supabaseAdmin.from('profiles').select('count', { count: 'exact', head: true });
    if (pError) console.error("Error accessing 'profiles':", pError.message);
    else console.log("'profiles' count:", profiles);

    // 2. Check 'candidate_profiles'
    const { data: cProfiles, error: cpError } = await supabaseAdmin.from('candidate_profiles').select('count', { count: 'exact', head: true });
    if (cpError) console.error("Error accessing 'candidate_profiles':", cpError.message);
    else console.log("'candidate_profiles' count:", cProfiles);

    // 3. Check one user from applications
    const { data: apps } = await supabaseAdmin.from('applications').select('user_id, email').limit(5);
    console.log("Sample Applications:", apps);

    if (apps && apps.length > 0) {
        const userId = apps[0].user_id;
        if (userId) {
            console.log("Checking User ID:", userId);
            const { data: p } = await supabaseAdmin.from('profiles').select('*').eq('id', userId); // usually id is uuid
            const { data: cp } = await supabaseAdmin.from('candidate_profiles').select('*').eq('user_id', userId);
            console.log("In 'profiles':", p?.length);
            console.log("In 'candidate_profiles':", cp?.length);
        }
    }
}

checkTables();
