-- Re-apply check_and_deduct_credits with full multi-pool logic.
-- Safe to run multiple times (CREATE OR REPLACE).
-- Fixes: India users with in_credits but 0 common credits getting "Insufficient credits".

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

  -- Check total across all three pools
  v_total := v_common + v_eu + v_in_pool;

  IF v_total < p_cost THEN
    RETURN json_build_object('ok', false, 'remaining', v_total, 'reason', 'insufficient');
  END IF;

  v_remaining := p_cost;

  -- 1. Drain common (free) pool first
  v_from      := LEAST(v_common, v_remaining);
  v_common    := v_common - v_from;
  v_remaining := v_remaining - v_from;

  -- 2. Drain native paid pool (eu_credits for DACH, in_credits for India)
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

  -- 3. Drain cross-market pool if still needed (shows CrossMarketModal warning on client)
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

  -- Should never happen given the total check above, but guard anyway
  IF v_remaining > 0 THEN
    RETURN json_build_object('ok', false, 'remaining', v_total - p_cost, 'reason', 'insufficient');
  END IF;

  UPDATE public.profiles
  SET credits    = v_common,
      eu_credits = v_eu,
      in_credits = v_in_pool
  WHERE id = p_user_id;

  INSERT INTO public.usage_events (user_id, action, credits_used)
  VALUES (p_user_id, p_action, p_cost);

  RETURN json_build_object(
    'ok',              true,
    'remaining',       v_common + v_eu + v_in_pool,
    'usedCrossMarket', v_cross
  );
END;
$$;
