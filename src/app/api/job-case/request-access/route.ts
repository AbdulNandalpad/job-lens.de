/**
 * POST /api/job-case/request-access
 * Recruiter submits their work email → receives a magic link to view the Job Case.
 *
 * GDPR:
 * - Recruiter full email is used ONLY to send the magic link, then discarded
 * - Only SHA-256 hash + domain stored in case_views table
 * - Rate limited: 5 requests per IP per hour (hashed IP stored, not plaintext)
 * - Candidate notified via view notification when token is actually used
 */
import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { createAdminSupabase } from '@/lib/supabase-server'
import { sendMagicLink, sendViewNotification } from '@/lib/job-case-email'

const MAX_REQUESTS_PER_HOUR = 5

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function getIpHash(req: NextRequest): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  return sha256(ip)
}

export async function POST(req: NextRequest) {
  try {
    const { slug, email } = await req.json()

    if (!slug || !email || !email.includes('@') || !email.includes('.')) {
      return NextResponse.json({ error: 'Valid slug and email required' }, { status: 400 })
    }

    const admin = createAdminSupabase()

    // Fetch the job case
    const { data: jobCase } = await admin
      .from('job_cases')
      .select('id, job_title, company_name, status, expires_at, consent_tracking')
      .eq('slug', slug)
      .single()

    if (!jobCase || jobCase.status !== 'active') {
      return NextResponse.json({ error: 'Job Case not found or expired' }, { status: 404 })
    }

    if (new Date(jobCase.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This Job Case has expired' }, { status: 410 })
    }

    // Rate limiting (hashed IP — never store plaintext IP)
    const ipHash = getIpHash(req)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { count } = await admin
      .from('ip_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .eq('endpoint', 'request-access')
      .gte('created_at', oneHourAgo)

    if ((count ?? 0) >= MAX_REQUESTS_PER_HOUR) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in an hour.' },
        { status: 429 }
      )
    }

    await admin.from('ip_rate_limits').insert({
      ip_hash:  ipHash,
      endpoint: 'request-access',
    })

    // GDPR: extract domain, hash email — never store plaintext
    const normalised      = email.toLowerCase().trim()
    const domain          = normalised.split('@')[1]
    const emailHash       = sha256(normalised)

    // Generate one-time magic token
    const rawToken        = randomBytes(32).toString('hex')
    const tokenHash       = sha256(rawToken)
    const tokenExpiresAt  = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    // Check for existing unused token for same email+case (avoid duplicate emails)
    const { data: existing } = await admin
      .from('case_views')
      .select('id, token_used_at')
      .eq('job_case_id', jobCase.id)
      .eq('recruiter_email_hash', emailHash)
      .is('token_used_at', null)
      .gte('token_expires_at', new Date().toISOString())
      .limit(1)
      .maybeSingle()

    if (existing) {
      // Token already sent and not yet used — don't double-send
      return NextResponse.json({ ok: true, message: 'Access link already sent to your email.' })
    }

    // Store view record. viewed_at and view_count are set only when the recruiter
    // actually clicks the magic link in /api/job-case/access/[token], ensuring the
    // auto-refund logic (triggered at view_count === 0) is not fooled by bot submissions.
    await admin.from('case_views').insert({
      job_case_id:          jobCase.id,
      recruiter_email_hash: emailHash,
      recruiter_domain:     domain,
      magic_token_hash:     tokenHash,
      token_expires_at:     tokenExpiresAt,
    })

    // Fetch candidate name for the email (from profiles table)
    const { data: candidateProfile } = await admin
      .from('profiles')
      .select('full_name, email')
      .eq('id', (await admin.from('job_cases').select('user_id').eq('id', jobCase.id).single()).data?.user_id)
      .maybeSingle()

    const candidateName = candidateProfile?.full_name ?? 'The candidate'

    // Send magic link — GDPR: recruiter email used only for this send, then discarded
    await sendMagicLink({
      toEmail:       normalised,
      candidateName,
      jobTitle:      jobCase.job_title,
      company:       jobCase.company_name ?? '',
      magicToken:    rawToken,
    })

    // Notify candidate (fire and forget — domain only, no recruiter email)
    if (candidateProfile?.email) {
      sendViewNotification({
        candidateEmail:  candidateProfile.email,
        candidateName:   candidateProfile.full_name ?? 'there',
        jobTitle:        jobCase.job_title,
        recruiterDomain: domain,
      }).catch(err => console.error('View notification failed:', err))
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('/api/job-case/request-access error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
