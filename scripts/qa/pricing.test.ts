// Run: node --test scripts/qa/
// Pure-logic checks for the application-package pricing (src/lib/pricingCore.ts) and
// the CV text helpers (src/lib/cv.ts). No DB, no network.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeBundle, jobKey } from '../../src/lib/pricingCore.ts'
import { cvTextFromTailored, parseCvJson } from '../../src/lib/cv.ts'

const NOW = new Date('2026-09-15T12:00:00Z')
const at = (minutesAgo: number) => new Date(NOW.getTime() - minutesAgo * 60_000).toISOString()
const row = (action: string, credits: number, minutesAgo: number) => ({ action, credits_used: credits, created_at: at(minutesAgo) })

test('jobKey normalises case, whitespace and punctuation; empty → nojob', () => {
  assert.equal(jobKey({ job_title: 'SAP CX Lead', employer_name: 'ACME GmbH' }), jobKey({ job_title: '  sap   cx lead!', employer_name: 'acme, gmbh' }))
  assert.notEqual(jobKey({ job_title: 'SAP CX Lead', employer_name: 'ACME' }), jobKey({ job_title: 'SAP CX Lead', employer_name: 'Other' }))
  assert.equal(jobKey(null), 'nojob')
  assert.equal(jobKey({ job_title: '', employer_name: '' }), 'nojob')
})

test('no ledger rows → inactive', () => {
  assert.equal(computeBundle([], NOW).active, false)
})

test('fresh charged tailoring opens a package with 3 changes and an unused letter', () => {
  const b = computeBundle([row('tailor_cv', 1, 5)], NOW)
  assert.equal(b.active, true)
  assert.equal(b.coverLetterUsed, false)
  assert.equal(b.revisionsLeft, 3)
  assert.equal(b.expiresAt, new Date(new Date(at(5)).getTime() + 24 * 3600_000).toISOString())
})

test('bundled letter marks the letter used; revisions count down and stop at 0', () => {
  const rows = [
    row('tailor_cv', 1, 60),
    row('cover_letter_bundled', 0, 50),
    row('tailor_cv_revision', 0, 40),
    row('cover_letter_revision', 0, 30),
    row('tailor_cv_revision', 0, 20),
  ]
  const b = computeBundle(rows, NOW)
  assert.equal(b.coverLetterUsed, true)
  assert.equal(b.revisionsUsed, 3)
  assert.equal(b.revisionsLeft, 0)
})

test('a refunded charge does not open a package', () => {
  const b = computeBundle([row('tailor_cv', 1, 10), row('refund_tailor_cv', -1, 9)], NOW)
  assert.equal(b.active, false)
})

test('a refunded later charge falls back to the earlier valid package', () => {
  const rows = [
    row('tailor_cv', 1, 120),
    row('tailor_cv_revision', 0, 100),
    row('tailor_cv', 1, 30),
    row('refund_tailor_cv', -1, 29),
  ]
  const b = computeBundle(rows, NOW)
  assert.equal(b.active, true)
  assert.equal(b.chargedAt, at(120))
  assert.equal(b.revisionsUsed, 1)
})

test('a 0-credit refund of a failed revision gives the change back', () => {
  const rows = [
    row('tailor_cv', 1, 60),
    row('tailor_cv_revision', 0, 40),
    row('refund_tailor_cv_revision', 0, 39),
  ]
  assert.equal(computeBundle(rows, NOW).revisionsLeft, 3)
})

test('a standalone charged cover letter opens a package with the letter already used', () => {
  const b = computeBundle([row('cover_letter', 1, 5)], NOW)
  assert.equal(b.active, true)
  assert.equal(b.coverLetterUsed, true)
  assert.equal(b.revisionsLeft, 3)
})

test('charges older than the window are ignored', () => {
  const b = computeBundle([row('tailor_cv', 1, 25 * 60)], NOW)
  assert.equal(b.active, false)
})

test('cvTextFromTailored flattens CV JSON and passes prose through', () => {
  const json = JSON.stringify({ name: 'Jane Doe', title: 'Engineer', summary: 'Builds things.', experience: [{ role: 'Dev', company: 'ACME', period: '2020-2024', bullets: ['Shipped X'] }], skills: [{ name: 'TypeScript', level: 90 }] })
  const text = cvTextFromTailored(json)
  assert.ok(text.startsWith('Jane Doe\nEngineer'))
  assert.ok(text.includes('Dev — ACME (2020-2024)'))
  assert.ok(text.includes('  - Shipped X'))
  assert.ok(text.includes('Skills: TypeScript'))
  assert.ok(!text.includes('{'))
  assert.equal(cvTextFromTailored('Plain CV text here'), 'Plain CV text here')
  assert.equal(cvTextFromTailored(''), '')
})

test('parseCvJson tolerates fences and preamble, rejects hollow objects', () => {
  const cv = parseCvJson('Sure! Here it is:\n```json\n{"name":"A","title":"B","experience":[]}\n```')
  assert.equal(cv?.name, 'A')
  assert.deepEqual(cv?.experience, [])
  assert.equal(parseCvJson('{"title":"no name"}'), null)
  assert.equal(parseCvJson('not json'), null)
})
