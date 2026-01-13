
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function checkSchema() {
    console.log("Checking exam_assignments...");
    const { data, error } = await supabaseAdmin.from('exam_assignments').select('*').limit(1);
    if (error) console.error(error);
    else console.log("exam_assignments keys:", data && data[0] ? Object.keys(data[0]) : "No data");
}

checkSchema();
