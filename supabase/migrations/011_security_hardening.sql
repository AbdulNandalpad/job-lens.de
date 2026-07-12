-- Migration 011: Security hardening fixes
-- Adds atomic increment_credits function and supporting hardening.

-- ── Atomic credit increment (used by refundCredits) ───────────────────────────
-- Eliminates the read-modify-write race in the old refundCredits implementation.
CREATE OR REPLACE FUNCTION increment_credits(p_user_id uuid, p_amount int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET credits = credits + p_amount
  WHERE id = p_user_id;
END;
$$;

-- Revoke public execute; only service role (backend) may call this.
REVOKE ALL ON FUNCTION increment_credits(uuid, int) FROM PUBLIC;
