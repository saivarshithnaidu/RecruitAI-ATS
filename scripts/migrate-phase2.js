import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!databaseUrl) {
    console.error("DATABASE_URL not found");
    process.exit(1);
}

const sql = postgres(databaseUrl, { ssl: 'require' });

async function main() {
    console.log("Starting Phase 2 Migration (postgres driver)...");
    try {
        // 1. Add columns to profiles
        console.log("Updating profiles table...");
        // split alter statements to avoid "cannot run inside transaction" if any issues or just for clarity
        // But one block is fine.
        await sql`
            ALTER TABLE profiles
            ADD COLUMN IF NOT EXISTS mobile_number TEXT,
            ADD COLUMN IF NOT EXISTS education JSONB,
            ADD COLUMN IF NOT EXISTS skills TEXT[],
            ADD COLUMN IF NOT EXISTS preferred_job_roles TEXT[],
            ADD COLUMN IF NOT EXISTS summary TEXT,
            ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS mobile_verified BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS profile_verified BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE
        `;

        // 2. Create otp_verifications
        console.log("Creating otp_verifications table...");
        await sql`
            CREATE TABLE IF NOT EXISTS otp_verifications (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
                type TEXT NOT NULL,
                otp_hash TEXT NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT now()
            )
        `;

        console.log("Migration complete.");
        await sql.end();
    } catch (e) {
        console.error("Migration failed", e);
        process.exit(1);
    }
}

main();
