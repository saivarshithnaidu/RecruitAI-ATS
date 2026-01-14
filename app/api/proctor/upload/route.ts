import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('video') as File;
        const examId = formData.get('examId') as string;
        const candidateId = formData.get('candidateId') as string;

        if (!file || !examId) {
            return NextResponse.json({ success: false, error: 'Missing file or examId' }, { status: 400 });
        }

        // 1. Upload to Supabase Storage
        const filePath = `${examId}/${candidateId || 'anon'}_${Date.now()}.webm`;
        const { data: uploadData, error: uploadError } = await supabaseAdmin
            .storage
            .from('exam-recordings')
            .upload(filePath, file, {
                contentType: 'video/webm',
                upsert: true
            });

        if (uploadError) {
            console.error('Storage Upload Error:', uploadError);
            return NextResponse.json({ success: false, error: uploadError.message }, { status: 500 });
        }

        // 2. Save Metadata to DB
        // We use insert for the first chunk, or create separate logic for multi-chunk?
        // For simplicity in this V1, we assume one upload at the end or small chunks.
        // Let's log it. Ideally we should have one record per exam and update it, or multiple segments.
        // Let's go with multiple segments for safety, or just one if we upload at end.
        // User requested: video_url, duration.

        const { error: dbError } = await supabaseAdmin
            .from('exam_recordings')
            .insert({
                exam_assignment_id: examId,
                candidate_id: candidateId,
                video_path: filePath,
                duration_seconds: 0 // We can't easily know server side without processing
            });

        if (dbError) {
            console.error('DB Insert Error:', dbError);
            // Don't fail the request if storage worked, just log it.
        }

        return NextResponse.json({ success: true, path: filePath });

    } catch (e: any) {
        console.error('Upload Handler Error:', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
