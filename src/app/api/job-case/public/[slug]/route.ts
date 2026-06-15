/**
 * GET /api/job-case/public/[slug]
 * Fetches the public case data for the recruiter view page.
 * No auth required — access is gated by the magic link flow instead.
 * Only called after the recruiter has a valid ?access=granted query param
 * set by /api/job-case/access/[token].
 *
 * GDPR: returns no personal data beyond what the candidate explicitly shared.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const admin = createAdminSupabase()

    const { data: jobCase } = await admin
      .from('job_cases')
      .select(`
        id, slug, job_title, company_name,
        job_requirements, job_quality_score, match_score,
        pitch_narrative, requirement_evidence,
        test_answers, test_overall_score,
        view_count, created_at, expires_at, status,
        user_id, video_storage_key
      `)
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle()

    if (!jobCase) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (new Date(jobCase.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This Job Case has expired' }, { status: 410 })
    }

    // Fetch candidate public-safe profile fields only
    const { data: candidate } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', jobCase.user_id)
      .maybeSingle()

    // Generate a short-lived signed URL for the video (private bucket)
    let videoSignedUrl: string | null = null
    if (jobCase.video_storage_key) {
      const { data: signed } = await admin.storage
        .from('job-case-videos')
        .createSignedUrl(jobCase.video_storage_key, 1800) // 30-min expiry
      videoSignedUrl = signed?.signedUrl ?? null
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { video_storage_key, ...publicCase } = jobCase

    return NextResponse.json({
      ...publicCase,
      candidateName: candidate?.full_name ?? 'Candidate',
      videoSignedUrl,
    })
  } catch (err) {
    console.error('/api/job-case/public/[slug] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
