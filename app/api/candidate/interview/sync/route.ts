
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { interviewId, question, answer } = await req.json();

        // Check active session
        // Only allow if status is 'in_progress' (or equivalent logic you maintain)

        // Upsert logic for "responses" array? 
        // OR better: Create an 'interview_responses' table if granular tracking is needed.
        // For now, simpler: Append to a 'transcript' JSONB field in `interviews` table.

        const { data: interview } = await supabaseAdmin
            .from('interviews')
            .select('transcript')
            .eq('id', interviewId)
            .single();

        const currentTranscript = interview?.transcript || [];
        // Append new Q/A pair
        currentTranscript.push({ question, answer, timestamp: new Date().toISOString() });

        const { error } = await supabaseAdmin
            .from('interviews')
            .update({
                transcript: currentTranscript,
                status: 'IN_PROGRESS'
            })
            .eq('id', interviewId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message });
    }
}
