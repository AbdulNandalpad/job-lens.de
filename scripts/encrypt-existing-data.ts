/**
 * One-time backfill: encrypt all plaintext rows in sensitive DB columns.
 *
 * Run AFTER:
 *   1. Setting ENCRYPTION_KEY in your environment (openssl rand -hex 32)
 *   2. Running migration 012 in Supabase SQL editor
 *   3. Deploying the new app code to Vercel (so new writes are encrypted)
 *
 * Usage:
 *   ENCRYPTION_KEY=<64-hex> SUPABASE_SERVICE_ROLE_KEY=<key> \
 *   NEXT_PUBLIC_SUPABASE_URL=<url> \
 *   npx tsx scripts/encrypt-existing-data.ts
 *
 * Safe to re-run: already-encrypted values (starting with "enc:") are skipped.
 */

import { createClient } from '@supabase/supabase-js'
import { createCipheriv, createHmac, randomBytes } from 'crypto'

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ENCRYPTION_KEY_HEX) {
  console.error('Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_KEY')
  process.exit(1)
}
if (ENCRYPTION_KEY_HEX.length !== 64) {
  console.error('ENCRYPTION_KEY must be 64 hex chars (32 bytes). Generate: openssl rand -hex 32')
  process.exit(1)
}

const KEY = Buffer.from(ENCRYPTION_KEY_HEX, 'hex')
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

function encrypt(plaintext: string): string {
  if (!plaintext || plaintext.startsWith('enc:')) return plaintext
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', KEY, iv)
  const ct  = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `enc:v1:${iv.toString('hex')}.${tag.toString('hex')}.${ct.toString('hex')}`
}

function hmacFingerprint(text: string): string {
  const subKey = createHmac('sha256', ENCRYPTION_KEY_HEX).update('fingerprint-v1').digest()
  return createHmac('sha256', subKey).update(text).digest('hex')
}

async function encryptColumn(
  table: string,
  column: string,
  idField = 'id',
  hashField?: string,
) {
  console.log(`\n[${table}.${column}] fetching...`)
  const { data, error } = await admin.from(table).select(`${idField}, ${column}`).limit(10000)
  if (error) { console.error(`  fetch error:`, error.message); return }

  let skipped = 0, updated = 0, failed = 0
  for (const row of data ?? []) {
    const val: string | null = row[column]
    if (!val || val.startsWith('enc:')) { skipped++; continue }

    const patch: Record<string, string> = { [column]: encrypt(val) }
    if (hashField) patch[hashField] = hmacFingerprint(val)

    const { error: upErr } = await admin.from(table).update(patch).eq(idField, row[idField])
    if (upErr) { console.error(`  update error row ${row[idField]}:`, upErr.message); failed++; continue }
    updated++
  }
  console.log(`  done: ${updated} encrypted, ${skipped} already encrypted, ${failed} failed`)
}

async function main() {
  console.log('=== Job-Lens data encryption backfill ===')
  console.log('Encrypting existing plaintext rows...\n')

  await encryptColumn('user_memories', 'memory_text', 'id', 'memory_text_hash')
  await encryptColumn('job_cases', 'pitch_narrative', 'id')
  await encryptColumn('proof_items', 'evidence_text', 'id')
  await encryptColumn('training_feedback', 'prompt', 'id')
  await encryptColumn('training_feedback', 'output', 'id')

  // JSONB columns: requirement_evidence and test_answers are stored as JSONB in Postgres
  // but the encrypted version is a TEXT string. Supabase returns them as objects.
  // We stringify them before encrypting.
  console.log('\n[job_cases.requirement_evidence] fetching...')
  const { data: cases } = await admin.from('job_cases').select('id, requirement_evidence, test_answers').limit(10000)
  let skipped = 0, updated = 0, failed = 0
  for (const row of cases ?? []) {
    const needsEncRe = row.requirement_evidence && typeof row.requirement_evidence !== 'string'
    const needsEncTa = row.test_answers && typeof row.test_answers !== 'string'

    if (!needsEncRe && !needsEncTa) { skipped++; continue }

    const patch: Record<string, string> = {}
    if (needsEncRe) patch['requirement_evidence'] = encrypt(JSON.stringify(row.requirement_evidence))
    if (needsEncTa) patch['test_answers'] = encrypt(JSON.stringify(row.test_answers))

    const { error: upErr } = await admin.from('job_cases').update(patch).eq('id', row.id)
    if (upErr) { console.error(`  update error row ${row.id}:`, upErr.message); failed++; continue }
    updated++
  }
  console.log(`  done: ${updated} encrypted, ${skipped} already encrypted / null, ${failed} failed`)

  console.log('\n=== Backfill complete ===')
  console.log('Verify by checking a row in Supabase — values should start with "enc:v1:"')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
