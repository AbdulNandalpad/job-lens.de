-- ============================================================
-- 014_job_case_recruiter_interest.sql
-- Fixes /api/job-case/recruiter-interest, which has referenced these
-- columns and status value since it was written but they were never
-- actually added to the schema — every call to that route has been
-- throwing a Postgres error (undefined column / CHECK violation).
--
-- recruiter_email is genuinely sensitive PII (unlike case_views'
-- other fields, which are hashed/domain-only), so it's encrypted at
-- the application level (src/lib/encryption.ts, same AES-256-GCM
-- scheme as migrations 012/013) before being written. It's never
-- read back for display — recruiter-interest forwards it to the
-- candidate by email in the same request — so no decrypt path is
-- needed elsewhere.
-- ============================================================

ALTER TABLE public.case_views
  ADD COLUMN IF NOT EXISTS recruiter_email       TEXT,
  ADD COLUMN IF NOT EXISTS interest_expressed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consent_given_at      TIMESTAMPTZ;

ALTER TABLE public.job_cases DROP CONSTRAINT IF EXISTS job_cases_status_check;
ALTER TABLE public.job_cases ADD CONSTRAINT job_cases_status_check
  CHECK (status IN ('active', 'deleted', 'expired', 'interested'));
