/**
 * GET /api/cron/cleanup-expired-cases
 * Nightly cron job — hard-deletes all job cases past their expires_at date.
 * Also refunds credits for cases with zero views after 14 days.
 * Also purges old IP rate limit records.
 *
 * Protected by CRON_SECRET header.
 * Schedule via Vercel Cron: 0 2 * * * (02:00 UTC daily)
 *
 * GDPR:
 * - All personal data fields nulled (same as manual DELETE)
 * - Video removed from Supabase Storage
 * - case_views deleted (domain logs removed)
 * - Consent records retained for 3yr compliance obligation
 * - Credit transaction IDs retained for 7yr financial records (HGB §257)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase, refundCredits } from '@/lib/supabase-server'
import { sendCreditRefundNotification } from '@/lib/job-case-email'
import { JOB_CASE } from '@/lib/constants'

const BUCKET = 'job-case-videos'

export async function GET(req: NextRequest) {
  // Verify cron secret
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminSupabase()
  const now   = new Date().toISOString()
  const refundCutoff = new Date(Date.now() - JOB_CASE.refundCheckDays * 24 * 60 * 60 * 1000).toISOString()
  let deleted = 0, refunded = 0, errors = 0

  try {
    // ── 1. Auto-refund: cases with 0 views after 14 days, not yet refunded ──
    const { data: refundCandidates } = await admin
      .from('job_cases')
      .select('id, user_id, job_title, company_name, video_storage_key')
      .eq('status', 'active')
      .eq('view_count', 0)
      .eq('credits_refunded', false)
      .lte('created_at', refundCutoff)

    for (const jc of refundCandidates ?? []) {
      try {
        await refundCredits(jc.user_id, JOB_CASE.creditCost, 'job_case_no_views')
        await admin.from('job_cases').update({ credits_refunded: true }).eq('id', jc.id)

        const { data: candidate } = await admin
          .from('profiles')
          .select('full_name, email')
          .eq('id', jc.user_id)
          .maybeSingle()

        if (candidate?.email) {
          await sendCreditRefundNotification({
            candidateEmail:  candidate.email,
            candidateName:   candidate.full_name ?? 'there',
            jobTitle:        jc.job_title,
            company:         jc.company_name ?? '',
            creditsRefunded: JOB_CASE.creditCost,
          })
        }
        refunded++
      } catch (err) {
        console.error('Refund error for case', jc.id, err)
        errors++
      }
    }

    // ── 2. Hard-delete expired cases ────────────────────────────────────────
    const { data: expiredCases } = await admin
      .from('job_cases')
      .select('id, user_id, video_storage_key')
      .eq('status', 'active')
      .lte('expires_at', now)

    for (const jc of expiredCases ?? []) {
      try {
        // Delete video from storage
        if (jc.video_storage_key) {
          await admin.storage.from(BUCKET).remove([jc.video_storage_key])
        }

        // Delete recruiter domain logs
        await admin.from('case_views').delete().eq('job_case_id', jc.id)

        // Delete proof items
        await admin.from('proof_items').delete().eq('source_case_id', jc.id)

        // Null personal fields, mark expired
        await admin.from('job_cases').update({
          status:               'expired',
          deleted_at:           now,
          job_posting_raw:      null,
          pitch_narrative:      null,
          requirement_evidence: null,
          test_answers:         null,
          video_storage_key:    null,
          video_duration_seconds: null,
        }).eq('id', jc.id)

        deleted++
      } catch (err) {
        console.error('Expiry cleanup error for case', jc.id, err)
        errors++
      }
    }

    // ── 3. Purge old IP rate limit records (> 2 hours) ────────────────────
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    await admin.from('ip_rate_limits').delete().lte('created_at', twoHoursAgo)

    return NextResponse.json({
      ok: true,
      expired: deleted,
      refunded,
      errors,
      timestamp: now,
    })
  } catch (err) {
    console.error('Cron cleanup fatal error:', err)
    return NextResponse.json({ error: 'Cleanup failed', errors }, { status: 500 })
  }
}
