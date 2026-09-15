// Pure "application package" pricing logic — no I/O, so it can be unit-tested with
// plain `node --test` (see scripts/qa/pricing.test.ts). The DB-backed resolver lives in
// src/lib/pricing.ts.
//
// One charged CV tailoring (or, standalone, one charged cover letter) for a job opens a
// package: for BUNDLE.windowHours the same job's cover letter and up to
// BUNDLE.freeRevisions change requests are included. The server decides this from the
// usage_events ledger — never from client-sent flags — so the UI can only ever be wrong in
// the user's favour by being stale, not by being lied to.
import { createHash } from 'crypto'
import { BUNDLE, USAGE_ACTION } from './constants'

export interface UsageRow {
  action: string
  credits_used: number | null
  created_at: string
}

export interface BundleState {
  active: boolean
  chargedAt: string | null
  expiresAt: string | null
  coverLetterUsed: boolean
  revisionsUsed: number
  revisionsLeft: number
}

export const INACTIVE_BUNDLE: BundleState = {
  active: false, chargedAt: null, expiresAt: null,
  coverLetterUsed: false, revisionsUsed: 0, revisionsLeft: 0,
}

const CHARGEABLE = new Set<string>([USAGE_ACTION.tailorCv, USAGE_ACTION.coverLetter])

function norm(s: unknown): string {
  return String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ')
}

/** Stable identity for "this job" — title + employer, case/punctuation-insensitive. */
export function jobKey(job?: { job_title?: string; employer_name?: string } | null): string {
  const t = norm(job?.job_title)
  const e = norm(job?.employer_name)
  if (!t && !e) return 'nojob'
  return createHash('sha256').update(`${t}|${e}`).digest('hex').slice(0, 16)
}

/**
 * Derive the package state from this user's ledger rows for one job key.
 * A charge is only an anchor if no later refund of the same action cancels it
 * (refunds always follow their charge, so we pair them walking newest -> oldest).
 */
export function computeBundle(rows: UsageRow[], now: Date = new Date()): BundleState {
  const windowMs = BUNDLE.windowHours * 3600_000
  const cutoff = now.getTime() - windowMs
  const sorted = rows
    .filter(r => new Date(r.created_at).getTime() >= cutoff)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const pendingRefunds: Record<string, number> = {}
  let anchor: UsageRow | null = null
  for (const r of sorted) {
    const used = r.credits_used ?? 0
    if (r.action.startsWith('refund_') && used < 0) {
      const base = r.action.slice('refund_'.length)
      pendingRefunds[base] = (pendingRefunds[base] ?? 0) + 1
      continue
    }
    if (CHARGEABLE.has(r.action) && used > 0) {
      if ((pendingRefunds[r.action] ?? 0) > 0) { pendingRefunds[r.action]--; continue }
      anchor = r
      break
    }
  }
  if (!anchor) return INACTIVE_BUNDLE

  const anchorTs = new Date(anchor.created_at).getTime()
  const since = sorted.filter(r => new Date(r.created_at).getTime() >= anchorTs)
  const count = (action: string) => since.filter(r => r.action === action).length
  const net = (action: string) => Math.max(0, count(action) - count(`refund_${action}`))

  const coverLetterUsed = anchor.action === USAGE_ACTION.coverLetter || net(USAGE_ACTION.coverLetterBundled) > 0
  const revisionsUsed = net(USAGE_ACTION.tailorCvRevision) + net(USAGE_ACTION.coverLetterRevision)

  return {
    active: true,
    chargedAt: anchor.created_at,
    expiresAt: new Date(anchorTs + windowMs).toISOString(),
    coverLetterUsed,
    revisionsUsed,
    revisionsLeft: Math.max(0, BUNDLE.freeRevisions - revisionsUsed),
  }
}
