
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function checkStatuses() {
    console.log("Fetching distinct statuses from applications...");
    const { data, error } = await supabaseAdmin.from('applications').select('status');

    if (error) {
        console.error("Error fetching statuses:", error);
        return;
    }

    if (!data || data.length === 0) {
        console.log("No applications found.");
        return;
    }

    const uniqueStatuses = Array.from(new Set(data.map(app => app.status)));
    console.log("Found Statuses:", uniqueStatuses);
}

checkStatuses();
