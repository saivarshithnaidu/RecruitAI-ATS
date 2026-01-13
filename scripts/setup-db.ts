import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function main() {
  console.log("Setting up database...");

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      created_at TIMESTAMP DEFAULT now()
    );
  `;

  // Extended candidates table to support profile actions
  await sql`
    CREATE TABLE IF NOT EXISTS candidates (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES users(id), 
      name TEXT,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      education TEXT,
      experience TEXT,
      skills TEXT, -- Stored as comma-separated or JSON
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
    CREATE TABLE IF NOT EXISTS profiles(
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'CANDIDATE',
    phone TEXT,
    created_at TIMESTAMP DEFAULT now()
  );
  `;

  console.log("Database setup complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
