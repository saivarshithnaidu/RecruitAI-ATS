
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase URL or Key");
    process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function cleanup() {
    console.log("⚠️  Starting DATA CLEANUP...");
    console.log("This will permanently delete data from: exam_assignments, exam_questions, exams, applications, candidate_profiles");

    const tables = [
        'exam_assignments',
        'exam_questions', // Delete children first
        'exams',
        'applications',
        'candidate_profiles'
    ];

    for (const table of tables) {
        process.stdout.write(`Cleaning ${table}... `);

        // Using neq ID 0000... to select all UUIDs (assuming standard UUIDs)
        // If table uses integer IDs, we might need a different verify.
        // We'll try fetching one row to see ID type if needed, but usually Supabase uses UUIDs or Ints.
        // Safer universal wildcard: filter by 'created_at' uses 'neq' null usually works if column exists.
        // But let's assume UUID 'id' or 'id' > 0.

        try {
            // first check if table has data to avoid waiting on empty
            const { count, error: countError } = await sb.from(table).select('*', { count: 'exact', head: true });

            if (countError) {
                console.log(`❌ Error checking ${table}: ${countError.message}`);
                continue;
            }

            if (count === 0) {
                console.log("Skipped (Empty)");
                continue;
            }

            // Delete all
            // we use a condition that covers typically all rows. 
            // id != '00000000-0000-0000-0000-000000000000' works for UUID
            // id > -1 works for int
            // We can try to fetch all IDs and delete by ID list to be sure, or purely purely delete.

            // Chunked delete might be needed if too many rows, but let's try direct delete.
            // Since we don't know the schema (UUID vs Int), we try to assume UUID first (most tables in this project like candidates, exams seem to be UUID based on previous chats).

            const { error } = await sb.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');

            if (error) {
                // Fallback for non-UUID id?
                if (error.message.includes("invalid input syntax for type uuid")) {
                    // Try integer strategy
                    const { error: intError } = await sb.from(table).delete().gt('id', 0);
                    if (intError) {
                        console.log(`❌ Failed (Int fallback): ${intError.message}`);
                    } else {
                        console.log("✅ Done");
                    }
                } else {
                    console.log(`❌ Failed: ${error.message}`);
                }
            } else {
                console.log("✅ Done");
            }

        } catch (e) {
            console.log(`❌ Exception: ${e.message}`);
        }
    }

    console.log("\nCleanup Complete.");
}

cleanup();
