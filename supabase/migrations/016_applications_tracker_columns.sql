-- 016: bring the live `applications` table in line with /api/applications and the Tracker.
--
-- The table was created by hand with (id, user_id, role, company, date_applied, notes,
-- source, job_url, created_at). The API and both Tracker pages read and write
-- status, location, applied_at and updated_at, which never existed — so every
-- "I applied" and every Tracker load failed ("Could not find the 'applied_at' column").
-- The table had 0 rows when this was written; the backfill below is for safety only.

ALTER TABLE applications ADD COLUMN IF NOT EXISTS status     text        NOT NULL DEFAULT 'applied';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS location   text;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS applied_at date        NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE applications SET applied_at = date_applied WHERE date_applied IS NOT NULL;

-- Keep the legacy column harmless for any old writer; new code fills both.
ALTER TABLE applications ALTER COLUMN date_applied SET DEFAULT CURRENT_DATE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_status_check') THEN
    ALTER TABLE applications ADD CONSTRAINT applications_status_check
      CHECK (status IN ('saved', 'applied', 'interview', 'offer', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS applications_user_created_idx ON applications (user_id, created_at DESC);

-- admin/users PATCH writes an audit row for every credit/block change, but the table was
-- never created, so those inserts failed silently and no admin change was ever recorded.
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email    text        NOT NULL,
  action         text        NOT NULL,
  target_user_id uuid,
  details        jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;  -- service role only; no client policies
CREATE INDEX IF NOT EXISTS admin_audit_log_target_idx ON admin_audit_log (target_user_id, created_at DESC);

-- PostgREST caches the schema; without this the API keeps reporting the columns as missing.
NOTIFY pgrst, 'reload schema';

-- Rollback:
-- DROP TABLE IF EXISTS admin_audit_log;
-- ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;
-- DROP INDEX IF EXISTS applications_user_created_idx;
-- ALTER TABLE applications DROP COLUMN IF EXISTS status, DROP COLUMN IF EXISTS location,
--   DROP COLUMN IF EXISTS applied_at, DROP COLUMN IF EXISTS updated_at;
