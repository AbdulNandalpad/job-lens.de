-- ============================================================
-- 004_job_cases.sql
-- Job Case feature — GDPR-compliant schema
-- All personal data fields documented with retention policy.
-- Run in Supabase SQL editor or via supabase db push.
-- ============================================================

-- ── job_cases ─────────────────────────────────────────────────────────────
-- GDPR: personal data (video key, narrative, evidence, test answers)
-- Retention: 30 days from created_at. Hard-deleted by nightly cron.
-- Legal basis: Explicit consent (consent_video / consent_test / consent_tracking).
-- Right to erasure: DELETE /api/job-case/[id] nulls all personal fields immediately.
CREATE TABLE IF NOT EXISTS job_cases (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Public identifier — safe to expose in URLs
  slug                TEXT UNIQUE NOT NULL,

  -- Job metadata (non-personal — derived from public job posting)
  job_title           TEXT NOT NULL,
  company_name        TEXT,
  job_posting_raw     TEXT,          -- deleted immediately after case generation
  job_requirements    JSONB,         -- extracted skill list, non-personal
  job_quality_score   TEXT CHECK (job_quality_score IN ('clear', 'vague', 'poor')),
  match_score         INTEGER CHECK (match_score BETWEEN 0 AND 100),

  -- Personal content (GDPR Article 5 — minimised, purpose-limited)
  pitch_narrative     TEXT,          -- AI-generated from anonymised CV text
  requirement_evidence JSONB,        -- candidate's own evidence claims
  test_answers        JSONB,         -- [{question, answer, score}]
  test_overall_score  INTEGER CHECK (test_overall_score BETWEEN 0 AND 100),

  -- Video (stored in private Supabase Storage bucket, EU-West)
  video_storage_key   TEXT,          -- nulled on deletion
  video_duration_seconds INTEGER,

  -- Lifecycle
  status              TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'deleted', 'expired')),

  -- Consent records — retained 3 years after deletion (GDPR compliance obligation)
  consent_video       BOOLEAN NOT NULL DEFAULT false,
  consent_test        BOOLEAN NOT NULL DEFAULT false,
  consent_tracking    BOOLEAN NOT NULL DEFAULT false,
  consent_timestamp   TIMESTAMPTZ,   -- UTC timestamp of consent submission
  consent_version     TEXT NOT NULL DEFAULT '1.0',  -- bump when consent text changes

  -- Credit accounting
  credits_refunded    BOOLEAN NOT NULL DEFAULT false,

  -- Analytics (non-personal counter only)
  view_count          INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at          TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '30 days',
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS job_cases_user_id_idx    ON job_cases (user_id);
CREATE INDEX IF NOT EXISTS job_cases_slug_idx        ON job_cases (slug);
CREATE INDEX IF NOT EXISTS job_cases_expires_at_idx  ON job_cases (expires_at) WHERE status = 'active';

-- ── case_views ────────────────────────────────────────────────────────────
-- GDPR: recruiter email hashed (SHA-256) immediately — plaintext never stored.
-- Only domain (e.g. "bosch.com") is stored and shown to candidate.
-- Legal basis: Legitimate interest (access log, view notification).
-- Retention: deleted with parent job_case (CASCADE) — max 30 days.
CREATE TABLE IF NOT EXISTS case_views (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_case_id           UUID NOT NULL REFERENCES job_cases(id) ON DELETE CASCADE,

  -- GDPR: hash of recruiter email. Never store plaintext. SHA-256 hex.
  recruiter_email_hash  TEXT NOT NULL,

  -- Domain shown to candidate as view confirmation (e.g. "bosch.com")
  recruiter_domain      TEXT NOT NULL,

  -- Magic link — hashed token for one-time access (SHA-256 hex)
  magic_token_hash      TEXT UNIQUE NOT NULL,
  token_expires_at      TIMESTAMPTZ NOT NULL,  -- 24h from creation
  token_used_at         TIMESTAMPTZ,           -- null until clicked

  -- Set when recruiter actually views the page (after token validation)
  viewed_at             TIMESTAMPTZ,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS case_views_job_case_id_idx    ON case_views (job_case_id);
CREATE INDEX IF NOT EXISTS case_views_token_hash_idx     ON case_views (magic_token_hash);

-- ── proof_items ───────────────────────────────────────────────────────────
-- Reusable skill evidence library built up across Job Cases.
-- GDPR: personal content. Deleted when source case is hard-deleted.
CREATE TABLE IF NOT EXISTS proof_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_tag       TEXT NOT NULL,
  evidence_text   TEXT,
  evidence_url    TEXT,
  source_case_id  UUID REFERENCES job_cases(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proof_items_user_id_idx ON proof_items (user_id);

-- ── ip_rate_limits ────────────────────────────────────────────────────────
-- Used by /api/job-case/request-access to limit magic link requests.
-- Max 5 requests per IP per hour to prevent email flooding.
-- Non-personal: stores hashed IP only.
CREATE TABLE IF NOT EXISTS ip_rate_limits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash     TEXT NOT NULL,
  endpoint    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ip_rate_limits_lookup_idx
  ON ip_rate_limits (ip_hash, endpoint, created_at);

-- Auto-purge rate limit records older than 2 hours (keep table small)
-- This is handled by the nightly cron job.

-- ── Row Level Security ────────────────────────────────────────────────────

ALTER TABLE job_cases   ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_views  ENABLE ROW LEVEL SECURITY;
ALTER TABLE proof_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_rate_limits ENABLE ROW LEVEL SECURITY;

-- job_cases: owner read/write only
DROP POLICY IF EXISTS "job_cases_owner" ON job_cases;
CREATE POLICY "job_cases_owner" ON job_cases
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- case_views: no direct client access — service role only
DROP POLICY IF EXISTS "case_views_deny" ON case_views;
CREATE POLICY "case_views_deny" ON case_views USING (false);

-- proof_items: owner only
DROP POLICY IF EXISTS "proof_items_owner" ON proof_items;
CREATE POLICY "proof_items_owner" ON proof_items
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ip_rate_limits: no direct client access
DROP POLICY IF EXISTS "ip_rate_limits_deny" ON ip_rate_limits;
CREATE POLICY "ip_rate_limits_deny" ON ip_rate_limits USING (false);
