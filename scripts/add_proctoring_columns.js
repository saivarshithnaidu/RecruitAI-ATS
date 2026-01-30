const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log("Connected to DB...");

        const checkColumn = "SELECT column_name FROM information_schema.columns WHERE table_name='exams' AND column_name='proctoring_config';";
        const res = await client.query(checkColumn);

        if (res.rows.length === 0) {
            console.log("Adding proctoring_config column...");
            await client.query(`
            ALTER TABLE exams 
            ADD COLUMN proctoring_config JSONB DEFAULT '{"camera": true, "mic": true, "tab_switch": true, "dual_camera": false}'::jsonb;
        `);
            console.log("Column added successfully.");
        } else {
            console.log("Column proctoring_config already exists.");
        }

        // Also need 'exam_engine_version' to distinguish new vs old exams
        const checkVersion = "SELECT column_name FROM information_schema.columns WHERE table_name='exams' AND column_name='exam_engine_version';";
        const resVersion = await client.query(checkVersion);

        if (resVersion.rows.length === 0) {
            console.log("Adding exam_engine_version column...");
            await client.query(`
            ALTER TABLE exams 
            ADD COLUMN exam_engine_version VARCHAR(10) DEFAULT 'v1';
        `);
            console.log("Column added successfully.");
        } else {
            console.log("Column exam_engine_version already exists.");
        }

    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await client.end();
    }
}

run();
