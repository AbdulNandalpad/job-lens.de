import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body       = await req.json().catch(() => ({}))
    const duration_s = Math.min(Number(body.duration_s) || 0, 600)
    const VALID_MODES    = new Set(['job_search','market_insights','cv_review','interview_prep','feature_help',''])
    const VALID_MARKETS  = new Set(['eu','in'])
    const VALID_EXITS    = new Set(['ended','timeout','error','disconnected','unknown'])
    const mode        = VALID_MODES.has(body.mode) ? String(body.mode) : ''
    const market      = VALID_MARKETS.has(body.market) ? String(body.market) : 'eu'
    const exit_reason = VALID_EXITS.has(body.exit_reason) ? String(body.exit_reason) : 'unknown'
    const retries     = Math.min(Number(body.retries) || 0, 10)
    const jobs_searched = Number(body.jobs_searched) || 0

    const admin = createAdminSupabase()
    const { data } = await admin.from('kira_sessions').insert({
      user_id: user.id,
      market,
      mode,
      duration_s,
      exit_reason,
      retries,
      jobs_searched,
    }).select('id').single()

    return NextResponse.json({ ok: true, session_id: data?.id ?? null })
  } catch (err) {
    console.error('[voice-session-end]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
