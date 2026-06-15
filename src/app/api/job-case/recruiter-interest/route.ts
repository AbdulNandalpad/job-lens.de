/**
 * POST /api/job-case/recruiter-interest
 *
 * Called when a recruiter explicitly consents to share their email with the
 * candidate. Requires the jl_cv cookie set at magic-link click time — this
 * ties the request to a verified view without re-collecting credentials.
 *
 * GDPR:
 * - recruiter_email stored only after explicit, logged consent (consent_given_at)
 * - email is forwarded to the candidate and stored in case_views for audit trail
 * - deleted with the job case after 30 days
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-server'
import { sendInterestNotification } from '@/lib/job-case-email'

export async function POST(req: NextRequest) {
  try {
    const { recruiterEmail, consent, slug } = await req.json()

    if (!recruiterEmail || !consent || !slug) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (consent !== true) {
      return NextResponse.json({ error: 'Consent required' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(recruiterEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Identify this view from the cookie set at magic-link click
    const viewId = req.cookies.get('jl_cv')?.value
    if (!viewId) {
      return NextResponse.json({ error: 'Session expired — please reopen the job case link from your email' }, { status: 401 })
    }

    const admin = createAdminSupabase()

    // Fetch the view record
    const { data: view } = await admin
      .from('case_views')
      .select('id, job_case_id, recruiter_domain, interest_expressed_at')
      .eq('id', viewId)
      .maybeSingle()

    if (!view) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Validate domain — recruiter can only share an email matching the domain
    // that was verified at magic-link request time
    const submittedDomain = recruiterEmail.split('@')[1]?.toLowerCase()
    if (submittedDomain !== view.recruiter_domain?.toLowerCase()) {
      return NextResponse.json(
        { error: `Email must be from @${view.recruiter_domain}` },
        { status: 400 }
      )
    }

    // Idempotent — ignore double-submits
    if (view.interest_expressed_at) {
      return NextResponse.json({ ok: true, alreadySent: true })
    }

    const now = new Date().toISOString()

    // Store consent + email in case_views (audit trail)
    await admin.from('case_views').update({
      recruiter_email:        recruiterEmail,
      interest_expressed_at:  now,
      consent_given_at:       now,
    }).eq('id', viewId)

    // Mark job case as interested
    await admin.from('job_cases')
      .update({ status: 'interested' })
      .eq('id', view.job_case_id)

    // Fetch candidate details to send notification
    const { data: jobCase } = await admin
      .from('job_cases')
      .select('job_title, company_name, user_id')
      .eq('id', view.job_case_id)
      .single()

    if (jobCase) {
      const { data: candidate } = await admin
        .from('profiles')
        .select('full_name, email')
        .eq('id', jobCase.user_id)
        .maybeSingle()

      if (candidate?.email) {
        sendInterestNotification({
          candidateEmail:  candidate.email,
          candidateName:   candidate.full_name ?? 'there',
          jobTitle:        jobCase.job_title,
          company:         jobCase.company_name,
          recruiterEmail,
          recruiterDomain: view.recruiter_domain,
        }).catch(err => console.error('Interest notification failed:', err))
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('/api/job-case/recruiter-interest error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
