-- 1. Create Proctor Logs Table (Audit Trail)
CREATE TABLE IF NOT EXISTS exam_proctor_logs (
    id UUID DEFAULT gen_random_uuid () PRIMARY KEY,
    exam_assignment_id UUID NOT NULL,
    candidate_id UUID,
    event_type TEXT NOT NULL, -- e.g. TAB_SWITCH, CAM_DISCONNECT, MIC_MUTE
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Update exam_proctoring_sessions for Real-time State
-- Ensure table exists first (it should from previous setup)
CREATE TABLE IF NOT EXISTS exam_proctoring_sessions (
    id UUID DEFAULT uuid_generate_v4 () PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES exam_assignments (id),
    -- Add columns if they don't exist
    last_heartbeat TIMESTAMPTZ,
    camera_active BOOLEAN DEFAULT false,
    mic_active BOOLEAN DEFAULT false,
    tab_violation_count INTEGER DEFAULT 0,
    proctoring_score INTEGER DEFAULT 100, -- Risk Score (100 = Low Risk, 0 = High Risk)
    status TEXT DEFAULT 'active' -- active, paused, completed
);

-- Add columns if table exists (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_proctoring_sessions' AND column_name = 'proctoring_score') THEN
        ALTER TABLE exam_proctoring_sessions ADD COLUMN proctoring_score INTEGER DEFAULT 100;
        ALTER TABLE exam_proctoring_sessions ADD COLUMN tab_violation_count INTEGER DEFAULT 0;
        ALTER TABLE exam_proctoring_sessions ADD COLUMN camera_active BOOLEAN DEFAULT false;
        ALTER TABLE exam_proctoring_sessions ADD COLUMN mic_active BOOLEAN DEFAULT false;
        ALTER TABLE exam_proctoring_sessions ADD COLUMN last_heartbeat TIMESTAMPTZ;
    END IF;
END $$;