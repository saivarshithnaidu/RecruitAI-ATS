-- Phase 2 Update: Async Exam Generation Status
-- Run this in your Supabase SQL Editor

ALTER TABLE exams
ADD COLUMN IF NOT EXISTS status text CHECK (
    status IN (
        'DRAFT',
        'GENERATING',
        'READY',
        'AI_FAILED'
    )
) DEFAULT 'DRAFT',
ADD COLUMN IF NOT EXISTS error_message text;

-- Update existing exams to READY if they have questions, otherwise DRAFT
UPDATE exams
SET
    status = 'READY'
WHERE
    id IN (
        SELECT exam_id
        FROM exam_questions
    );

UPDATE exams SET status = 'DRAFT' WHERE status IS NULL;