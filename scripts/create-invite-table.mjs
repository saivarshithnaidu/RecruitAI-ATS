import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
    console.error('Missing DATABASE_URL or POSTGRES_URL in .env.local');
    process.exit(1);
}

const sql = postgres(connectionString);

async function createTable() {
    try {
        console.log('Creating invite_clicks table...');

        await sql`
      CREATE TABLE IF NOT EXISTS invite_clicks (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        invite_token TEXT NOT NULL,
        email TEXT,
        ip_address TEXT,
        country TEXT,
        region TEXT,
        city TEXT,
        isp TEXT,
        device TEXT,
        browser TEXT,
        referrer TEXT,
        clicked_at TIMESTAMPTZ DEFAULT now()
      );
    `;

        console.log('✅ invite_clicks table created successfully.');
    } catch (error) {
        console.error('❌ Error creating table:', error);
    } finally {
        await sql.end();
    }
}

createTable();
