-- PHASE 8: Exam System Updates (Slots + Code Analysis)

-- 1. Create Exam Slots Table
CREATE TABLE IF NOT EXISTS exam_slots (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
    exam_id uuid REFERENCES exams (id) ON DELETE CASCADE,
    start_time timestamp
    with
        time zone NOT NULL,
        end_time timestamp
    with
        time zone NOT NULL,
        max_candidates int DEFAULT 10,
        created_at timestamp
    with
        time zone DEFAULT now()
);

-- Enable RLS for Slots
ALTER TABLE exam_slots ENABLE ROW LEVEL SECURITY;

-- Policies for Slots
DROP POLICY IF EXISTS "Admins can manage exam slots" ON exam_slots;

CREATE POLICY "Admins can manage exam slots" ON exam_slots FOR ALL USING (
    (
        auth.jwt () -> 'user_metadata' ->> 'role'
    ) = 'ADMIN'
);

DROP POLICY IF EXISTS "Candidates can view slots for their exams" ON exam_slots;

CREATE POLICY "Candidates can view slots for their exams" ON exam_slots FOR
SELECT USING (
        true
        -- Ideally strictly scoped, but for selection UI we might need broad read
        -- OR scope to exams assigned to them.
        -- For now, open read for authenticated users is acceptable for slots, 
        -- as long as they can't see who is in them (which is separate).
    );

-- 2. Update Exam Assignments to link to a Slot
ALTER TABLE exam_assignments
ADD COLUMN IF NOT EXISTS slot_id uuid REFERENCES exam_slots (id);

-- 3. Update Exam Questions (Optional, just ensuring fields exist for Code Analysis)
-- Code Analysis questions will be stored in 'questions_data' JSONB in 'exams' table mainly,
-- or 'exam_questions' table rows.
-- The existing 'type' check constraint might need update if we add new explicit types,
-- but 'coding' type can be reused with a subtype in JSON options.
-- Let's check existing check constraint on exam_questions.type
-- Existing: CHECK (type IN ('mcq', 'short', 'coding'))
-- We will REUSE 'coding' type but change the content structure to be "Code Analysis".
-- So no schema change strictly needed for questions if we reuse 'coding'.

-- 4. Index for performance
CREATE INDEX IF NOT EXISTS idx_exam_slots_exam_id ON exam_slots (exam_id);

CREATE INDEX IF NOT EXISTS idx_exam_assignments_slot_id ON exam_assignments (slot_id);