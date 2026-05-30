import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, checkAndDeductCredits } from '@/lib/supabase-server'
import { CREDIT_COST, MARKET } from '@/lib/constants'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await req.json()
    const market = body.market === MARKET.in ? MARKET.in : MARKET.eu

    const { ok, message } = await checkAndDeductCredits(
      user.id,
      CREDIT_COST.interviewCoach,
      'interview_coaching',
      user.email,
      market,
    )

    if (!ok) return NextResponse.json({ error: message || 'Not enough credits' }, { status: 402 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[interview/coaching]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
