import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;

    if (!token) {
        return NextResponse.redirect(new URL('/auth/signup', req.url));
    }

    try {
        // Update invite status
        const { error } = await supabaseAdmin
            .from('invites')
            .update({
                clicked: true,
                clicked_at: new Date().toISOString()
            })
            .eq('token', token);

        if (error) {
            console.error("Failed to track invite click:", error);
        }
    } catch (err) {
        console.error("Error in invite handler:", err);
    }

    // Redirect to signup page
    return NextResponse.redirect(new URL('/auth/signup', req.url));
}
