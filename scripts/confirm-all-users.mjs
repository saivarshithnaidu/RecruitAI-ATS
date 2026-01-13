
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Env Vars");
    process.exit(1);
}

const sbAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function main() {
    console.log("Fetching all users...");
    const { data: { users }, error } = await sbAdmin.auth.admin.listUsers();

    if (error) {
        console.error("Error listing users:", error);
        return;
    }

    const unverified = users.filter(u => !u.email_confirmed_at);
    console.log(`Found ${unverified.length} unverified users. Fixing...`);

    for (const user of unverified) {
        process.stdout.write(`confirming ${user.email}... `);
        const { error: updateError } = await sbAdmin.auth.admin.updateUserById(
            user.id,
            { email_confirm: true }
        );

        if (updateError) {
            console.log(`FAILED: ${updateError.message}`);
        } else {
            console.log("OK");
        }
    }
    console.log("Done.");
}

main();
