import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase Credentials');
    process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function revokeAssignments() {
    const args = process.argv.slice(2);
    const targetEmail = args[0]; // Optional: Filter by email

    console.log(`[REVOKE] Starting assignment cleanup...`);
    if (targetEmail) console.log(`[REVOKE] Targeting user: ${targetEmail}`);
    else console.log(`[REVOKE] Targeting ALL assignments (Caution!)`);

    try {
        let query = supabase.from('exam_assignments').delete();

        if (targetEmail) {
            // Resolve User ID first
            const { data: users, error: userError } = await supabase.auth.admin.listUsers();
            if (userError) throw userError;

            const user = users.users.find(u => u.email === targetEmail);
            if (!user) throw new Error(`User ${targetEmail} not found`);

            query = query.eq('candidate_id', user.id);

            // Now perform the delete
            const { error: deleteError } = await query.delete();
            if (deleteError) throw deleteError;

            console.log(`✅ successfully revoked/deleted assignments for ${targetEmail}.`);

            // Also reset Application Status
            await supabase.from('applications').update({ status: 'SHORTLISTED' }).eq('email', targetEmail);
            console.log(`✅ Reset application status to SHORTLISTED for ${targetEmail}`);

        } else {
            // Safety: If no email provided, maybe ask for exam ID or confirmation?
            // For this task, let's just revoke 'assigned' status ones to be safe, or just specific exam if provided
            // But user said "I already assigned... so revoke".

            // Let's just delete assignments that are NOT completed/passed/failed to avoid destroying history of past successful candidates
            // UNLESS forced.
            query = query.in('status', ['assigned', 'in_progress']);

            // 1. Get Candidates who are about to be revoked
            const { data: toRevoke, error: selectError } = await query.select('candidate_id');
            if (selectError) throw selectError;
            const candidateIds = toRevoke?.map(r => r.candidate_id) || [];

            if (candidateIds.length > 0) {
                // 2. Delete Assignments
                const { error: deleteError } = await query.delete(); // Re-execute delete on the same query builder
                if (deleteError) throw deleteError;
                console.log(`✅ Revoked ${candidateIds.length} exam assignments.`);

                // 3. Reset Applications to SHORTLISTED
                // Get emails for these IDs
                const { data: profiles, error: profileError } = await supabase.from('candidate_profiles').select('email').in('id', candidateIds);
                if (profileError) throw profileError;
                /* OR simpler: use auth admin list if profiles not reliable, but profiles usually exist. 
                   Actually, the 'applications' table is keyed by email. 
                   Let's rely on 'profiles' linking id -> email. */

                const emails = profiles?.map(p => p.email).filter(Boolean) || [];

                if (emails.length > 0) {
                    const { error: appError } = await supabase
                        .from('applications')
                        .update({ status: 'SHORTLISTED' })
                        .in('email', emails);

                    if (appError) console.error("Failed to reset application status:", appError);
                    else console.log(`✅ Reset ${emails.length} applications to 'SHORTLISTED'.`);
                }
            } else {
                console.log("No active assignments found to revoke.");
            }
        }

    } catch (e) {
        console.error(`❌ Error revoking assignments:`, e);
    }
}

revokeAssignments();
