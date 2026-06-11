-- Add scan_cache column to profiles for deterministic career scan results.
-- Stores { hash, result } so re-scanning the same CV+role returns the cached
-- result without consuming credits.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS scan_cache JSONB;
