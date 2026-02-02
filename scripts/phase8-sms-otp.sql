-- Create phone_otps table for tracking SMS OTPs
CREATE TABLE IF NOT EXISTS public.phone_otps (
    id uuid DEFAULT gen_random_uuid () PRIMARY KEY,
    phone text NOT NULL UNIQUE, -- One active OTP record per phone
    otp_hash text NOT NULL,
    expires_at timestamp
    with
        time zone NOT NULL,
        attempts int DEFAULT 0,
        verified boolean DEFAULT false,
        created_at timestamp
    with
        time zone DEFAULT now(),
        updated_at timestamp
    with
        time zone DEFAULT now()
);

-- Index for phone lookups
CREATE INDEX IF NOT EXISTS idx_phone_otps_phone ON public.phone_otps (phone);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_phone_otps_updated_at ON public.phone_otps;

CREATE TRIGGER update_phone_otps_updated_at
BEFORE UPDATE ON public.phone_otps
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();