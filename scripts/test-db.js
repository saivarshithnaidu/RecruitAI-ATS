
import { neon } from "@neondatabase/serverless";

console.log("Import successful");
const url = process.env.DATABASE_URL;
console.log("URL exists:", !!url);

if (url) {
    try {
        const sql = neon(url);
        console.log("Neon client created");
        // Try a simple query
        sql`SELECT 1`.then(() => {
            console.log("Query successful");
        }).catch(err => {
            console.error("Query failed", err);
        });
    } catch (e) {
        console.error("Client creation failed", e);
    }
}
