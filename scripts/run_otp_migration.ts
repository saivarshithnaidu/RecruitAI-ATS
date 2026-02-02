
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env', override: true });

async function runMigration() {
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!dbUrl) {
        console.error("Missing DATABASE_URL");
        process.exit(1);
    }

    const sqlPath = path.join(process.cwd(), 'scripts', 'phase7-otp-schema.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    const sql = postgres(dbUrl, { ssl: 'require', max: 1 });

    try {
        console.log("Applying OTP schema...");
        await sql.unsafe(sqlContent);
        console.log("Schema applied.");
    } catch (e) {
        console.error("Migration failed", e);
    } finally {
        await sql.end();
    }
}

runMigration();
