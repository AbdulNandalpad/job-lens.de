import { NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

// Which usage_events actions represent a user's first real feature try.
// Mirrors CREDIT_COST — kept as a literal list here so the funnel reads
// correctly even if new actions are added before this route is updated.
const FEATURE_ACTIONS = [
  'career_scan', 'india_ats_scan', 'india_career_scan_pro',
  'tailor_cv', 'cover_letter', 'auto_apply', 'visa_check',
  'interview_prep', 'salary_sim', 'ai_chat', 'live_voice', 'job_case',
]

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (ADMIN_EMAILS.length === 0 || !user || !ADMIN_EMAILS.includes((user.email || '').toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminSupabase()

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, market, created_at')

  const { data: events } = await admin
    .from('usage_events')
    .select('user_id, action, created_at')
    .not('action', 'like', 'refund_%')

  if (!profiles || !events) {
    return NextResponse.json({ error: 'Could not load profiles or usage_events' }, { status: 500 })
  }

  // Per-user action list, earliest-first
  const byUser: Record<string, { action: string; created_at: string }[]> = {}
  for (const e of events) {
    if (!e.user_id) continue
    ;(byUser[e.user_id] ||= []).push({ action: e.action, created_at: e.created_at })
  }
  for (const list of Object.values(byUser)) list.sort((a, b) => a.created_at.localeCompare(b.created_at))

  const totalSignups = profiles.length
  let neverUsed = 0
  let singleAction = 0
  let returned = 0
  const singleActionBreakdown: Record<string, number> = {}
  const firstActionBreakdown: Record<string, number> = {}

  for (const p of profiles) {
    const acts = byUser[p.id] || []
    if (acts.length === 0) { neverUsed++; continue }
    firstActionBreakdown[acts[0].action] = (firstActionBreakdown[acts[0].action] || 0) + 1
    if (acts.length === 1) {
      singleAction++
      singleActionBreakdown[acts[0].action] = (singleActionBreakdown[acts[0].action] || 0) + 1
    } else {
      returned++
    }
  }

  // Feature reach — distinct users per action, all-time, most-reached first
  const reach: Record<string, Set<string>> = {}
  for (const e of events) {
    if (!e.user_id || !FEATURE_ACTIONS.includes(e.action)) continue
    ;(reach[e.action] ||= new Set()).add(e.user_id)
  }
  const featureReach = Object.entries(reach)
    .map(([action, users]) => ({ action, users: users.size }))
    .sort((a, b) => b.users - a.users)

  return NextResponse.json({
    total_signups:     totalSignups,
    never_used_pct:    totalSignups ? Math.round((neverUsed / totalSignups) * 100) : 0,
    never_used_count:  neverUsed,
    single_action_pct: totalSignups ? Math.round((singleAction / totalSignups) * 100) : 0,
    single_action_count: singleAction,
    returned_pct:      totalSignups ? Math.round((returned / totalSignups) * 100) : 0,
    returned_count:    returned,
    single_action_breakdown: Object.entries(singleActionBreakdown).map(([action, count]) => ({ action, count })).sort((a, b) => b.count - a.count),
    first_action_breakdown:  Object.entries(firstActionBreakdown).map(([action, count]) => ({ action, count })).sort((a, b) => b.count - a.count),
    feature_reach: featureReach,
  })
}
