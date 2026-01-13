-- Add Proctoring Columns to exam_assignments
-- For Camera/Mic check and Malpractice flags

ALTER TABLE exam_assignments
ADD COLUMN IF NOT EXISTS camera_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS mic_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS flagged boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS proctoring_data jsonb DEFAULT '{}';

-- Ensure candidates can UPDATE these columns (Policy update likely needed if they only had UPDATE on 'status')
-- Existing policy: "Candidates can update own assignments" USING (candidate_id = auth.uid()) matches everything. So we are good.