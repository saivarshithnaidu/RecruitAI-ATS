import { NextResponse } from 'next/server';
import { neon } from "@neondatabase/serverless";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const url = process.env.DATABASE_URL;
        if (!url) {
            return NextResponse.json({ error: "DATABASE_URL not found in env" }, { status: 500 });
        }

        const sql = neon(url);
        const messages = [];

        // 1. resume_parse_status
        // Check if column exists
        const result1 = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'applications' AND column_name = 'resume_parse_status';
    `;

        if (result1.length > 0) {
            messages.push("✅ Column 'resume_parse_status' ALREADY EXISTS.");
        } else {
            await sql`ALTER TABLE applications ADD COLUMN resume_parse_status TEXT DEFAULT 'PENDING';`;
            // Backfill existing
            // If ats_score > 0, assume SUCCESS. If 0, leave PENDING? Or assume PENDING.
            // Let's safe set >0 to SUCCESS.
            await sql`UPDATE applications SET resume_parse_status = 'SUCCESS' WHERE ats_score > 0;`;
            messages.push("✅ Added 'resume_parse_status' and backfilled successes.");
        }

        // 2. manual_ats_score
        const result2 = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'applications' AND column_name = 'manual_ats_score';
    `;

        if (result2.length > 0) {
            messages.push("✅ Column 'manual_ats_score' ALREADY EXISTS.");
        } else {
            await sql`ALTER TABLE applications ADD COLUMN manual_ats_score INTEGER;`;
            messages.push("✅ Added 'manual_ats_score'.");
        }

        return NextResponse.json({ success: true, messages });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
