import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createServerSupabase, checkAndDeductCredits } from '@/lib/supabase-server'
import { CREDIT_COST, MARKET } from '@/lib/constants'

// Deducts credits up-front for one live-voice session, then issues a
// short-lived HMAC token the client passes to Railway instead of the
// permanent secret — keeps RAILWAY_SECRET server-only.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body   = await req.json().catch(() => ({}))
    const market = body.market === MARKET.in ? MARKET.in : MARKET.eu

    const { ok, remaining } = await checkAndDeductCredits(
      user.id,
      CREDIT_COST.liveVoice,
      'live_voice',
      user.email,
      market,
    )

    if (!ok) return NextResponse.json({ error: 'Not enough credits', credits: remaining }, { status: 402 })

    // Issue a 5-minute HMAC token so the client can open the Railway WebSocket
    // without needing the permanent RAILWAY_SECRET in the browser bundle.
    const railwaySecret = process.env.RAILWAY_SECRET
    if (!railwaySecret) {
      console.error('[ai/voice-session] RAILWAY_SECRET not set')
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
    const ts       = Date.now()
    const wsToken  = createHmac('sha256', railwaySecret).update(`${user.id}:${ts}`).digest('hex')

    return NextResponse.json({ ok: true, remaining, wsToken, ts, uid: user.id })
  } catch (err) {
    console.error('[ai/voice-session]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
