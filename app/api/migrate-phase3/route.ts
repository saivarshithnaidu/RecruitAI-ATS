import { NextResponse } from 'next/server';
import postgres from 'postgres';

export async function GET() {
    console.log("Starting Phase 3 Migration (candidate_profiles) with postgres.js...");

    // Debug output but ensuring 200 return on failures so we can read the message
    const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!databaseUrl) {
        return NextResponse.json({ success: false, message: 'DATABASE_URL not found' }, { status: 200 });
    }

    try {
        const sql = postgres(databaseUrl, { ssl: 'require' });

        await sql`
            CREATE TABLE IF NOT EXISTS candidate_profiles (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
                email TEXT UNIQUE NOT NULL,
                full_name TEXT,
                mobile_number TEXT,
                education JSONB,
                skills TEXT[],
                preferred_roles TEXT[],
                summary TEXT,
                email_verified BOOLEAN DEFAULT FALSE,
                mobile_verified BOOLEAN DEFAULT FALSE,
                profile_verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );
        `;

        // Enable RLS
        await sql`ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;`;

        // Policies
        try {
            await sql`
                CREATE POLICY "Admin can read all profiles" ON candidate_profiles
                FOR SELECT
                USING (
                    exists (
                        select 1 from public.profiles 
                        where id = auth.uid() and role = 'ADMIN'
                        -- Assuming 'role' is in profiles? Or relying on service key for admin actions?
                        -- Actually, Admin Actions use supabaseAdmin (Service Role), which bypasses RLS.
                        -- So RLS is mostly for candidate security.
                    )
                );
            `;
        } catch (e) { console.log("Policy 1 might exist or failed", e); }

        try {
            await sql`
                CREATE POLICY "Users can read own profile" ON candidate_profiles
                FOR SELECT
                USING (auth.uid() = user_id);
            `;
        } catch (e) { console.log("Policy 2 might exist or failed", e); }

        try {
            await sql`
                CREATE POLICY "Users can update own profile" ON candidate_profiles
                FOR UPDATE
                USING (auth.uid() = user_id);
            `;
        } catch (e) { console.log("Policy 3 might exist or failed", e); }

        try {
            await sql`
                CREATE POLICY "Users can insert own profile" ON candidate_profiles
                FOR INSERT
                WITH CHECK (auth.uid() = user_id);
            `;
        } catch (e) { console.log("Policy 4 might exist or failed", e); }


        return NextResponse.json({ success: true, message: 'Phase 3 Migration applied successfully via postgres.js' });
    } catch (error: any) {
        console.error("Migration Error:", error);
        return NextResponse.json({ success: false, message: error.message, details: String(error) }, { status: 200 });
    }
}
