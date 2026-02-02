-- Add OTP columns to candidate_profiles
ALTER TABLE public.candidate_profiles
ADD COLUMN IF NOT EXISTS phone_otp_hash text,
ADD COLUMN IF NOT EXISTS phone_otp_expires_at timestamp
with
    time zone,
ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false;

-- Ensure phone column exists (it should, but just in case)
ALTER TABLE public.candidate_profiles
ADD COLUMN IF NOT EXISTS phone text;