-- Phase 3: Interview System Schema

-- A. Interviews Table
CREATE TABLE IF NOT EXISTS interviews (
    id UUID DEFAULT gen_random_uuid () PRIMARY KEY,
    application_id UUID REFERENCES applications (id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
    scheduled_at TIMESTAMP
    WITH
        TIME ZONE NOT NULL,
        duration_minutes INT NOT NULL DEFAULT 30,
        mode TEXT NOT NULL CHECK (mode IN ('AI', 'MANUAL')) DEFAULT 'AI',
        status TEXT NOT NULL CHECK (
            status IN (
                'scheduled',
                'in_progress',
                'completed',
                'no_show',
                'auto_failed',
                'cancelled'
            )
        ) DEFAULT 'scheduled',
        created_by UUID REFERENCES auth.users (id),
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT now(),
        score INT, -- Final score (0-100)
        ai_feedback TEXT, -- Overall AI summary
        recording_url TEXT -- Optional: Full recording URL
);

-- B. Interview Questions Table
CREATE TABLE IF NOT EXISTS interview_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('behavioral', 'technical', 'coding', 'general')),
    expected_keywords TEXT[], -- Array of strings
    marks INT DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- C. Interview Responses Table
CREATE TABLE IF NOT EXISTS interview_responses (
    id UUID DEFAULT gen_random_uuid () PRIMARY KEY,
    interview_id UUID REFERENCES interviews (id) ON DELETE CASCADE,
    question_id UUID REFERENCES interview_questions (id) ON DELETE CASCADE,
    answer_text TEXT,
    answer_audio_url TEXT,
    score INT, -- Score for this specific question
    ai_feedback TEXT, -- Feedback for this specific answer
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT now()
);

-- D. Row Level Security (RLS)

-- Enable RLS
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

ALTER TABLE interview_questions ENABLE ROW LEVEL SECURITY;

ALTER TABLE interview_responses ENABLE ROW LEVEL SECURITY;

-- Policies for INTERVIEWS
-- Admin can view all
CREATE POLICY "Admins can view all interviews" ON interviews FOR
SELECT USING (
        auth.uid () IN (
            SELECT id
            FROM public.users
            WHERE
                role = 'ADMIN' -- Assuming a way to check admin, or relying on service role for admin apps
            UNION
            SELECT created_by
            FROM interviews -- Creator access
        )
    );

-- Candidates can view ONLY their own interviews
CREATE POLICY "Candidates can view own interviews" ON interviews FOR
SELECT USING (auth.uid () = candidate_id);

-- Admins can insert/update
CREATE POLICY "Admins can insert interviews" ON interviews FOR
INSERT
WITH
    CHECK (true);
-- Service role usually bypasses, but good for explicit admin checks if needed

CREATE POLICY "Admins can update interviews" ON interviews FOR
UPDATE USING (true);
-- Simplified, usually service role handles admin updates

-- Policies for INTERVIEW_QUESTIONS
-- Candidates can view questions valid for their interview
CREATE POLICY "Candidates can view questions for their interview" ON interview_questions FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM interviews
            WHERE
                interviews.id = interview_questions.interview_id
                AND interviews.candidate_id = auth.uid ()
        )
    );

-- Policies for INTERVIEW_RESPONSES
-- Candidates can insert their own responses
CREATE POLICY "Candidates can insert own responses" ON interview_responses FOR
INSERT
WITH
    CHECK (
        EXISTS (
            SELECT 1
            FROM interviews
            WHERE
                interviews.id = interview_responses.interview_id
                AND interviews.candidate_id = auth.uid ()
        )
    );

-- Candidates can view their own responses
CREATE POLICY "Candidates can view own responses" ON interview_responses FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM interviews
            WHERE
                interviews.id = interview_responses.interview_id
                AND interviews.candidate_id = auth.uid ()
        )
    );

-- Indexes for performance
CREATE INDEX idx_interviews_candidate_id ON interviews (candidate_id);

CREATE INDEX idx_interviews_application_id ON interviews (application_id);

CREATE INDEX idx_questions_interview_id ON interview_questions (interview_id);

CREATE INDEX idx_responses_interview_id ON interview_responses (interview_id);