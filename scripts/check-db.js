import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!databaseUrl) {
    console.error("DATABASE_URL missing");
    process.exit(1);
}

const sql = postgres(databaseUrl, { ssl: 'require' });

async function main() {
    try {
        const result = await sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `;
        console.log("Tables:", JSON.stringify(result, null, 2));
        await sql.end();
    } catch (e) {
        console.error("Check failed", e);
        process.exit(1);
    }
}
main();
