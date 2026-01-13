
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
    const email = 'recruitaiceo@company.com';
    const newPassword = 'sai@admin';

    console.log(`Searching for user: ${email}`);

    // Cannot search by email directly in admin listUsers easily without filtering manually or using specialized method if exists in this version
    // But listUsers returns a list, can verify.
    const { data: { users }, error } = await sbAdmin.auth.admin.listUsers();

    if (error) {
        console.error("Failed to list users:", error);
        return;
    }

    const user = users.find(u => u.email === email);

    if (user) {
        console.log(`Found user ${user.id}. Updating password...`);
        const { data, error: updateError } = await sbAdmin.auth.admin.updateUserById(
            user.id,
            { password: newPassword, email_confirm: true } // Ensure verified too
        );

        if (updateError) {
            console.error("Failed to update password:", updateError);
        } else {
            console.log("Password updated successfully.");
            console.log(`User: ${data.user.email}`);
            console.log(`New Password: ${newPassword}`);
        }
    } else {
        console.log("User not found. Creating new user...");
        const { data, error: createError } = await sbAdmin.auth.admin.createUser({
            email,
            password: newPassword,
            email_confirm: true,
            user_metadata: { role: 'ADMIN' } // Ensure admin role defaults
        });

        if (createError) {
            console.error("Failed to create user:", createError);
        } else {
            console.log("User created successfully.");
            console.log(`User: ${data.user.email}`);
            console.log(`Password: ${newPassword}`);
        }
    }
}

main();
