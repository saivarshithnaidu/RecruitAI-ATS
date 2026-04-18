import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("search") || "";
    const type = searchParams.get("type") || "college";

    try {
        let dbQuery = supabaseAdmin
            .from("institutions")
            .select("id, name, type, state, district")
            .ilike("name", `%${query}%`)
            .eq("type", type)
            .limit(10);

        const { data, error } = await dbQuery;

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Institution Search API Error:", error.message);
        return NextResponse.json({ error: "Failed to search institutions" }, { status: 500 });
    }
}
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, type, state, district } = body;

        if (!name || !type) {
            return NextResponse.json({ error: "Name and type are required" }, { status: 400 });
        }

        // Try to find if already exists (prevent exact name+type+district duplicates)
        const { data: existing } = await supabaseAdmin
            .from("institutions")
            .select("id")
            .eq("name", name)
            .eq("type", type)
            .eq("district", district || "")
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ success: true, id: existing.id, message: "Institution already exists" });
        }

        // Insert new institution (Safe: No unique constraint on district)
        const { data, error } = await supabaseAdmin
            .from("institutions")
            .insert([{ name, type, state, district }])
            .select("id")
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, id: data.id });
    } catch (error: any) {
        console.error("Institution Creation Error:", error.message);
        return NextResponse.json({ error: "Failed to create institution" }, { status: 500 });
    }
}
