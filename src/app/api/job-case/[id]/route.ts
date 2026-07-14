/**
 * DELETE /api/job-case/[id]
 * Hard deletes a Job Case — removes all personal data immediately.
 *
 * GDPR Article 17 (Right to Erasure):
 * 1. Delete video from Supabase Storage
 * 2. Delete case_views records (recruiter domain logs)
 * 3. Null all personal fields on job_cases row
 * 4. Delete proof_items sourced from this case
 * 5. Retain credit_transactions + consent_timestamp for legal obligations
 *    (financial records 7yr HGB §257, consent records 3yr)
 *
 * Target: immediate erasure (< 1 minute).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'
import { decrypt, decryptJson } from '@/lib/encryption'

const BUCKET = 'job-case-videos'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminSupabase()

    // Verify ownership
    const { data: jobCase } = await admin
      .from('job_cases')
      .select('id, user_id, video_storage_key, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!jobCase) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (jobCase.status === 'deleted') return NextResponse.json({ ok: true }) // already deleted

    // 1. Delete video from private storage
    if (jobCase.video_storage_key) {
      const { error: storageErr } = await admin.storage
        .from(BUCKET)
        .remove([jobCase.video_storage_key])
      if (storageErr) console.error('Video deletion error:', storageErr)
    }

    // 2. Delete case_views (recruiter domain logs)
    await admin.from('case_views').delete().eq('job_case_id', id)

    // 3. Delete proof_items sourced from this case
    await admin.from('proof_items').delete().eq('source_case_id', id)

    // 4. Null all personal fields — retain row for credit transaction FK integrity
    //    consent_timestamp retained for GDPR compliance record (3yr obligation)
    await admin.from('job_cases').update({
      status:               'deleted',
      deleted_at:           new Date().toISOString(),
      // Personal data erased:
      job_posting_raw:      null,
      pitch_narrative:      null,
      requirement_evidence: null,
      test_answers:         null,
      video_storage_key:    null,
      video_duration_seconds: null,
      // Non-personal fields retained for audit:
      // job_title, company_name, job_requirements, match_score,
      // test_overall_score, consent_timestamp, consent_version, view_count
    }).eq('id', id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('/api/job-case/[id] DELETE error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * GET /api/job-case/[id]
 * Fetches a single Job Case for the owner (candidate dashboard view).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminSupabase()
    const { data: jobCase } = await admin
      .from('job_cases')
      .select(`
        id, slug, job_title, company_name, job_requirements,
        job_quality_score, match_score, pitch_narrative,
        requirement_evidence, test_answers, test_overall_score,
        status, view_count, created_at, expires_at
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .neq('status', 'deleted')
      .maybeSingle()

    if (!jobCase) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Fetch viewer domains for the candidate
    const { data: views } = await admin
      .from('case_views')
      .select('recruiter_domain, viewed_at')
      .eq('job_case_id', id)
      .not('viewed_at', 'is', null)
      .order('viewed_at', { ascending: false })

    return NextResponse.json({
      ...jobCase,
      pitch_narrative:      decrypt(jobCase.pitch_narrative),
      requirement_evidence: decryptJson(jobCase.requirement_evidence) ?? jobCase.requirement_evidence,
      test_answers:         decryptJson(jobCase.test_answers) ?? jobCase.test_answers,
      viewerDomains:        views?.map(v => v.recruiter_domain) ?? [],
    })
  } catch (err) {
    console.error('/api/job-case/[id] GET error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
