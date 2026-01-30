import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { Client } from 'pg';

export async function POST(request: Request) {
    console.log("[Apply API] Received application request");

    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ success: false, message: 'Unauthorized: Please log in first' }, { status: 401 });
        }

        // @ts-ignore
        if (session.user.role !== ROLES.CANDIDATE) {
            return NextResponse.json({ success: false, message: 'Only candidates can apply' }, { status: 403 });
        }

        const formData = await request.formData();
        const fullName = formData.get('fullName') as string;
        const email = formData.get('email') as string;
        const phone = formData.get('phone') as string;
        const resume = formData.get('resume') as File;

        // 1. Validation
        if (!fullName || !email || !phone || !resume) {
            return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
        }

        console.log(`[Apply API] File: ${resume.name}, Type: ${resume.type}, Size: ${resume.size}`);

        // RELAXED CHECK: Trust extension mostly.
        const hasValidExtension = resume.name.match(/\.(doc|docx)$/i);
        if (!hasValidExtension) {
            console.warn(`[Apply API] Rejected file (Extension mismatch): ${resume.name}`);
            return NextResponse.json({ success: false, message: 'Invalid file format. Please upload a DOC or DOCX file.' }, { status: 400 });
        }

        console.log(`[Apply API] Processing for user: ${session.user.email} (${session.user.id})`);

        // Check active applications
        const terminalStatuses = ['WITHDRAWN', 'REJECTED', 'EXAM_FAILED', 'DELETED', 'HIRED'];
        const { data: existingApps } = await supabaseAdmin
            .from('applications')
            .select('status')
            .eq('user_id', session.user.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(1);

        if (existingApps && existingApps.length > 0) {
            const lastStatus = existingApps[0].status;
            if (!terminalStatuses.includes(lastStatus)) {
                return NextResponse.json({
                    success: false,
                    message: `You have an active application (Status: ${lastStatus}). Please withdraw or wait for a decision.`
                }, { status: 400 });
            }
        }

        // 2. Upload Resume (Before DB Transaction)
        const timestamp = Date.now();
        const safeFilename = resume.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const filePath = `applications/${session.user.id}/${timestamp}-${safeFilename}`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from('resumes')
            .upload(filePath, resume, {
                contentType: resume.type,
                upsert: false
            });

        if (uploadError) {
            console.error('[Apply API] Storage Error:', uploadError);
            return NextResponse.json({ success: false, message: `Resume upload failed: ${uploadError.message}` }, { status: 500 });
        }

        // 3. DB TRANSACTION (Profile + Application)
        const client = new Client({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });

        try {
            await client.connect();
            await client.query('BEGIN');

            const userId = session.user.id; // Profile ID MUST match User ID

            // A. Resolve Profile (Idempotent)
            // Try insert. If conflict, it exists.
            const insertProfileQuery = `
                INSERT INTO public.profiles (id, user_id, email, full_name, mobile_number, email_verified)
                VALUES ($1, $1, $2, $3, $4, false)
                ON CONFLICT (id) DO NOTHING
            `;
            await client.query(insertProfileQuery, [userId, session.user.email, fullName, phone]);

            // Verify existence (Strict check)
            const checkProfile = await client.query('SELECT id FROM public.profiles WHERE id = $1', [userId]);
            if (checkProfile.rows.length === 0) {
                throw new Error("Critical: Profile Resolution Failed (Row missing after insert/check).");
            }
            console.log(`[Apply API] Profile Verified: ${userId}`);

            // B. Insert Application
            const insertAppQuery = `
                INSERT INTO public.applications (
                    user_id, profile_id, full_name, email, phone, resume_url, status, ats_score
                )
                VALUES ($1, $2, $3, $4, $5, $6, 'APPLIED', 0)
                RETURNING id
            `;

            const appRes = await client.query(insertAppQuery, [
                userId,
                userId, // profile_id matches userId
                fullName,
                email,
                phone,
                filePath
            ]);

            console.log(`[Apply API] Application Inserted: ${appRes.rows[0].id}`);

            await client.query('COMMIT');
            console.log("[Apply API] Transaction Committed.");

            return NextResponse.json({ success: true, message: 'Application submitted successfully' });

        } catch (dbError: any) {
            await client.query('ROLLBACK');
            console.error("[Apply API] DB Transaction Failed:", dbError);
            return NextResponse.json({ success: false, message: `Database Error: ${dbError.message}` }, { status: 500 });
        } finally {
            await client.end();
        }

    } catch (error: any) {
        console.error('[Apply API] Unexpected Error:', error);
        return NextResponse.json({ success: false, message: `Server Error: ${error.message}` }, { status: 500 });
    }
}
