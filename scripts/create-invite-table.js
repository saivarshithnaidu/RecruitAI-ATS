const { neon } = require("@neondatabase/serverless");

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error("DATABASE_URL not found");
    process.exit(1);
}

const sql = neon(databaseUrl);

async function main() {
    console.log("Creating invites table...");
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
    } catch (e) {
        console.error("Failed to create invites table", e);
        process.exit(1);
    }
}

main();
