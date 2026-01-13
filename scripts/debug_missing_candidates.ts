
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Parse .env.local manually to ensure correct path
const envPath = path.join(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("--- Debugging Candidate Status ---");

    // 1. Get all applications with EXAM_PASSED
    const { data: apps, error: appError } = await supabase
        .from('applications')
        .select('*')
        .eq('status', 'EXAM_PASSED');

    if (appError) {
        console.error("Error fetching apps:", appError);
        return;
    }

    console.log(`Found ${apps?.length || 0} applications with EXAM_PASSED`);

    if (!apps || apps.length === 0) return;

    // 2. Get Profiles
    const userIds = apps.map(a => a.user_id);
    const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

    if (profError) {
        console.error("Error fetching profiles:", profError);
        return;
    }

    const profileMap = new Map(profiles?.map(p => [p.id, p]));

    // Get total applications count
    const { count } = await supabase.from('applications').select('*', { count: 'exact', head: true });

    const report = {
        total_apps_in_db: count,
        exam_passed_apps: apps.length,
        candidates: apps.map(app => {
            const p = profileMap.get(app.user_id);
            return {
                id: app.id,
                user_id: app.user_id,
                name: app.full_name,
                status: app.status,
                profile_found: !!p,
                email_verified: p?.email_verified,
                phone_verified: p?.phone_verified,
                verified_by_admin: p?.verified_by_admin,
                // New Logic: Only verified_by_admin matters
                is_visible: p && p.verified_by_admin
            };
        })
    };

    const fs = await import('fs');
    fs.writeFileSync('candidate_status_report.json', JSON.stringify(report, null, 2));
    console.log("Report written to candidate_status_report.json");
}

main();
