-- Phase 2B: Secure Exam System Tables

-- 1. Create Admin Whitelist Table for RLS (Since roles are dynamic in code, we need a DB source for RLS)
CREATE TABLE IF NOT EXISTS admin_whitelist (email TEXT PRIMARY KEY);

-- Insert default admin (Idempotent)
INSERT INTO
    admin_whitelist (email)
VALUES ('recruitai@company.com') ON CONFLICT (email) DO NOTHING;

ALTER TABLE admin_whitelist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read whitelist" ON admin_whitelist;

CREATE POLICY "Read whitelist" ON admin_whitelist FOR
SELECT TO authenticated USING (true);

-- 2. Exam Violations (Tracks malpractice events)
CREATE TABLE IF NOT EXISTS exam_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    assignment_id UUID REFERENCES exam_assignments (id) ON DELETE CASCADE,
    violation_type TEXT NOT NULL, -- 'tab_switch', 'fullscreen_exit', 'camera_off', 'mic_mute', 'multiple_faces', 'dev_tools'
    violation_timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- 3. Coding Submissions (Stores candidate code)
CREATE TABLE IF NOT EXISTS coding_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    assignment_id UUID REFERENCES exam_assignments (id) ON DELETE CASCADE,
    question_idx INTEGER NOT NULL, -- Index 0, 1 etc relative to coding section
    code TEXT,
    language TEXT, -- 'python', 'javascript', 'java', 'cpp'
    test_cases_passed INTEGER DEFAULT 0,
    total_test_cases INTEGER DEFAULT 0,
    status TEXT DEFAULT 'submitted', -- 'passed', 'failed', 'error'
    output_log TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Extend Exam Tables
ALTER TABLE exam_assignments
ADD COLUMN IF NOT EXISTS violation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add JSONB column to exams for storing complex 3-section structure (Aptitude, Verbal, Coding)
ALTER TABLE exams ADD COLUMN IF NOT EXISTS questions_data JSONB;

-- 5. Enable RLS
ALTER TABLE exam_violations ENABLE ROW LEVEL SECURITY;

ALTER TABLE coding_submissions ENABLE ROW LEVEL SECURITY;

-- 6. Strict RLS Policies
-- Violations: Admin View All, Candidate Insert
DROP POLICY IF EXISTS "Admin view violations" ON exam_violations;

CREATE POLICY "Admin view violations" ON exam_violations FOR
SELECT TO authenticated USING (
        -- Check if user's email is in whitelist. 
        EXISTS (
            SELECT 1
            FROM admin_whitelist
            WHERE
                email = auth.jwt () ->> 'email'
        )
    );

DROP POLICY IF EXISTS "Candidate insert violations" ON exam_violations;

CREATE POLICY "Candidate insert violations" ON exam_violations FOR
INSERT
    TO authenticated
WITH
    CHECK (
        EXISTS (
            SELECT 1
            FROM exam_assignments ea
            WHERE
                ea.id = assignment_id
                AND ea.candidate_id = auth.uid ()
        )
    );

-- Coding Submissions: Admin View All, Candidate CRUD Own
DROP POLICY IF EXISTS "Admin view coding" ON coding_submissions;

CREATE POLICY "Admin view coding" ON coding_submissions FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM admin_whitelist
            WHERE
                email = auth.jwt () ->> 'email'
        )
    );

DROP POLICY IF EXISTS "Candidate manage coding" ON coding_submissions;

CREATE POLICY "Candidate manage coding" ON coding_submissions FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM exam_assignments ea
        WHERE
            ea.id = coding_submissions.assignment_id
            AND ea.candidate_id = auth.uid ()
    )
);