-- ============================================================
-- 005_job_case_functions.sql
-- Helper DB functions for the Job Case feature.
-- ============================================================

-- Atomically increments view_count on job_cases.
-- Called by /api/job-case/access/[token] after token validation.
CREATE OR REPLACE FUNCTION increment_case_view_count(case_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE job_cases
  SET view_count = view_count + 1
  WHERE id = case_id AND status = 'active';
END;
$$;

-- Grant execution to service role only (no anon/authenticated access)
REVOKE ALL ON FUNCTION increment_case_view_count FROM PUBLIC;
REVOKE ALL ON FUNCTION increment_case_view_count FROM anon;
REVOKE ALL ON FUNCTION increment_case_view_count FROM authenticated;
