import postgres from "postgres";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Load environment variables
dotenv.config({ path: ".env.local" });
if (!process.env.DATABASE_URL) {
    dotenv.config({ path: ".env" });
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error("❌ DATABASE_URL not found in .env or .env.local");
    process.exit(1);
}

// Log masked URL for debugging
const maskedUrl = databaseUrl.replace(/:[^:]*@/, ':****@');
console.log(`Using Database URL: ${maskedUrl}`);

// Connect using postgres.js
const sql = postgres(databaseUrl, {
    ssl: 'require',
    max: 1,
    connect_timeout: 10
});

async function main() {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error("❌ Please provide a SQL file path.");
        process.exit(1);
    }

    const fullPath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
        console.error(`❌ File not found: ${fullPath}`);
        process.exit(1);
    }

    console.log("Testing connection...");
    try {
        const version = await sql`SELECT version()`;
        console.log("✅ Connected to:", version[0].version);
    } catch (err: any) {
        console.error("❌ Connection Failed:", err.message);
        if (err.code) console.error("Code:", err.code);
        // console.error("Full Error:", err);
        process.exit(1);
    }

    console.log(`reading migration from: ${filePath}...`);

    try {
        await sql.file(fullPath);
        console.log("✅ Migration executed successfully.");
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    } finally {
        await sql.end();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
