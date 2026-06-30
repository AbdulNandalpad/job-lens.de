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
    .select('user_id, mode, market, duration_s, exit_reason, retries, jobs_searched, created_at, rating')
    .gte('created_at', since7d)
    .order('created_at', { ascending: false })
    .limit(500)

  if (!sessions) return NextResponse.json({ error: 'kira_sessions table not found — run migration' }, { status: 404 })

  const today   = sessions.filter(s => s.created_at >= since1d)
  const allWeek = sessions

  const avgDuration = allWeek.length
    ? Math.round(allWeek.reduce((s, r) => s + (r.duration_s || 0), 0) / allWeek.length)
    : 0

  const modeCounts: Record<string, number> = {}
  for (const s of allWeek) modeCounts[s.mode || 'none'] = (modeCounts[s.mode || 'none'] || 0) + 1
  const topMode = Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

  const errorCount = allWeek.filter(s => s.exit_reason === 'error').length
  const errorRate  = allWeek.length ? Math.round((errorCount / allWeek.length) * 100) : 0
  const totalJobSearches = allWeek.reduce((s, r) => s + (r.jobs_searched || 0), 0)
  const retried = allWeek.filter(s => s.retries > 0).length

  // Unique users who used Kira this week
  const uniqueUserIds = [...new Set(allWeek.map(s => s.user_id).filter(Boolean))]

  // Fetch profiles for name lookup
  const { data: profiles } = uniqueUserIds.length
    ? await admin.from('profiles').select('id, full_name').in('id', uniqueUserIds)
    : { data: [] }

  // Fetch auth users for email lookup (admin API)
  let emailMap: Record<string, string> = {}
  if (uniqueUserIds.length) {
    // listUsers returns up to 1000; sufficient for weekly unique users
    const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const relevant = new Set(uniqueUserIds)
    for (const u of authUsers ?? []) {
      if (relevant.has(u.id)) emailMap[u.id] = u.email ?? ''
    }
  }

  const nameMap: Record<string, string> = {}
  for (const p of profiles ?? []) nameMap[p.id] = p.full_name ?? ''

  // Enrich recent 50 sessions with user info
  const recent = allWeek.slice(0, 50).map(s => ({
    ...s,
    user_email: s.user_id ? (emailMap[s.user_id] ?? '') : '',
    user_name:  s.user_id ? (nameMap[s.user_id] ?? '') : '',
  }))

  // Per-user summary: who used Kira most this week
  const userSummary: Record<string, { email: string; name: string; sessions: number; last_at: string }> = {}
  for (const s of allWeek) {
    if (!s.user_id) continue
    if (!userSummary[s.user_id]) {
      userSummary[s.user_id] = {
        email:    emailMap[s.user_id] ?? '',
        name:     nameMap[s.user_id] ?? '',
        sessions: 0,
        last_at:  s.created_at,
      }
    }
    userSummary[s.user_id].sessions++
    if (s.created_at > userSummary[s.user_id].last_at) {
      userSummary[s.user_id].last_at = s.created_at
    }
  }

  const topUsers = Object.entries(userSummary)
    .map(([id, v]) => ({ user_id: id, ...v }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 20)

  return NextResponse.json({
    sessions_today:   today.length,
    sessions_week:    allWeek.length,
    avg_duration_s:   avgDuration,
    top_mode:         topMode,
    error_rate_pct:   errorRate,
    job_searches:     totalJobSearches,
    retried_sessions: retried,
    unique_users:     uniqueUserIds.length,
    recent,
    top_users:        topUsers,
  })
}
