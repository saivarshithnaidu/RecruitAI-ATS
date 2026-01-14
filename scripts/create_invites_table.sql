-- Create invites table for tracking admin invites
CREATE TABLE IF NOT EXISTS invites (
    id UUID DEFAULT gen_random_uuid () PRIMARY KEY,
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    sent_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT now(),
        clicked BOOLEAN DEFAULT false,
        clicked_at TIMESTAMP
    WITH
        TIME ZONE
);