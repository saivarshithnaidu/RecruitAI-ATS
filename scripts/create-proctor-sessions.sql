-- Create table for tracking active proctoring sessions (The Handshake Layer)
CREATE TABLE IF NOT EXISTS exam_proctoring_sessions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
    assignment_id uuid REFERENCES exam_assignments (id) ON DELETE CASCADE,
    mobile_connected boolean DEFAULT false,
    last_ping timestamp
    with
        time zone DEFAULT now(),
        created_at timestamp
    with
        time zone DEFAULT now(),
        CONSTRAINT unique_assignment_proctoring UNIQUE (assignment_id)
);

-- Enable RLS
ALTER TABLE exam_proctoring_sessions ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Admins can view/update all
CREATE POLICY "Admins can manage proctoring sessions" ON exam_proctoring_sessions FOR ALL USING (
    (
        auth.jwt () -> 'user_metadata' ->> 'role'
    ) = 'ADMIN'
);

-- 2. Candidates can view/update their OWN session (derived from assignment)
CREATE POLICY "Candidates can manage own proctoring session" ON exam_proctoring_sessions FOR ALL USING (
    assignment_id IN (
        SELECT id
        FROM exam_assignments
        WHERE
            candidate_id = auth.uid ()
    )
);

-- Allow anonymous access for the mobile device?
-- The mobile device is technically authenticated via the "token" which maps to the user.
-- However, the mobile page uses the client-side supabase client which might be anonymous or use a temporary token.
-- If the mobile page doesn't sign in via Supabase Auth, RLS will block it.
-- The Mobile page `ConnectContent.tsx` uses `supabaseClient`.
-- If the mobile device isn't logged in (it just scanned a QR), it won't have `auth.uid()`.
-- The user prompt says: "Validate Token with Backend". The `mobile-auth` endpoint does this.
-- So the Mobile device relies on the *Server Action / API Route* to perform the DB updates.
-- The API Route (`/api/third-eye/connect`) runs on the server, so it can use `supabaseAdmin` to bypass RLS.
-- Therefore, we don't need public RLS policies for the table, provided the API does the updates.
-- BUT, the Laptop (authenticated candidate) needs to READ this table via Realtime.
-- So the "Candidates can manage own proctoring session" policy enables the Laptop to subscribe.

-- Enable Realtime
alter publication supabase_realtime
add
table exam_proctoring_sessions;