-- Phase 4: Admin & OTP Fixes

-- 1. Create email_otps table (Strict Request)
CREATE TABLE IF NOT EXISTS email_otps (
    id UUID DEFAULT gen_random_uuid () PRIMARY KEY,
    user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    expires_at TIMESTAMP
    WITH
        TIME ZONE NOT NULL,
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT now()
);

-- 2. Create sms_otps table (Strict Request)
CREATE TABLE IF NOT EXISTS sms_otps (
    id UUID DEFAULT gen_random_uuid () PRIMARY KEY,
    user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    expires_at TIMESTAMP
    WITH
        TIME ZONE NOT NULL,
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT now()
);

-- 3. Enable RLS for OTP tables
ALTER TABLE email_otps ENABLE ROW LEVEL SECURITY;

ALTER TABLE sms_otps ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies (Service Role Access is enough for API, but for safety)
CREATE POLICY "Users can insert own email otp" ON email_otps FOR
INSERT
WITH
    CHECK (auth.uid () = user_id);

CREATE POLICY "Users can insert own sms otp" ON sms_otps FOR
INSERT
WITH
    CHECK (auth.uid () = user_id);
-- No Select policy needed if verification is done via Server Action with Service Role,
-- but if client needs it: "Users can read own otps"
CREATE POLICY "Users can select own email otp" ON email_otps FOR
SELECT USING (auth.uid () = user_id);

CREATE POLICY "Users can select own sms otp" ON sms_otps FOR
SELECT USING (auth.uid () = user_id);

-- 5. Ensure candidate_profiles has all columns (Idempotent check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidate_profiles' AND column_name = 'phone') THEN
        ALTER TABLE candidate_profiles ADD COLUMN phone TEXT;

END IF;

END $$;