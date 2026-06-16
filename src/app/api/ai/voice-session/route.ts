import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, checkAndDeductCredits } from '@/lib/supabase-server'
import { CREDIT_COST, MARKET } from '@/lib/constants'

// Deducts credits up-front for one live-voice (Realtime API) session.
// Called by the client immediately before opening the WebSocket.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const market = body.market === MARKET.in ? MARKET.in : MARKET.eu

    const { ok, remaining } = await checkAndDeductCredits(
      user.id,
      CREDIT_COST.liveVoice,
      'live_voice',
      user.email,
      market,
    )

    if (!ok) return NextResponse.json({ error: 'Not enough credits', credits: remaining }, { status: 402 })

    return NextResponse.json({ ok: true, remaining })
  } catch (err) {
    console.error('[ai/voice-session]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
