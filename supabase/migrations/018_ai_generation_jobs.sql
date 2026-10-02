-- 018: async AI generation jobs (tailor-cv moved off Vercel's 60s function cap).
--
-- Vercel Hobby hard-caps every serverless function at 60s regardless of maxDuration.
-- tailor-cv's own Claude call occasionally exceeds that, which the client sees as a 504 —
-- lowering max_tokens to "fit" risks truncating long/2-page CVs instead. The fix: the
-- actual generation now runs on Railway (no such cap). Vercel's /start route creates a
-- row here and hands the job to Railway, which works it asynchronously; Vercel's /status
-- route is a fast poll that only reads Railway's in-memory job state — each call is well
-- under 60s regardless of how long the generation itself takes.
--
-- `charged` guards against double-charging across concurrent/retried polls: only the poll
-- that flips charged false->true actually calls check_and_deduct_credits; every poll after
-- that reads the cached `result` column instead of re-charging.
--
-- RUN THIS BEFORE deploying the code that calls tailor-cv/start and tailor-cv/status.

CREATE TABLE IF NOT EXISTS public.ai_generation_jobs (
  id          uuid PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind        text NOT NULL,              -- 'tailor_cv'
  cost        integer NOT NULL,
  action      text NOT NULL,               -- usage_events.action to charge under
  market      text NOT NULL,
  job_key     text,
  charged     boolean NOT NULL DEFAULT false,
  result      jsonb,                       -- cached response, set once charged
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_generation_jobs_user_id_idx ON public.ai_generation_jobs(user_id);

ALTER TABLE public.ai_generation_jobs ENABLE ROW LEVEL SECURITY;

-- Only the service role (admin client) reads/writes this table — it never goes through
-- the anon client, so no user-facing policy is needed beyond denying anon access by default.

-- Stale jobs (abandoned client, never polled to completion) are harmless but should not
-- accumulate forever — cron cleanup can delete rows older than 24h; not wired up here.

NOTIFY pgrst, 'reload schema';

-- Rollback:
-- DROP TABLE IF EXISTS public.ai_generation_jobs;
