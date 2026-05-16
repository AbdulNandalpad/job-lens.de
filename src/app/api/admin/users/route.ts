import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())

async function requireAdmin(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !ADMIN_EMAILS.includes((user.email || '').toLowerCase())) return null
  return user
}

// GET /api/admin/users — list all users with profile data
export async function GET(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminSupabase()

  const { data: { users }, error } = await admin.auth.admin.listUsers({ perPage: 200 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = users.map(u => u.id)
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, credits, eu_credits, in_credits, status, created_at')
    .in('id', ids)

  const { data: usageRaw } = await admin
    .from('usage_events')
    .select('user_id, credits_used, action')
    .in('user_id', ids)

  const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
  const usageMap: Record<string, number> = {}
  for (const e of usageRaw || []) {
    if (!e.action?.startsWith('refund_')) {
      usageMap[e.user_id] = (usageMap[e.user_id] || 0) + (e.credits_used ?? 0)
    }
  }

  const result = users.map(u => {
    const p = profileMap[u.id]
    const commonCredits = p?.credits ?? 0
    const euCredits = p?.eu_credits ?? 0
    const inCredits = p?.in_credits ?? 0
    return {
      id: u.id,
      email: u.email,
      name: u.user_metadata?.full_name ?? '',
      provider: u.app_metadata?.provider ?? 'unknown',
      credits: commonCredits,
      euCredits,
      inCredits,
      totalCredits: commonCredits + euCredits + inCredits,
      status: p?.status ?? 'active',
      credits_spent: usageMap[u.id] || 0,
      isAdmin: ADMIN_EMAILS.includes((u.email || '').toLowerCase()),
      created_at: u.created_at,
      last_sign_in: u.last_sign_in_at,
    }
  })

  return NextResponse.json({ users: result })
}

// PATCH /api/admin/users — block/unblock a user, or adjust free credits
export async function PATCH(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, status, credits } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const admin = createAdminSupabase()
  const updates: Record<string, unknown> = {}
  if (status !== undefined) updates.status = status
  if (credits !== undefined) updates.credits = credits

  // try update first; if no row exists yet, insert with safe defaults
  const { data: existing } = await admin.from('profiles').select('id').eq('id', id).single()
  let error
  if (existing) {
    ;({ error } = await admin.from('profiles').update(updates).eq('id', id))
  } else {
    ;({ error } = await admin.from('profiles').insert({ id, credits: 0, eu_credits: 0, in_credits: 0, ...updates }))
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
