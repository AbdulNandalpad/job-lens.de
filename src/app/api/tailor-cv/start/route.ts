import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createServerSupabase, createAdminSupabase, peekCredits, isUserRateLimited } from '@/lib/supabase-server'
import { CREDIT_COST, MARKET, USAGE_ACTION } from '@/lib/constants'
import { jobKey, resolveBundle } from '@/lib/pricing'

export const maxDuration = 15

const COST = CREDIT_COST.tailorCv

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (await isUserRateLimited(user.id, 'tailor_cv', 10)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 })
  }

  const railwayUrl = process.env.RAILWAY_BROWSER_URL
  const railwaySecret = process.env.BROWSER_SECRET
  if (!railwayUrl || !railwaySecret) {
    return NextResponse.json({ error: 'CV generation service is not configured.' }, { status: 503 })
  }

  const body = await req.json()
  const cvText    = typeof body.cvText    === 'string' ? body.cvText                  : ''
  const feedback  = typeof body.feedback  === 'string' ? body.feedback.slice(0, 500)   : ''
  const currentCv = typeof body.currentCv === 'string' ? body.currentCv                : ''
  const confirmedSkills: string[] = Array.isArray(body.confirmedSkills)
    ? body.confirmedSkills.map((s: unknown) => String(s).slice(0, 60)).slice(0, 20)
    : []
  const { job, tone, pages, lang, market } = body
  const resolvedMarket: 'eu' | 'in' = market === MARKET.in ? MARKET.in : MARKET.eu
  const isRevision = !!(feedback && currentCv)

  if (!cvText.trim()) {
    return NextResponse.json({ error: 'CV text is required' }, { status: 400 })
  }

  // Same pricing logic as /api/tailor-cv — a fresh tailoring always costs COST, a revision
  // is included while the job's package still has changes left.
  const key = jobKey(job)
  let cost: number = COST
  let action: string = USAGE_ACTION.tailorCv
  if (isRevision) {
    const bundle = await resolveBundle(user.id, key)
    if (bundle.active && bundle.revisionsLeft > 0) { cost = 0; action = USAGE_ACTION.tailorCvRevision }
  }

  // Affordability is only a pre-flight UX check here — the real, atomic deduction happens
  // in /api/tailor-cv/status once generation succeeds, so a Railway-side failure or an
  // abandoned poll never charges for nothing delivered.
  const afford = await peekCredits(user.id, cost, user.email ?? '')
  if (!afford.ok) {
    return NextResponse.json({ error: 'Insufficient credits', credits: afford.remaining, required: cost }, { status: 402 })
  }

  const jobId = randomUUID()
  const admin = createAdminSupabase()
  const { error: insertErr } = await admin.from('ai_generation_jobs').insert({
    id: jobId, user_id: user.id, kind: 'tailor_cv', cost, action, market: resolvedMarket, job_key: key,
  })
  if (insertErr) {
    console.error('[tailor-cv/start] job insert failed:', insertErr.message)
    return NextResponse.json({ error: 'Could not start generation — please try again.' }, { status: 500 })
  }

  try {
    const res = await fetch(`${railwayUrl}/tailor-cv/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${railwaySecret}` },
      body: JSON.stringify({
        jobId,
        input: { cvText, job, tone, pages, lang, confirmedSkills, feedback, currentCv },
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      await admin.from('ai_generation_jobs').delete().eq('id', jobId)
      return NextResponse.json({ error: 'CV generation service is unavailable. Please try again.' }, { status: 503 })
    }
  } catch (err) {
    console.error('[tailor-cv/start] Railway call failed:', err)
    await admin.from('ai_generation_jobs').delete().eq('id', jobId)
    return NextResponse.json({ error: 'CV generation service is unavailable. Please try again.' }, { status: 503 })
  }

  return NextResponse.json({ jobId }, { status: 202 })
}
