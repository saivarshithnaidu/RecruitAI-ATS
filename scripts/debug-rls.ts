
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { config } from "dotenv";
config();

async function debugRLS() {
    console.log("Testing supabaseAdmin RLS bypass...");

    const testId = '00000000-0000-0000-0000-000000000000'; // Dummy UUID

    // 1. Try Select
    const { data: selectData, error: selectError } = await supabaseAdmin
        .from('exams')
        .select('count')
        .limit(1);

    if (selectError) {
        console.error("Select Failed:", selectError.code, selectError.message);
    } else {
        console.log("Select Success. Count:", selectData?.length); // Should be array length, not count property unless we asked for it
    }

    // 2. Try Insert
    console.log("Attempting Insert...");
    const { data: insertData, error: insertError } = await supabaseAdmin
        .from('exams')
        .insert({
            title: "RLS TEST EXAM",
            role: "Frontend Developer",
            difficulty: "Easy",
            duration_minutes: 10,
            pass_mark: 50,
            status: 'DRAFT',
            created_by: testId // This might fail FK if user doesn't exist
        })
        .select()
        .single();

    if (insertError) {
        console.error("Insert Failed:", insertError.code, insertError.message);
    } else {
        console.log("Insert Success:", insertData.id);
        // Cleanup
        await supabaseAdmin.from('exams').delete().eq('id', insertData.id);
    }
}

debugRLS();
