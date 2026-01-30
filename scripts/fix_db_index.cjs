const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

async function fixIndex() {
    console.log("Fixing DB Index...");
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Connected.");

        // Create Unique Index on user_id for profiles table
        const query = `
      CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user_id 
      ON public.profiles (user_id);
    `;

        await client.query(query);
        console.log("Unique Index 'idx_profiles_user_id' created/verified.");

    } catch (err) {
        console.error("PG Error:", err);
    } finally {
        await client.end();
    }
}

fixIndex();
