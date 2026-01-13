-- Fix RLS policies for profiles table
-- Attempt to fix "new row violates row-level security policy for table profiles"

-- 1. Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts (if any exist but weren't seen)
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

DROP POLICY IF EXISTS "Service Role can do everything" ON profiles;

-- 3. Create Policy for Users (Authenticated)
-- Allows users to INSERT their own profile row (auth.uid = id)
CREATE POLICY "Users can insert their own profile" ON profiles FOR
INSERT
WITH
    CHECK (auth.uid () = id);

-- Allows users to UPDATE their own profile row
CREATE POLICY "Users can update their own profile" ON profiles FOR
UPDATE USING (auth.uid () = id);

-- Allows users to SELECT their own profile row
CREATE POLICY "Users can view their own profile" ON profiles FOR
SELECT USING (auth.uid () = id);

-- 4. Create Policy for Service Role (Admin/Backend)
-- Explicitly allow the service_role to do anything. usually this is automatic,
-- but explicit policy ensures it works even if BYPASSRLS is weirdly configured.
CREATE POLICY "Service Role can do everything" ON profiles FOR ALL USING (auth.role () = 'service_role')
WITH
    CHECK (auth.role () = 'service_role');

-- 5. Grant permissions to roles (Idempotent)
GRANT ALL ON profiles TO service_role;

GRANT ALL ON profiles TO postgres;

GRANT SELECT, INSERT , UPDATE ON profiles TO authenticated;

GRANT SELECT, INSERT , UPDATE ON profiles TO anon;
-- Needed if operating as anon initially? Unlikely but safe if policy restricts.