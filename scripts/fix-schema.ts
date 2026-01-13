import postgres from 'postgres';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: ".env" });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error("DATABASE_URL not found");
    process.exit(1);
}

const sql = postgres(databaseUrl, { ssl: 'require' });

async function main() {
    console.log("Fixing database schema with postgres.js...");
    try {
        // 1. Add missing columns to candidates table
        console.log("Adding missing columns to candidates...");
        await sql`ALTER TABLE candidates ADD COLUMN IF NOT EXISTS resume_url TEXT;`;
        await sql`ALTER TABLE candidates ADD COLUMN IF NOT EXISTS resume_text TEXT;`;

        // 2. Fix Foreign Key Constraint
        console.log("Updating FK constraints...");
        try {
            await sql`ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_user_id_fkey;`;
        } catch (e) {
            console.log("Could not drop constraint (might not exist):", e);
        }

        console.log("Schema fix complete.");
        process.exit(0);
    } catch (error) {
        fs.writeFileSync('schema_error.log', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        console.error("Error fixing schema:", error);
        process.exit(1);
    }
}

main();
