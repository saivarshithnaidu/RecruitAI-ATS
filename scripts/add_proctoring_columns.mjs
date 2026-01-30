import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const { Client } = pg;

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log("Connected to DB...");

        // 1. Check/Add proctoring_config
        const checkColumn = "SELECT column_name FROM information_schema.columns WHERE table_name='exams' AND column_name='proctoring_config';";
        const res = await client.query(checkColumn);

        if (res.rows.length === 0) {
            console.log("Adding proctoring_config column...");
            await client.query(`
            ALTER TABLE exams 
            ADD COLUMN proctoring_config JSONB DEFAULT '{"camera": true, "mic": true, "tab_switch": true, "dual_camera": false}'::jsonb;
        `);
            console.log("proctoring_config added.");
        } else {
            console.log("proctoring_config already exists.");
        }

        // 2. Check/Add exam_engine_version
        const checkVersion = "SELECT column_name FROM information_schema.columns WHERE table_name='exams' AND column_name='exam_engine_version';";
        const resVersion = await client.query(checkVersion);

        if (resVersion.rows.length === 0) {
            console.log("Adding exam_engine_version column...");
            await client.query(`
            ALTER TABLE exams 
            ADD COLUMN exam_engine_version VARCHAR(10) DEFAULT 'v1';
        `);
            console.log("exam_engine_version added.");
        } else {
            console.log("exam_engine_version already exists.");
        }

    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
