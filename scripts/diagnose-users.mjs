
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

    console.log(`Found ${users.length} users.`);

    const unverified = users.filter(u => !u.email_confirmed_at);
    console.log(`Unverified Users: ${unverified.length}`);

    unverified.forEach(u => {
        console.log(` - ${u.email} (ID: ${u.id}) [Created: ${u.created_at}]`);
    });

    if (unverified.length === 0) {
        console.log("All users are verified.");
    }
}

main();
