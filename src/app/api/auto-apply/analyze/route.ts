import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { analyzeForm } from '@/lib/auto-apply-engine'
import { createServerSupabase, checkAndDeductCredits } from '@/lib/supabase-server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const COST = 3

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const credits = await checkAndDeductCredits(user.id, COST, 'auto_apply')
  if (!credits.ok) {
    return NextResponse.json({ error: 'Insufficient credits', credits: credits.remaining, required: COST }, { status: 402 })
  }

  try {
    const { jobUrl, cvText, coverLetter } = await req.json()

    if (!jobUrl || !cvText) {
      return NextResponse.json({ error: 'jobUrl and cvText are required' }, { status: 400 })
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
