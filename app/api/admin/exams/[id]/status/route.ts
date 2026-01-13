
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const { id } = params;

    const { data: exam, error } = await supabaseAdmin
        .from('exams')
        .select('status')
        .eq('id', id)
        .single();

    if (error || !exam) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ status: exam.status });
}
