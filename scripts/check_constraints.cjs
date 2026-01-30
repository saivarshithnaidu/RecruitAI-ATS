const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkConstraints() {
    console.log("Connecting...");
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();

        const query = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'profiles' 
      AND column_name LIKE '%mail%';
    `;
        console.log("--- profiles email columns ---");
        const res = await client.query(query);
        console.log(res.rows.map(r => r.column_name));

    } catch (err) {
        console.error("PG Error:", err);
    } finally {
        await client.end();
    }
}

checkConstraints();
