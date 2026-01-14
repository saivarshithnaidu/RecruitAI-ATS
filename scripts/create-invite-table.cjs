require('dotenv').config({ path: '.env.local' });
const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error("DATABASE_URL not found");
    process.exit(1);
}

// ssl requirements for some cloud providers
const sql = postgres(databaseUrl, { ssl: 'require' });

async function main() {
    console.log("Creating invites table using postgres.js...");
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS invites (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                email TEXT NOT NULL,
                token TEXT UNIQUE NOT NULL,
                sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                clicked BOOLEAN DEFAULT false,
                clicked_at TIMESTAMP WITH TIME ZONE
            );
        `;
        console.log("Invites table created successfully.");
        await sql.end();
    } catch (e) {
        console.error("Failed to create invites table", e);
        // try without ssl if that was the issue? typically ssl is required.
        process.exit(1);
    }
}

main();
