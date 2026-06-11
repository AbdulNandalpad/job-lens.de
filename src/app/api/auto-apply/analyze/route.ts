import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { analyzeForm } from '@/lib/auto-apply-engine'
import { createServerSupabase, checkAndDeductCredits } from '@/lib/supabase-server'
import { CREDIT_COST, MARKET } from '@/lib/constants'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const COST = CREDIT_COST.autoApply

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const credits = await checkAndDeductCredits(user.id, COST, 'auto_apply', user.email ?? '', MARKET.eu)
  if (!credits.ok) {
    return NextResponse.json({ error: 'Insufficient credits', credits: credits.remaining, required: COST }, { status: 402 })
  }

  try {
    const body = await req.json()
    const jobUrl     = typeof body.jobUrl     === 'string' ? body.jobUrl     : ''
    const cvText     = typeof body.cvText     === 'string' ? body.cvText     : ''
    const coverLetter = typeof body.coverLetter === 'string' ? body.coverLetter : undefined

    if (!jobUrl || !cvText) {
      return NextResponse.json({ error: 'jobUrl and cvText are required' }, { status: 400 })
    }

    if (!jobUrl.startsWith('https://')) {
      return NextResponse.json({ error: 'jobUrl must be a valid https URL' }, { status: 400 })
    }
    // Block SSRF to private/internal IP ranges
    try {
      const parsed = new URL(jobUrl)
      const h = parsed.hostname
      if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|169\.254\.|::1$|fc[0-9a-f]{2}:|fd)/i.test(h)) {
        return NextResponse.json({ error: 'Invalid job URL' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid job URL' }, { status: 400 })
    }

    const result = await analyzeForm(jobUrl, cvText, coverLetter ?? undefined, anthropic)
    return NextResponse.json({ ...result, creditsRemaining: credits.remaining })
  } catch (err) {
    console.error('[auto-apply/analyze]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
