-- 017: refunds go back to the pools the credits were taken from.
--
-- Before this, every refund was added to `credits` (the free pool), so a user whose paid
-- EU or India credits paid for a failed generation got free credits back instead. The
-- deduction already knows the split across pools; it just never recorded it.
--
-- This migration:
--   1. records the per-pool split on each usage_events row,
--   2. adds refund_last_usage(), which reverses a charge into the same pools,
--   3. keeps check_and_deduct_credits's signature and result shape unchanged.
--
-- RUN THIS BEFORE deploying the code that calls refund_last_usage.

ALTER TABLE public.usage_events ADD COLUMN IF NOT EXISTS spent_common integer NOT NULL DEFAULT 0;
ALTER TABLE public.usage_events ADD COLUMN IF NOT EXISTS spent_eu     integer NOT NULL DEFAULT 0;
ALTER TABLE public.usage_events ADD COLUMN IF NOT EXISTS spent_in     integer NOT NULL DEFAULT 0;
ALTER TABLE public.usage_events ADD COLUMN IF NOT EXISTS refunded_at  timestamptz;

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
  v_use_common integer := 0;
  v_use_eu     integer := 0;
  v_use_in     integer := 0;
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

  -- 1. Drain common (free) pool first
  v_from       := LEAST(v_common, v_remaining);
  v_common     := v_common - v_from;
  v_use_common := v_from;
  v_remaining  := v_remaining - v_from;

  -- 2. Drain native paid pool (eu_credits for DACH, in_credits for India)
  IF v_remaining > 0 THEN
    IF p_market = 'eu' THEN
      v_from   := LEAST(v_eu, v_remaining);
      v_eu     := v_eu - v_from;
      v_use_eu := v_use_eu + v_from;
    ELSE
      v_from    := LEAST(v_in_pool, v_remaining);
      v_in_pool := v_in_pool - v_from;
      v_use_in  := v_use_in + v_from;
    END IF;
    v_remaining := v_remaining - v_from;
  END IF;

  -- 3. Drain cross-market pool if still needed
  IF v_remaining > 0 THEN
    v_cross := true;
    IF p_market = 'eu' THEN
      v_from    := LEAST(v_in_pool, v_remaining);
      v_in_pool := v_in_pool - v_from;
      v_use_in  := v_use_in + v_from;
    ELSE
      v_from   := LEAST(v_eu, v_remaining);
      v_eu     := v_eu - v_from;
      v_use_eu := v_use_eu + v_from;
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

  INSERT INTO public.usage_events (user_id, action, credits_used, job_key, spent_common, spent_eu, spent_in)
  VALUES (p_user_id, p_action, p_cost, p_job_key, v_use_common, v_use_eu, v_use_in);

  RETURN json_build_object(
    'ok',              true,
    'remaining',       v_common + v_eu + v_in_pool,
    'usedCrossMarket', v_cross
  );
END;
$$;

-- Reverses the most recent unrefunded charge for (user, action[, job_key]) into the
-- pools it came from. Rows written before this migration have a zero split, so they
-- fall back to the free pool — the old behaviour, only for old rows.
CREATE OR REPLACE FUNCTION public.refund_last_usage(
  p_user_id uuid,
  p_amount  integer,
  p_action  text,
  p_job_key text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id      uuid;
  v_common  integer;
  v_eu      integer;
  v_in      integer;
BEGIN
  IF p_amount > 0 THEN
    SELECT id, spent_common, spent_eu, spent_in
    INTO v_id, v_common, v_eu, v_in
    FROM public.usage_events
    WHERE user_id = p_user_id
      AND action = p_action
      AND credits_used = p_amount
      AND refunded_at IS NULL
      AND (p_job_key IS NULL OR job_key = p_job_key)
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_id IS NULL THEN
      -- No matching charge (already refunded, or a charge this server did not record):
      -- put it back in the free pool rather than losing the user's credits.
      v_common := p_amount; v_eu := 0; v_in := 0;
    ELSIF COALESCE(v_common, 0) + COALESCE(v_eu, 0) + COALESCE(v_in, 0) <> p_amount THEN
      v_common := p_amount; v_eu := 0; v_in := 0;   -- pre-017 row: split unknown
    END IF;

    UPDATE public.profiles
    SET credits    = COALESCE(credits, 0)    + COALESCE(v_common, 0),
        eu_credits = COALESCE(eu_credits, 0) + COALESCE(v_eu, 0),
        in_credits = COALESCE(in_credits, 0) + COALESCE(v_in, 0)
    WHERE id = p_user_id;

    IF v_id IS NOT NULL THEN
      UPDATE public.usage_events SET refunded_at = now() WHERE id = v_id;
    END IF;
  END IF;

  -- A 0-credit refund is log-only: it exists so a failed included revision or letter is
  -- not counted against the 24h package (see src/lib/pricingCore.ts).
  INSERT INTO public.usage_events (user_id, action, credits_used, job_key)
  VALUES (p_user_id, 'refund_' || p_action, -p_amount, p_job_key);

  RETURN json_build_object(
    'ok', true,
    'common', COALESCE(v_common, 0),
    'eu', COALESCE(v_eu, 0),
    'in', COALESCE(v_in, 0)
  );
END;
$$;

NOTIFY pgrst, 'reload schema';

-- Rollback:
-- DROP FUNCTION IF EXISTS public.refund_last_usage(uuid, integer, text, text);
-- (check_and_deduct_credits: re-run migration 015 to restore the previous body)
-- ALTER TABLE public.usage_events DROP COLUMN IF EXISTS spent_common,
--   DROP COLUMN IF EXISTS spent_eu, DROP COLUMN IF EXISTS spent_in, DROP COLUMN IF EXISTS refunded_at;
