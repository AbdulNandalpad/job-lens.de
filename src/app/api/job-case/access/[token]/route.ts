/**
 * GET /api/job-case/access/[token]
 * Validates magic token, marks view, notifies candidate, redirects to case page.
 *
 * GDPR:
 * - Token is hashed on arrival — raw token never stored
 * - view_count incremented on job_cases (non-personal counter)
 * - recruiter_domain shown to candidate (not full email)
 * - Candidate receives email notification (domain only)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createAdminSupabase } from '@/lib/supabase-server'
import { sendViewNotification } from '@/lib/job-case-email'

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    if (!token) return NextResponse.redirect(new URL('/', req.url))

    const tokenHash = sha256(token)
    const admin = createAdminSupabase()

    const { data: view } = await admin
      .from('case_views')
      .select('id, job_case_id, recruiter_domain, token_used_at, token_expires_at')
      .eq('magic_token_hash', tokenHash)
      .maybeSingle()

    if (!view) {
      return NextResponse.redirect(new URL('/case/invalid-link', req.url))
    }

    // Already used
    if (view.token_used_at) {
      // Redirect to case anyway — recruiter may have refreshed
      const { data: jc } = await admin.from('job_cases').select('slug').eq('id', view.job_case_id).single()
      if (jc) return NextResponse.redirect(new URL(`/case/${jc.slug}?access=granted`, req.url))
      return NextResponse.redirect(new URL('/case/invalid-link', req.url))
    }

    // Expired
    if (new Date(view.token_expires_at) < new Date()) {
      return NextResponse.redirect(new URL('/case/invalid-link?reason=expired', req.url))
    }

    // Mark token as used
    await admin.from('case_views').update({
      token_used_at: new Date().toISOString(),
      viewed_at:     new Date().toISOString(),
    }).eq('id', view.id)

    // Increment view count
    await admin.rpc('increment_case_view_count', { case_id: view.job_case_id })

    // Fetch case + candidate info for notification
    const { data: jobCase } = await admin
      .from('job_cases')
      .select('slug, job_title, user_id')
      .eq('id', view.job_case_id)
      .single()

    if (jobCase) {
      const { data: candidate } = await admin
        .from('profiles')
        .select('full_name, email')
        .eq('id', jobCase.user_id)
        .maybeSingle()

      // Notify candidate (fire and forget — don't block the redirect)
      if (candidate?.email) {
        sendViewNotification({
          candidateEmail:  candidate.email,
          candidateName:   candidate.full_name ?? 'there',
          jobTitle:        jobCase.job_title,
          recruiterDomain: view.recruiter_domain,
        }).catch(err => console.error('View notification failed:', err))
      }

      return NextResponse.redirect(new URL(`/case/${jobCase.slug}?access=granted`, req.url))
    }

    return NextResponse.redirect(new URL('/case/invalid-link', req.url))
  } catch (err) {
    console.error('/api/job-case/access error:', err)
    return NextResponse.redirect(new URL('/case/invalid-link', req.url))
  }
}
