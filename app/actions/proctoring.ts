'use server';

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function getActiveProctoringSessions() {
    try {
        // Fetch sessions that are 'active' (or checked in recently)
        const { data, error } = await supabaseAdmin
            .from('exam_proctoring_sessions')
            .select(`
                *,
                exam_assignments (
                    id,
                    exams ( title ),
                    applications ( full_name, email )
                )
            `)
            .order('last_ping_at', { ascending: false });

        if (error) throw error;
        return { sessions: data };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function forceEndSession(assignmentId: string) {
    try {
        const { error } = await supabaseAdmin
            .from('exam_assignments')
            .update({ status: 'completed' })
            .eq('id', assignmentId); // This is a simplification

        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}
