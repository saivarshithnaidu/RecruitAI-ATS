-- Create table for storing video recordings metadata
CREATE TABLE IF NOT EXISTS exam_recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_assignment_id UUID NOT NULL, -- Logical link to the exam attempt
  candidate_id UUID, 
  video_path TEXT NOT NULL,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for storing proctoring events log
CREATE TABLE IF NOT EXISTS exam_proctor_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_assignment_id UUID NOT NULL,
  candidate_id UUID,
  event_type TEXT NOT NULL, -- e.g. TAB_SWITCH, CAM_OFF
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS) if you want, but for now we rely on server-side logging.
-- ALTER TABLE exam_recordings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE exam_proctor_logs ENABLE ROW LEVEL SECURITY;
