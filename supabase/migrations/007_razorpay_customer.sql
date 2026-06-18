-- Persist the Razorpay customer id per user so repeat purchases reuse the same
-- customer instead of attempting a duplicate create (which Razorpay rejects).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS razorpay_customer_id text;
