-- ============================================================
-- 012_application_level_encryption.sql
-- Application-level AES-256-GCM encryption for sensitive columns.
--
-- WHAT CHANGED IN THE APPLICATION:
--   All sensitive personal data is now encrypted by the Next.js
--   server before INSERT and decrypted after SELECT.
--   Format stored: enc:v1:<iv_hex>.<tag_hex>.<ciphertext_hex>
--   Key: ENCRYPTION_KEY env var (64 hex chars). Never in DB.
--
-- COLUMNS ENCRYPTED:
--   user_memories.memory_text
--   job_cases.pitch_narrative
--   job_cases.requirement_evidence   (JSONB serialized then encrypted)
--   job_cases.test_answers           (JSONB serialized then encrypted)
--   proof_items.evidence_text
--   training_feedback.prompt
--   training_feedback.output
--
-- DB SCHEMA CHANGE:
--   user_memories gets a new memory_text_hash column for dedup
--   (the unique constraint on memory_text cannot work with encryption
--   because each encryption produces a unique ciphertext via random IV).
-- ============================================================

-- Add HMAC fingerprint column to user_memories for exact-dedup
ALTER TABLE public.user_memories
  ADD COLUMN IF NOT EXISTS memory_text_hash TEXT;

-- Drop old unique index on plaintext (incompatible with encryption)
DROP INDEX IF EXISTS user_memories_user_text_key;

-- New unique index on deterministic HMAC fingerprint
CREATE UNIQUE INDEX IF NOT EXISTS user_memories_user_hash_key
  ON public.user_memories (user_id, memory_text_hash);

-- ── Backfill existing rows (encrypt existing plaintext) ────────────────────
-- NOTE: You CANNOT run this SQL directly because the encryption key lives
-- in the application, not in Postgres. Instead:
--
--   1. Add ENCRYPTION_KEY to your Vercel environment variables:
--        openssl rand -hex 32   →  paste as ENCRYPTION_KEY
--
--   2. Run the one-time backfill script:
--        npx tsx scripts/encrypt-existing-data.ts
--
--   Until the backfill runs, existing rows have plaintext memory_text and
--   NULL memory_text_hash. The decrypt() function handles both: any value
--   not starting with "enc:" is returned as-is (backward compatible).
-- ============================================================
