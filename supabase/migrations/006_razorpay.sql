-- Razorpay top-up support for India (in_credits)
-- Mirrors the existing PayPal infra (increment_eu_credits + purchase_events).
-- The PayPal columns/functions were created live; this migration adds the
-- Razorpay equivalents and relaxes the PayPal-only NOT NULL on purchase_events.

-- 1. purchase_events: allow Razorpay rows alongside PayPal rows
ALTER TABLE public.purchase_events
  ALTER COLUMN paypal_txn_id DROP NOT NULL;

ALTER TABLE public.purchase_events
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text,
  ADD COLUMN IF NOT EXISTS razorpay_order_id   text,
  ADD COLUMN IF NOT EXISTS amount_inr          numeric;

-- Idempotency gate: one row per Razorpay payment. Partial unique index so
-- existing PayPal rows (NULL razorpay_payment_id) are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS purchase_events_razorpay_payment_id_key
  ON public.purchase_events (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

-- 2. Atomic in_credits increment — mirrors increment_eu_credits
CREATE OR REPLACE FUNCTION public.increment_in_credits(user_id uuid, amount int)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET in_credits = COALESCE(in_credits, 0) + amount
  WHERE id = user_id;
$$;
