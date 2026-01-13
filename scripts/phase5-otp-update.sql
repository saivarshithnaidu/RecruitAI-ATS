-- Phase 5: OTP Channel Tracking
-- Run this in Supabase SQL Editor

-- 1. Add otp_channel to sms_otps
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sms_otps' AND column_name = 'otp_channel') THEN
        ALTER TABLE sms_otps ADD COLUMN otp_channel TEXT DEFAULT 'whatsapp';
    END IF;
END $$;

-- 2. Add otp_channel to email_otps (for consistency)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_otps' AND column_name = 'otp_channel') THEN
        ALTER TABLE email_otps ADD COLUMN otp_channel TEXT DEFAULT 'email';
    END IF;
END $$;