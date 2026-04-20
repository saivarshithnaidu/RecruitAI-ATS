
import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

const sql = postgres(databaseUrl, { ssl: 'require' });

async function main() {
    try {
        const columns = await sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'applications'
            ORDER BY column_name;
        `;
        console.log("Columns of 'applications':");
        columns.forEach(c => console.log(`- ${c.column_name} (${c.data_type})`));

        const tables = await sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public';
        `;
        console.log("\nTables in public schema:");
        tables.forEach(t => console.log(`- ${t.table_name}`));

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await sql.end();
    }
}

main();
