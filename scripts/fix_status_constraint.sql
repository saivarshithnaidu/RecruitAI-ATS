-- Fix Applications Status Constraint to include all variations
-- Run this in Supabase SQL Editor

ALTER TABLE applications
DROP CONSTRAINT IF EXISTS applications_status_check;

ALTER TABLE applications
ADD CONSTRAINT applications_status_check CHECK (
    status IN (
        'APPLIED',
        'applied',
        'SUBMITTED',
        'submitted',
        'PARSE_FAILED',
        'parse_failed',
        'Parse Failed',
        'SCORED_AI',
        'SCORED_FALLBACK',
        'SHORTLISTED',
        'shortlisted',
        'REJECTED',
        'rejected',
        'EXAM_ASSIGNED',
        'exam_assigned',
        'EXAM_PASSED',
        'exam_passed',
        'EXAM_FAILED',
        'exam_failed',
        'INTERVIEW',
        'interview',
        'HIRED',
        'hired',
        'WITHDRAWN',
        'withdrawn',
        'WITHDRAWN_BY_CANDIDATE',
        'WITHDRAWN_BY_ADMIN',
        'DELETED',
        'deleted'
    )
);