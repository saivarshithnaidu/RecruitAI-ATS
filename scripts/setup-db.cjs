
const { neon } = require("@neondatabase/serverless");

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error("DATABASE_URL not found");
    process.exit(1);
}

const sql = neon(databaseUrl);

async function main() {
    console.log("Setting up database...");

    try {
        await sql`DROP TABLE IF EXISTS users CASCADE`;

        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone TEXT,
                password_hash TEXT,
                role TEXT DEFAULT 'candidate',
                image TEXT,
                created_at TIMESTAMP DEFAULT now()
            );
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS candidates (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                user_id UUID REFERENCES users(id), 
                name TEXT,
                email TEXT UNIQUE NOT NULL,
                phone TEXT,
                education TEXT,
                experience TEXT,
                skills TEXT,
                preferred_role TEXT,
                ats_score INTEGER,
                status TEXT,
                created_at TIMESTAMP DEFAULT now()
            );
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS coding_evaluations (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                candidate_email TEXT,
                problem_title TEXT,
                language TEXT,
                score INTEGER,
                result TEXT,
                feedback TEXT,
                created_at TIMESTAMP DEFAULT now()
            );
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS exams (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                title TEXT,
                role TEXT,
                questions JSONB,
                created_at TIMESTAMP DEFAULT now()
            );
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS interviews (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                candidate_id UUID REFERENCES candidates(id),
                scheduled_at TIMESTAMP,
                status TEXT,
                transcript JSONB
            );
        `;


        console.log("Database setup complete.");
    } catch (e) {
        console.error("Setup failed", e);
        process.exit(1);
    }
}

main();
