import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL not found in .env.local');
    process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, {
    ssl: 'require',
    max: 1
});

async function run() {
    try {
        const schemaPath = path.join(__dirname, '../supabase/phase8-exam-slots.sql');
        console.log(`Reading SQL from: ${schemaPath}`);
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Applying schema...');
        // Using simple() for multi-statement SQL execution
        await sql.simple(schemaSql);

        console.log('✅ Schema applied successfully.');
    } catch (e) {
        console.error('❌ Error applying schema:', e);
    } finally {
        await sql.end();
    }
}

run();
