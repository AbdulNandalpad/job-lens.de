-- ============================================================
-- 013_saved_cv.sql
-- Persistent, cross-session CV storage on the profile.
--
-- Previously the CV text only lived in sessionStorage (jl_cv_text),
-- so users had to re-upload it on every new tab/session and on nearly
-- every page (Career Scan, CV Builder, Cover Letter, Job Case, Auto
-- Apply, Kira...). This lets a user upload once in Account settings
-- (or on first use) and have it reused everywhere, with explicit
-- consent recorded and a one-click delete.
--
-- cv_text is encrypted at the application level (src/lib/encryption.ts,
-- same AES-256-GCM scheme as migration 012) before INSERT/UPDATE and
-- decrypted after SELECT. The key never touches the database.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cv_text        TEXT,
  ADD COLUMN IF NOT EXISTS cv_file_name   TEXT,
  ADD COLUMN IF NOT EXISTS cv_updated_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cv_consent_at  TIMESTAMPTZ;
