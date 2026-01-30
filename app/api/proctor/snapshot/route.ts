
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as Blob;
        const examId = formData.get('examId') as string;
        const userId = formData.get('userId') as string;

        if (!file || !examId || !userId) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `${examId}/${userId}/${Date.now()}.jpg`;

        const { error } = await supabaseAdmin.storage
            .from('proctor_snapshots')
            .upload(filename, buffer, {
                contentType: 'image/jpeg',
                upsert: true
            });

        if (error) {
            console.error("Snapshot upload error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Return public URL (or signed URL if private)
        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('proctor_snapshots')
            .getPublicUrl(filename);

        return NextResponse.json({ success: true, url: publicUrl });

    } catch (error: any) {
        console.error("Snapshot API error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
