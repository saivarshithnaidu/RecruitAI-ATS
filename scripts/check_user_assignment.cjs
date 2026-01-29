const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load envs
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    console.log('URL:', supabaseUrl ? 'Set' : 'Missing');
    console.log('Key:', supabaseServiceKey ? 'Set' : 'Missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAssignment() {
    const email = 'pujalasaivarshith@gmail.com';
    console.log(`Checking for ${email}...`);

    // 1. Get User ID
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
        console.error("Error listing users:", userError);
        return;
    }

    const user = users.users.find(u => u.email === email);
    let candidateId = user ? user.id : null;

    if (!candidateId) {
        console.log("User not found in Auth, checking Applications table...");
        const { data: app } = await supabase.from('applications').select('user_id').eq('email', email).single();
        if (app) candidateId = app.user_id;
    }

    if (!candidateId) {
        console.error("Could not resolve candidate ID");
        return;
    }

    console.log(`Resolved Candidate ID: ${candidateId}`);

    const { data: assignments, error } = await supabase
        .from('exam_assignments')
        .select('*')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching assignments:', error);
        return;
    }

    console.log('Assignments found:', assignments.length);
    const fs = require('fs');
    fs.writeFileSync('scripts/check_output.json', JSON.stringify(assignments, null, 2));
    console.log("Written to scripts/check_output.json");
}

checkAssignment();
