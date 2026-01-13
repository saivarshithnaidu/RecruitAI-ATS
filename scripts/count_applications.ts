
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function countApps() {
    console.log("Counting applications...");
    const { count, data, error } = await supabaseAdmin
        .from('applications')
        .select('*', { count: 'exact' });

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log(`Total Applications Found: ${count}`);
    if (data) {
        console.log("First 5 applications:", data.slice(0, 5).map(a => ({ id: a.id, email: a.email, status: a.status })));
    }
}

countApps();
