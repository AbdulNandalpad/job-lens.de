import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, checkAndDeductCredits } from '@/lib/supabase-server'
import { CREDIT_COST } from '@/lib/constants'

const COST = CREDIT_COST.autoApply
const SSRF_RE = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|169\.254\.|::1$|fc[0-9a-f]{2}:|fd)/i

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const jobUrl      = typeof body.jobUrl      === 'string' ? body.jobUrl.trim()   : ''
  const cvText      = typeof body.cvText      === 'string' ? body.cvText          : ''
  const coverLetter = typeof body.coverLetter === 'string' ? body.coverLetter     : ''
  const market      = typeof body.market      === 'string' ? body.market          : 'eu'

  if (!jobUrl || !cvText) {
    return NextResponse.json({ error: 'jobUrl and cvText are required' }, { status: 400 })
  }
  if (!jobUrl.startsWith('https://')) {
    return NextResponse.json({ error: 'jobUrl must start with https://' }, { status: 400 })
  }
  try {
    const h = new URL(jobUrl).hostname
    if (SSRF_RE.test(h)) return NextResponse.json({ error: 'Invalid job URL' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Invalid job URL' }, { status: 400 })
  }

  const credits = await checkAndDeductCredits(user.id, COST, 'auto_apply', user.email ?? '', market)
  if (!credits.ok) {
    return NextResponse.json({ error: 'Insufficient credits', credits: credits.remaining, required: COST }, { status: 402 })
  }

  const railwayUrl = process.env.RAILWAY_BROWSER_URL
  const railwaySecret = process.env.BROWSER_SECRET

  if (railwayUrl && railwaySecret) {
    try {
      const res = await fetch(`${railwayUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${railwaySecret}`,
        },
        body: JSON.stringify({ jobUrl, cvText, coverLetter }),
        signal: AbortSignal.timeout(90_000),
      })
      const data = await res.json()
      if (!res.ok) return NextResponse.json({ error: data.error || 'Browser service error' }, { status: res.status })
      return NextResponse.json({ ...data, creditsRemaining: credits.remaining })
    } catch (err) {
      console.error('[auto-apply/analyze] Railway call failed:', err)
      return NextResponse.json({ error: 'Browser service unavailable. Please try again.' }, { status: 503 })
    }
  }

  // Local fallback (dev only — Playwright not available on Vercel)
  if (process.env.NEXT_PUBLIC_AUTO_APPLY_ENABLED === 'true') {
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const { analyzeForm } = await import('@/lib/auto-apply-engine')
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const result = await analyzeForm(jobUrl, cvText, coverLetter || undefined, anthropic)
      return NextResponse.json({ ...result, creditsRemaining: credits.remaining })
    } catch (err) {
      console.error('[auto-apply/analyze]', err)
      return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Auto Apply is not yet configured. Please check back soon.' }, { status: 503 })
}
