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

        // Check if columns exist
        const result = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'candidate_profiles' AND column_name = 'profile_photo_url';
    `;

        const messages = [];

        if (result.length > 0) {
            messages.push("✅ Column 'profile_photo_url' ALREADY EXISTS.");
        } else {
            await sql`ALTER TABLE candidate_profiles ADD COLUMN profile_photo_url TEXT;`;
            messages.push("✅ Added 'profile_photo_url'.");
        }

        // Status column
        const statusCheck = await sql`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'candidate_profiles' AND column_name = 'photo_status';
    `;
        if (statusCheck.length > 0) {
            messages.push("✅ Column 'photo_status' ALREADY EXISTS.");
        } else {
            await sql`ALTER TABLE candidate_profiles ADD COLUMN photo_status TEXT DEFAULT 'PENDING';`;
            messages.push("✅ Added 'photo_status'.");
        }

        // Reason column
        const reasonCheck = await sql`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'candidate_profiles' AND column_name = 'photo_rejection_reason';
    `;
        if (reasonCheck.length > 0) {
            messages.push("✅ Column 'photo_rejection_reason' ALREADY EXISTS.");
        } else {
            await sql`ALTER TABLE candidate_profiles ADD COLUMN photo_rejection_reason TEXT;`;
            messages.push("✅ Added 'photo_rejection_reason'.");
        }

        return NextResponse.json({ success: true, messages });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
