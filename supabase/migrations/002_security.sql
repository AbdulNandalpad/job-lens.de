-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Admin audit log table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_email    text        NOT NULL,
  action         text        NOT NULL,
  target_user_id uuid,
  details        jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
-- No user-facing RLS policies — only service role can read/write

-- 2. Atomic check-and-deduct credits function
--    Eliminates the TOCTOU race condition in the TypeScript read-then-write pattern.
--    Uses FOR UPDATE row lock so concurrent calls queue rather than double-spend.
CREATE OR REPLACE FUNCTION public.check_and_deduct_credits(
  p_user_id uuid,
  p_cost    integer,
  p_action  text,
  p_market  text DEFAULT 'eu'
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
  SELECT COALESCE(credits, 0), COALESCE(eu_credits, 0), COALESCE(in_credits, 0), status
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

  -- 1. Drain common pool
  v_from      := LEAST(v_common, v_remaining);
  v_common    := v_common - v_from;
  v_remaining := v_remaining - v_from;

  -- 2. Drain native paid pool
  IF v_remaining > 0 THEN
    IF p_market = 'eu' THEN
      v_from  := LEAST(v_eu, v_remaining);
      v_eu    := v_eu - v_from;
    ELSE
      v_from    := LEAST(v_in_pool, v_remaining);
      v_in_pool := v_in_pool - v_from;
    END IF;
    v_remaining := v_remaining - v_from;
  END IF;

  -- 3. Drain cross-market paid pool
  IF v_remaining > 0 THEN
    v_cross := true;
    IF p_market = 'eu' THEN
      v_in_pool := v_in_pool - v_remaining;
    ELSE
      v_eu := v_eu - v_remaining;
    END IF;
  END IF;

  UPDATE public.profiles
  SET credits = v_common, eu_credits = v_eu, in_credits = v_in_pool
  WHERE id = p_user_id;

  INSERT INTO public.usage_events (user_id, action, credits_used)
  VALUES (p_user_id, p_action, p_cost);

  RETURN json_build_object(
    'ok',             true,
    'remaining',      v_common + v_eu + v_in_pool,
    'usedCrossMarket', v_cross
  );
END;
$$;
