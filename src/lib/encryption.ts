/**
 * Application-level AES-256-GCM encryption for sensitive DB columns.
 *
 * Even if the database is fully dumped (backup theft, SQL injection, insider
 * threat), all encrypted columns are unreadable without the ENCRYPTION_KEY
 * environment variable, which never touches the database.
 *
 * Format stored in DB: enc:v1:<iv_hex>.<tag_hex>.<ciphertext_hex>
 * Any value not starting with "enc:" is returned as-is (legacy plaintext rows).
 *
 * Key setup (run once, store in Vercel env vars):
 *   openssl rand -hex 32   →  paste as ENCRYPTION_KEY
 */

import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto'

const ALG     = 'aes-256-gcm'
const IV_LEN  = 12   // 96-bit IV for GCM
const TAG_LEN = 16   // 128-bit auth tag

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error('[encryption] ENCRYPTION_KEY must be 64 hex chars (32 bytes). Generate: openssl rand -hex 32')
  }
  return Buffer.from(hex, 'hex')
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext
  const key = getKey()
  const iv  = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALG, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `enc:v1:${iv.toString('hex')}.${tag.toString('hex')}.${ciphertext.toString('hex')}`
}

export function decrypt(value: string | null | undefined): string {
  if (!value || !value.startsWith('enc:')) return value ?? ''
  const key = getKey()
  const rest = value.slice('enc:v1:'.length)
  const [ivHex, tagHex, ctHex] = rest.split('.')
  if (!ivHex || !tagHex || !ctHex) return value  // malformed — return raw rather than crash
  const decipher = createDecipheriv(ALG, key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return Buffer.concat([
    decipher.update(Buffer.from(ctHex, 'hex')),
    decipher.final(),
  ]).toString('utf8')
}

// Encrypt an object/array (JSONB columns) — serializes to JSON then encrypts.
export function encryptJson(value: unknown): string {
  if (value === null || value === undefined) return ''
  return encrypt(JSON.stringify(value))
}

// Decrypt a JSONB column back to its original type.
export function decryptJson<T = unknown>(value: string | null | undefined): T | null {
  if (!value) return null
  const plain = decrypt(value)
  try { return JSON.parse(plain) as T } catch { return null }
}

// HMAC-SHA256 of plaintext keyed with a sub-key derived from ENCRYPTION_KEY.
// Used as a deterministic dedup fingerprint so unique indexes survive encryption.
export function hmacFingerprint(plaintext: string): string {
  const masterKey = process.env.ENCRYPTION_KEY ?? ''
  // Sub-key derived with a fixed label — keeps HMAC key independent of cipher key.
  const subKey = createHmac('sha256', masterKey).update('fingerprint-v1').digest()
  return createHmac('sha256', subKey).update(plaintext).digest('hex')
}
