-- 015: server-enforced "application package" pricing.
-- Adds usage_events.job_key so the server can decide, from its own ledger, whether a
-- cover letter or a revision is included in an already-charged CV tailoring for the same
-- job (see src/lib/pricing.ts). check_and_deduct_credits gains an optional p_job_key
-- parameter; the old 4-arg overload is dropped so PostgREST never sees two candidate
-- signatures. Callers that still pass 4 named args keep working (default NULL).
--
-- RUN THIS BEFORE deploying the code that passes p_job_key.

ALTER TABLE public.usage_events ADD COLUMN IF NOT EXISTS job_key text;
CREATE INDEX IF NOT EXISTS usage_events_user_job_idx
  ON public.usage_events (user_id, job_key, created_at DESC);

DROP FUNCTION IF EXISTS public.check_and_deduct_credits(uuid, integer, text, text);

CREATE OR REPLACE FUNCTION public.check_and_deduct_credits(
  p_user_id uuid,
  p_cost    integer,
  p_action  text,
  p_market  text DEFAULT 'eu',
  p_job_key text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_common    integer;
  v_eu        integer;
  v_in_pool   integer;
  v_status    text;
  v_total     integer;
  v_remaining integer;
  v_cross     boolean := false;
  v_from      integer;
BEGIN
  SELECT
    COALESCE(credits, 0),
    COALESCE(eu_credits, 0),
    COALESCE(in_credits, 0),
    status
  INTO v_common, v_eu, v_in_pool, v_status
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'remaining', 0, 'reason', 'not_found');
  END IF;

  IF v_status = 'blocked' THEN
    RETURN json_build_object('ok', false, 'remaining', 0, 'reason', 'blocked');
  END IF;

  v_total := v_common + v_eu + v_in_pool;

  IF v_total < p_cost THEN
    RETURN json_build_object('ok', false, 'remaining', v_total, 'reason', 'insufficient');
  END IF;

  v_remaining := p_cost;

  v_from      := LEAST(v_common, v_remaining);
  v_common    := v_common - v_from;
  v_remaining := v_remaining - v_from;

  IF v_remaining > 0 THEN
    IF p_market = 'eu' THEN
      v_from := LEAST(v_eu, v_remaining);
      v_eu   := v_eu - v_from;
    ELSE
      v_from    := LEAST(v_in_pool, v_remaining);
      v_in_pool := v_in_pool - v_from;
    END IF;
    v_remaining := v_remaining - v_from;
  END IF;

  IF v_remaining > 0 THEN
    v_cross := true;
    IF p_market = 'eu' THEN
      v_from    := LEAST(v_in_pool, v_remaining);
      v_in_pool := v_in_pool - v_from;
    ELSE
      v_from := LEAST(v_eu, v_remaining);
      v_eu   := v_eu - v_from;
    END IF;
    v_remaining := v_remaining - v_from;
  END IF;

  IF v_remaining > 0 THEN
    RETURN json_build_object('ok', false, 'remaining', v_total - p_cost, 'reason', 'insufficient');
  END IF;

  UPDATE public.profiles
  SET credits    = v_common,
      eu_credits = v_eu,
      in_credits = v_in_pool
  WHERE id = p_user_id;

  INSERT INTO public.usage_events (user_id, action, credits_used, job_key)
  VALUES (p_user_id, p_action, p_cost, p_job_key);

  RETURN json_build_object(
    'ok',              true,
    'remaining',       v_common + v_eu + v_in_pool,
    'usedCrossMarket', v_cross
  );
END;
$$;

-- ROLLBACK (only if the deploy is reverted; the extra column is harmless to keep):
-- DROP FUNCTION IF EXISTS public.check_and_deduct_credits(uuid, integer, text, text, text);
-- then re-run 010_fix_check_and_deduct.sql to restore the 4-arg function.
-- DROP INDEX IF EXISTS public.usage_events_user_job_idx;
-- ALTER TABLE public.usage_events DROP COLUMN IF EXISTS job_key;
