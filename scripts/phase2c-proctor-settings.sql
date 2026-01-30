-- Phase 2c: Proctoring Settings
-- Run this in Supabase SQL Editor

-- 1. Add proctor_settings to exams table
ALTER TABLE exams
ADD COLUMN IF NOT EXISTS proctor_settings jsonb DEFAULT '{"require_laptop_camera": true, "require_mobile_camera": false, "require_audio": true, "strict_mode": true}'::jsonb;

-- 2. Add admin controls to exam_assignments
ALTER TABLE exam_assignments
ADD COLUMN IF NOT EXISTS admin_status text CHECK (
    admin_status IN (
        'active',
        'paused',
        'terminated'
    )
) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS admin_remarks text,
ADD COLUMN IF NOT EXISTS last_admin_action_at timestamp
with
    time zone;

-- 3. Log table for admin actions (optional, or use existing logs)
-- We'll use exam_proctor_logs for Admin actions too, with event_type = 'ADMIN_ACTION'