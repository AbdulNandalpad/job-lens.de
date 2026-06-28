import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body       = await req.json().catch(() => ({}))
    const duration_s = Math.min(Number(body.duration_s) || 0, 600)
    const mode       = String(body.mode || '').slice(0, 50)
    const market     = String(body.market || 'eu').slice(0, 5)
    const exit_reason = String(body.exit_reason || 'unknown').slice(0, 30)
    const retries    = Math.min(Number(body.retries) || 0, 10)
    const jobs_searched = Number(body.jobs_searched) || 0

    const admin = createAdminSupabase()
    await admin.from('kira_sessions').insert({
      user_id: user.id,
      market,
      mode,
      duration_s,
      exit_reason,
      retries,
      jobs_searched,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[voice-session-end]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
