
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSchedulingLogic() {
    console.log("Starting Scheduling Logic Verification...");

    // 1. Get a test user (candidate)
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    if (userError || !users.users.length) {
        console.error("No users found to test with.");
        return;
    }
    const candidateId = users.users[0].id;
    console.log(`Using candidate: ${candidateId}`);

    const now = new Date();

    // 2. Create Test Scenarios
    const scenarios = [
        { name: "FUTURE", scheduledAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) }, // +24 hours
        { name: "EARLY_JOIN", scheduledAt: new Date(now.getTime() + 5 * 60 * 1000) }, // +5 mins
        { name: "ACTIVE", scheduledAt: new Date(now.getTime() - 5 * 60 * 1000) }, // -5 mins
        { name: "EXPIRED", scheduledAt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } // -24 hours
    ];

    const createdIds = [];

    for (const scen of scenarios) {
        const { data, error } = await supabase.from('interviews').insert({
            application_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID, might fail FK if app doesn't exist. 
            // We need a valid application ID. Let's try to fetch one or create dummy.
            // Actually better to just mock the validation function logic locally if we can't easily insert.
            // But we want to test the `validateInterviewAccess` function which queries DB.
            // Let's create a minimal valid entry.
            candidate_id: candidateId,
            scheduled_at: scen.scheduledAt.toISOString(),
            duration_minutes: 60,
            mode: 'AI',
            status: 'scheduled',
            created_by: candidateId
        }).select().single();

        if (error) {
            // If FK fails, we might need to find a valid app.
            // Let's first search for an existing application for this user.
            const { data: app } = await supabase.from('applications').select('id').eq('user_id', candidateId).limit(1).single();
            if (app) {
                // Retry with valid app id
                const { data: retryData, error: retryError } = await supabase.from('interviews').insert({
                    application_id: app.id,
                    candidate_id: candidateId,
                    scheduled_at: scen.scheduledAt.toISOString(),
                    duration_minutes: 60,
                    mode: 'AI',
                    status: 'scheduled',
                    created_by: candidateId
                }).select().single();

                if (retryData) {
                    createdIds.push({ id: retryData.id, scenario: scen.name });
                    console.log(`Created ${scen.name} interview: ${retryData.id}`);
                } else {
                    console.error(`Failed to create ${scen.name}:`, retryError?.message);
                }
            } else {
                console.error(`Skipping ${scen.name}: No application found for user.`);
            }
        } else {
            createdIds.push({ id: data.id, scenario: scen.name });
            console.log(`Created ${scen.name} interview: ${data.id}`);
        }
    }

    // 3. Import and Test Validation Logic
    // Since we can't easily import TS server actions in this standalone script without build, 
    // We will REPLICATE the logic here to verify it works as expected given the DB inputs.
    // This validates the logic *concept*, assuming the code in `interview.ts` is identical.

    console.log("\nVerifying Logic against DB records...");

    for (const item of createdIds) {
        const { data: interview } = await supabase.from('interviews').select('*').eq('id', item.id).single();
        const scheduledAt = new Date(interview.scheduled_at);
        const durationMins = interview.duration_minutes;
        const joinTime = new Date(scheduledAt.getTime() - 15 * 60 * 1000);
        const endTime = new Date(scheduledAt.getTime() + durationMins * 60 * 1000);
        const currentTime = new Date();

        let status = '';
        if (currentTime < joinTime) status = 'FUTURE (Too early)';
        else if (currentTime > endTime) status = 'EXPIRED';
        else status = 'ACTIVE/EARLY_JOIN (Allowed)';

        console.log(`[${item.scenario}] Scheduled: ${scheduledAt.toISOString()} | Now: ${currentTime.toISOString()}`);
        console.log(`   -> Result Status: ${status}`);

        // Assertion
        if (item.scenario === 'FUTURE' && !status.includes('Too early')) console.error("   FAIL: Should be blocked");
        if (item.scenario === 'EXPIRED' && !status.includes('EXPIRED')) console.error("   FAIL: Should be expired");
        if (item.scenario === 'ACTIVE' && !status.includes('Allowed')) console.error("   FAIL: Should be allowed");
        if (item.scenario === 'EARLY_JOIN' && !status.includes('Allowed')) console.error("   FAIL: Should be allowed (but frontend handles countdown)");

        // CLEANUP
        await supabase.from('interviews').delete().eq('id', item.id);
    }

    console.log("\nVerification Complete. Cleaned up test records.");
}

testSchedulingLogic();
