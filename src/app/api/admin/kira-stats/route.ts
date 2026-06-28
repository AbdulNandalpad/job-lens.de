import { NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (ADMIN_EMAILS.length === 0 || !user || !ADMIN_EMAILS.includes((user.email || '').toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminSupabase()

  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const since1d = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: sessions } = await admin
    .from('kira_sessions')
    .select('mode, market, duration_s, exit_reason, retries, jobs_searched, created_at')
    .gte('created_at', since7d)
    .order('created_at', { ascending: false })
    .limit(500)

  if (!sessions) return NextResponse.json({ error: 'kira_sessions table not found — run migration' }, { status: 404 })

  const today    = sessions.filter(s => s.created_at >= since1d)
  const allWeek  = sessions

  const avgDuration = allWeek.length
    ? Math.round(allWeek.reduce((s, r) => s + (r.duration_s || 0), 0) / allWeek.length)
    : 0

  const modeCounts: Record<string, number> = {}
  for (const s of allWeek) modeCounts[s.mode || 'none'] = (modeCounts[s.mode || 'none'] || 0) + 1
  const topMode = Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

  const errorCount  = allWeek.filter(s => s.exit_reason === 'error').length
  const errorRate   = allWeek.length ? Math.round((errorCount / allWeek.length) * 100) : 0
  const totalJobSearches = allWeek.reduce((s, r) => s + (r.jobs_searched || 0), 0)
  const retried = allWeek.filter(s => s.retries > 0).length

  return NextResponse.json({
    sessions_today:  today.length,
    sessions_week:   allWeek.length,
    avg_duration_s:  avgDuration,
    top_mode:        topMode,
    error_rate_pct:  errorRate,
    job_searches:    totalJobSearches,
    retried_sessions: retried,
    recent:          allWeek.slice(0, 20),
  })
}
