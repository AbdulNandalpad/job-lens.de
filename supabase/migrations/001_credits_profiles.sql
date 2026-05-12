-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email         text,
  full_name     text,
  avatar_url    text,
  credits       integer NOT NULL DEFAULT 5,
  status        text    NOT NULL DEFAULT 'active',  -- 'active' | 'blocked'
  paypal_payer_email text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 2. Usage events table
CREATE TABLE IF NOT EXISTS public.usage_events (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action       text        NOT NULL,   -- 'career_scan' | 'tailor_cv' | 'cover_letter' | 'auto_apply'
  credits_used integer     NOT NULL DEFAULT 1,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 3. Row-Level Security
ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to allow re-running
DROP POLICY IF EXISTS "profiles_select_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON public.profiles;
DROP POLICY IF EXISTS "usage_select_own"     ON public.usage_events;

CREATE POLICY "profiles_select_own"  ON public.profiles     FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own"  ON public.profiles     FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "usage_select_own"     ON public.usage_events FOR SELECT USING (auth.uid() = user_id);

-- 4. Auto-create profile on first login
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Backfill profiles for existing users (safe to run even if already done)
INSERT INTO public.profiles (id, email, full_name, avatar_url)
SELECT
  id,
  email,
  raw_user_meta_data->>'full_name',
  raw_user_meta_data->>'avatar_url'
FROM auth.users
ON CONFLICT (id) DO NOTHING;
