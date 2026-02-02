-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create Colleges Table
CREATE TABLE IF NOT EXISTS public.colleges (
    id uuid DEFAULT gen_random_uuid () PRIMARY KEY,
    name text NOT NULL,
    state text DEFAULT 'Andhra Pradesh',
    district text,
    city text,
    university text,
    type text, -- Engineering, Degree, Medical, etc.
    approved_by text, -- AICTE, UGC, etc.
    status text DEFAULT 'active',
    created_at timestamp
    with
        time zone DEFAULT now()
);

-- Indexes for Search
CREATE INDEX IF NOT EXISTS idx_colleges_name_trigram ON public.colleges USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_colleges_district ON public.colleges (district);

CREATE INDEX IF NOT EXISTS idx_colleges_state ON public.colleges (state);

-- Enable RLS
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read
CREATE POLICY "Public Read Access" ON public.colleges FOR
SELECT USING (true);

-- Policy: Only Admins can insert/update (if needed later)
-- For now, seed script will handle insertion.