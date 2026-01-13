-- Phase 3 Fix: Add Verification Columns to Profiles

-- 1. Ensure `profiles` has the verification columns
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verified_by_admin BOOLEAN DEFAULT FALSE;

-- 2. Optional: Backfill data for existing users (set to true for testing if needed, or leave false)
-- UPDATE profiles SET email_verified = TRUE WHERE email_verified IS NULL;

-- 3. Check for 'candidates' table confusion.
-- If you have a 'candidates' table, we might need to sync it, but 'profiles' is usually the source of truth for auth-related status.

-- 4. Enable RLS for these columns if needed (Policies already exist for profiles)