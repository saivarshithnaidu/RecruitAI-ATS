
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: '.env' });
// Try .env.local if .env didn't have it (or override)
dotenv.config({ path: '.env.local', override: true });

async function runMigration() {
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

    if (!dbUrl) {
        console.error("Error: DATABASE_URL or POSTGRES_URL not found in environment variables.");
        process.exit(1);
    }

    const sqlPath = path.join(process.cwd(), 'scripts', 'phase5-address-migration.sql');
    if (!fs.existsSync(sqlPath)) {
        console.error(`Error: SQL file not found at ${sqlPath}`);
        process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log("Connecting to database...");
    const sql = postgres(dbUrl, {
        ssl: 'require',
        max: 1
    });

    try {
        console.log("Running migration SQL...");
        // postgres.js doesn't allow multiple statements by default easily unless using file or simple query?
        // Actually it handles it usually, or we can use `unsafe`.
        // Let's use `unsafe` for raw SQL scripts.
        await sql.unsafe(sqlContent);
        console.log("Migration executed successfully!");
    } catch (error) {
        console.error("Migration Failed:", error);
    } finally {
        await sql.end();
    }
}

runMigration();
