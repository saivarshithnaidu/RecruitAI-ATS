-- Create applications table (replacing/aliasing candidates for accurate resume upload)
CREATE TABLE IF NOT EXISTS applications (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
    full_name text NOT NULL,
    email text NOT NULL,
    phone text,
    resume_path text,
    resume_url text, -- Helper column for easy access, though signed URLs expire
    ats_score integer,
    ats_summary text,
    status text DEFAULT 'submitted',
    created_at timestamp
    with
        time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Create users table (for NextAuth)
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
    name text,
    email text UNIQUE NOT NULL,
    image text,
    role text,
    password_hash text,
    created_at timestamp
    with
        time zone DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create profiles table (User Context)
CREATE TABLE IF NOT EXISTS profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id),
    user_id uuid REFERENCES auth.users(id), -- Redundant but requested in prompt, usually id is enough
    full_name text,
    email text,
    email_verified boolean DEFAULT false,
    verification_token text,
    mobile_number text,
    education jsonb, -- Storing object { degree, college, year }
    skills text[],
    preferred_job_roles text[],
    summary text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Add linking to applications
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES profiles (id);
-- Note: existing applications won't have this, ensure code handles nullable profile_id

-- 1. Add verification columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS profile_verified boolean DEFAULT false;

-- 2. Create OTP Verifications table
CREATE TABLE IF NOT EXISTS otp_verifications (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
    user_id uuid REFERENCES auth.users (id) NOT NULL,
    type text NOT NULL CHECK (type IN ('email', 'phone')),
    otp_hash text NOT NULL,
    expires_at timestamp
    with
        time zone NOT NULL,
        created_at timestamp
    with
        time zone DEFAULT now()
);

-- 3. RLS for OTPs
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own OTPs" ON otp_verifications FOR
INSERT
WITH
    CHECK (auth.uid () = user_id);

CREATE POLICY "Users can view their own OTPs" ON otp_verifications FOR
SELECT USING (auth.uid () = user_id);