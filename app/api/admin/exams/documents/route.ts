import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { extractTextFromBuffer } from "@/lib/ai";
import { processDocument } from "@/lib/rag";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const name = formData.get("name") as string || file.name;

        if (!file || file.size === 0) {
            return NextResponse.json({ success: false, message: "File missing" }, { status: 400 });
        }

        // 1. Store File in Supabase Bucket
        const filePath = `rag-docs/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error: uploadError } = await supabaseAdmin.storage
            .from('company-documents')
            .upload(filePath, file, { contentType: file.type });

        if (uploadError) throw uploadError;

        // 2. Create Entry in documents Table
        const { data: doc, error: dbError } = await supabaseAdmin
            .from('company_documents')
            .insert({
                name,
                file_path: filePath,
                type: file.type
            })
            .select('id')
            .single();

        if (dbError) throw dbError;

        // 3. Process RAG (Extract & Embed) - Non-blocking response
        // Using a micro-task or just running it since it's a small internal doc
        (async () => {
             try {
                const buffer = Buffer.from(await file.arrayBuffer());
                const text = await extractTextFromBuffer(buffer, file.type);
                if (text && text.length > 100) {
                    await processDocument(doc.id, text, { source: name, path: filePath });
                }
             } catch (err) {
                 console.error("[DocumentProcessing] Error processing docID:", doc.id, err);
             }
        })();

        return NextResponse.json({ success: true, message: "Document uploaded. AI processing started.", id: doc.id });

    } catch (error: any) {
        console.error("[Upload] Error:", error.message);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('company_documents')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
