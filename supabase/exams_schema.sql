-- EXAM SYSTEM SCHEMA (Phase 2) - IDEMPOTENT / FIXED

-- 1. Exams Table
CREATE TABLE IF NOT EXISTS exams (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
    title text NOT NULL,
    description text,
    role text NOT NULL,
    difficulty text NOT NULL,
    duration_minutes int NOT NULL DEFAULT 60,
    pass_mark int NOT NULL DEFAULT 40,
    created_by uuid REFERENCES auth.users (id),
    created_at timestamp
    with
        time zone DEFAULT now()
);

-- 2. Exam Questions Table
CREATE TABLE IF NOT EXISTS exam_questions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
    exam_id uuid REFERENCES exams (id) ON DELETE CASCADE,
    question text NOT NULL,
    options jsonb, -- Array of strings for MCQs, null for others
    correct_answer text, -- For MCQs and short answers
    type text CHECK (
        type IN ('mcq', 'short', 'coding')
    ),
    marks int NOT NULL DEFAULT 1
);

-- 3. Exam Assignments Table
CREATE TABLE IF NOT EXISTS exam_assignments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
    exam_id uuid REFERENCES exams (id) ON DELETE CASCADE,
    candidate_id uuid REFERENCES auth.users (id),
    status text CHECK (
        status IN (
            'assigned',
            'in_progress',
            'completed',
            'passed',
            'failed'
        )
    ) DEFAULT 'assigned',
    score int DEFAULT 0,
    started_at timestamp
    with
        time zone,
        submitted_at timestamp
    with
        time zone,
        answers jsonb, -- Store candidate answers: { question_id: answer }
        created_at timestamp
    with
        time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;

ALTER TABLE exam_assignments ENABLE ROW LEVEL SECURITY;

-- POLICIES (Drop first to ensure clean update)

-- DROP existing policies to avoid "already exists" errors and ensure correct logic
DROP POLICY IF EXISTS "Admins can do everything on exams" ON exams;

DROP POLICY IF EXISTS "Admins can do everything on exam_questions" ON exam_questions;

DROP POLICY IF EXISTS "Admins can do everything on exam_assignments" ON exam_assignments;

DROP POLICY IF EXISTS "Candidates can view assigned exams" ON exams;

DROP POLICY IF EXISTS "Candidates can view questions for assigned exams" ON exam_questions;

DROP POLICY IF EXISTS "Candidates can view own assignments" ON exam_assignments;

DROP POLICY IF EXISTS "Candidates can update own assignments" ON exam_assignments;

-- Policy: Admins can do everything
-- Using auth.jwt() -> 'user_metadata' ->> 'role' to check for ADMIN role
CREATE POLICY "Admins can do everything on exams" ON exams FOR ALL USING (
    (
        auth.jwt () -> 'user_metadata' ->> 'role'
    ) = 'ADMIN'
);

CREATE POLICY "Admins can do everything on exam_questions" ON exam_questions FOR ALL USING (
    (
        auth.jwt () -> 'user_metadata' ->> 'role'
    ) = 'ADMIN'
);

CREATE POLICY "Admins can do everything on exam_assignments" ON exam_assignments FOR ALL USING (
    (
        auth.jwt () -> 'user_metadata' ->> 'role'
    ) = 'ADMIN'
);

-- Policy: Candidates can view assigned exams
CREATE POLICY "Candidates can view assigned exams" ON exams FOR
SELECT USING (
        id IN (
            SELECT exam_id
            FROM exam_assignments
            WHERE
                candidate_id = auth.uid ()
        )
    );

CREATE POLICY "Candidates can view questions for assigned exams" ON exam_questions FOR
SELECT USING (
        exam_id IN (
            SELECT exam_id
            FROM exam_assignments
            WHERE
                candidate_id = auth.uid ()
        )
    );

-- Policy: Candidates can view and update their own assignments
CREATE POLICY "Candidates can view own assignments" ON exam_assignments FOR
SELECT USING (candidate_id = auth.uid ());

CREATE POLICY "Candidates can update own assignments" ON exam_assignments FOR
UPDATE USING (candidate_id = auth.uid ());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_exam_assignments_candidate ON exam_assignments (candidate_id);

CREATE INDEX IF NOT EXISTS idx_exam_assignments_status ON exam_assignments (status);