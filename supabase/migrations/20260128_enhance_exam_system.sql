-- Migration to enhance exam system with scheduling and proctoring
-- Run this via Supabase SQL Editor

-- 1. Add scheduling and proctoring columns to exam_assignments
ALTER TABLE exam_assignments
ADD COLUMN IF NOT EXISTS scheduled_start_time timestamp
with
    time zone,
ADD COLUMN IF NOT EXISTS duration_override_minutes int, -- Optional override for specific candidate
ADD COLUMN IF NOT EXISTS proctoring_config jsonb DEFAULT '{"camera":false,"mic":false,"tab_switch":true,"copy_paste":true}';

-- 2. Update status check constraint to include new statuses
ALTER TABLE exam_assignments
DROP CONSTRAINT IF EXISTS exam_assignments_status_check;

ALTER TABLE exam_assignments
ADD CONSTRAINT exam_assignments_status_check CHECK (
    status IN (
        'assigned',
        'in_progress',
        'completed',
        'passed',
        'failed',
        'terminated', -- Admin terminated
        'flagged' -- Malpractice flag
    )
);

-- 3. Ensure RLS allows reading these new columns (Implicit in "SELECT *" policies, but good practice to verify)
-- Existing policies cover full row access, so no change needed.