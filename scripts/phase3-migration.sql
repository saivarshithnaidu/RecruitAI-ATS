-- Phase 3: Separate Candidate Profiles Table
-- Run this in your Supabase SQL Editor

-- 1. Create the table
CREATE TABLE IF NOT EXISTS candidate_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    education JSONB,
    skills TEXT[],
    preferred_roles TEXT[],
    summary TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    verified_by_admin BOOLEAN DEFAULT FALSE,
    verification_status TEXT DEFAULT 'pending', -- pending | verified | rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies

-- Policy: Admin can read all
-- Note: Service Role bypasses RLS, but if you query via client with role 'ADMIN', this is needed.
-- Policy: Admin can read all profiles
-- REMOVED: Since `public.profiles` does not have a `role` column (roles are in `lib/roles.ts`),
-- and Admin Actions use `supabaseAdmin` (Service Role) which bypasses RLS,
-- this policy is removed to prevent "column role does not exist" error.
-- If client-side Admin access is needed later, add a `role` column to profiles first.

-- Policy: Candidates can read own
CREATE POLICY "Users can read own profile" ON candidate_profiles FOR
SELECT USING (auth.uid () = user_id);

-- Policy: Candidates can update own
CREATE POLICY "Users can update own profile" ON candidate_profiles FOR
UPDATE USING (auth.uid () = user_id);

-- Policy: Users can insert own (for potential client-side creation)
CREATE POLICY "Users can insert own profile" ON candidate_profiles FOR
INSERT
WITH
    CHECK (auth.uid () = user_id);