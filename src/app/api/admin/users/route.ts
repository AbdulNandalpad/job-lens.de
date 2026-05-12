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
  const { data: profiles } = await admin.from('profiles').select('id, credits, status, created_at').in('id', ids)
  const { data: usageRaw } = await admin
    .from('usage_events')
    .select('user_id, credits_used')
    .in('user_id', ids)

  const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
  const usageMap: Record<string, number> = {}
  for (const e of usageRaw || []) {
    usageMap[e.user_id] = (usageMap[e.user_id] || 0) + e.credits_used
  }

  const result = users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.user_metadata?.full_name ?? '',
    provider: u.app_metadata?.provider ?? 'unknown',
    credits: profileMap[u.id]?.credits ?? 5,
    status: profileMap[u.id]?.status ?? 'active',
    credits_spent: usageMap[u.id] || 0,
    created_at: u.created_at,
    last_sign_in: u.last_sign_in_at,
  }))

  return NextResponse.json({ users: result })
}

// PATCH /api/admin/users — block or unblock a user, or adjust credits
export async function PATCH(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, status, credits } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const admin = createAdminSupabase()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (status !== undefined) updates.status = status
  if (credits !== undefined) updates.credits = credits

  const { error } = await admin.from('profiles').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
