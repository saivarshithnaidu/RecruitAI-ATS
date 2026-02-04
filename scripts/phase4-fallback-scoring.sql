-- Migration: Add Fallback Scoring Columns

ALTER TABLE applications
ADD COLUMN IF NOT EXISTS fallback_used boolean DEFAULT false;

ALTER TABLE applications ADD COLUMN IF NOT EXISTS parse_status text;