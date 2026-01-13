-- Fix RLS Policies for Exams Table
-- The previous policies likely referenced a non-existent 'users' table.

-- 1. Enable RLS (Ensure it's enabled)
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

-- 2. Drop Old Policies (Best effort guess at names, or drop ALL)
DROP POLICY IF EXISTS "Admin create exams" ON exams;

DROP POLICY IF EXISTS "Admin update exams" ON exams;

DROP POLICY IF EXISTS "Admin delete exams" ON exams;

DROP POLICY IF EXISTS "Everyone read exams" ON exams;

DROP POLICY IF EXISTS "Authenticated read exams" ON exams;

DROP POLICY IF EXISTS "Admin full access" ON exams;

DROP POLICY IF EXISTS "Enable read access for all users" ON exams;

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON exams;

-- 3. Create New Policies using admin_whitelist

-- SELECT: Allow all authenticated users to read exams (Candidates need to see titles, etc.)
CREATE POLICY "Authenticated read exams" ON exams FOR
SELECT TO authenticated USING (true);

-- INSERT: Only Admins in Whitelist
CREATE POLICY "Admin insert exams" ON exams FOR
INSERT
    TO authenticated
WITH
    CHECK (
        EXISTS (
            SELECT 1
            FROM admin_whitelist
            WHERE
                email = auth.jwt () ->> 'email'
        )
    );

-- UPDATE: Only Admins in Whitelist
CREATE POLICY "Admin update exams" ON exams FOR
UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM admin_whitelist
        WHERE
            email = auth.jwt () ->> 'email'
    )
);

-- DELETE: Only Admins in Whitelist
CREATE POLICY "Admin delete exams" ON exams FOR DELETE TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM admin_whitelist
        WHERE
            email = auth.jwt () ->> 'email'
    )
);

-- Fix Exam Questions RLS as distinct measure (Legacy, but good to have)
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage questions" ON exam_questions;

DROP POLICY IF EXISTS "Authenticated read questions" ON exam_questions;

CREATE POLICY "Admin manage questions" ON exam_questions FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM admin_whitelist
        WHERE
            email = auth.jwt () ->> 'email'
    )
);

CREATE POLICY "Authenticated read questions" ON exam_questions FOR
SELECT TO authenticated USING (true);