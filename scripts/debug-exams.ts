
import dotenv from "dotenv";
import path from "path";

// Load envs
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    console.log("Checking Env...");
    console.log("SUPABASE_URL (Head):", process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 15) + "..." : "MISSING");

    // Dynamic import to avoid hoisting issues
    const { supabaseAdmin } = await import("../lib/supabaseAdmin");

    console.log("Fetching exams...");
    const { data: exams, error } = await supabaseAdmin
        .from('exams')
        .select('*');

    if (error) {
        console.error("Error:", error);
        return;
    }

    const fs = await import('fs');
    fs.writeFileSync('scripts/exams_dump.json', JSON.stringify(exams, null, 2));
    console.log("Dumped exams to scripts/exams_dump.json");
}

main();
