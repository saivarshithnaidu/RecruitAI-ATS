const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

async function testInsert() {
    console.log("Testing PG Connection...");
    console.log("URL:", process.env.DATABASE_URL?.split('@')[1]); // Log host part hiding creds

    // Attempt connection
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        // Try without SSL config first (like current code)
    });

    try {
        await client.connect();
        console.log("Connected successfully.");

        // Try the specific insert query
        // Use dummy data
        const userId = '00000000-0000-0000-0000-000000000000'; // Dummy UUID
        const insertQuery = `
        INSERT INTO public.profiles (user_id, email, full_name, mobile_number, email_verified)
        VALUES ($1, $2, $3, $4, false)
        ON CONFLICT (user_id) 
        DO UPDATE SET full_name = EXCLUDED.full_name, mobile_number = EXCLUDED.mobile_number
        RETURNING id;
    `;

        // Check if duplicate key violation might happen if I use a real ID?
        // I'll use a random UUID to avoid conflict first, then try conflict.
        // Actually, I just want to see if it Executes.

        console.log("Testing Query execution...");
        // We won't actually commit or we will roll back?
        // Since we are debugging, failures are what we want to see.
        // I'll just explain, 
        // To check usage of ON CONFLICT, we need a unique constraint.

        // Let's just check if unique index exists on user_id first.
        const idxQuery = `
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'profiles';
    `;
        const idxRes = await client.query(idxQuery);
        console.log("Indices on profiles:", idxRes.rows.map(r => r.indexname));

    } catch (err) {
        console.error("PG ERROR DETAILED:", err);
    } finally {
        await client.end();
    }
}

testInsert();
