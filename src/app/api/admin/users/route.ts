import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

async function requireAdmin(req: NextRequest) {
  if (ADMIN_EMAILS.length === 0) return null
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
    .select('id, credits, eu_credits, in_credits, status, created_at, signup_country, market')
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
      signup_country: p?.signup_country ?? p?.market ?? null,
      market: p?.market ?? null,
    }
  })

  return NextResponse.json({ users: result })
}

// PATCH /api/admin/users — block/unblock a user, or adjust free credits
export async function PATCH(req: NextRequest) {
  const adminUser = await requireAdmin(req)
  if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, status, credits } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Invalid user id' }, { status: 400 })

  const admin = createAdminSupabase()

  // Fetch auth user so we have email for profile creation if needed
  const { data: { user: authUser }, error: authErr } = await admin.auth.admin.getUserById(id)
  if (authErr || !authUser) {
    console.error('Admin PATCH: auth user fetch failed', authErr?.message)
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Build only the fields being changed
  const patch: Record<string, unknown> = {}
  if (status !== undefined) patch.status = status
  if (credits !== undefined) {
    const n = Number(credits)
    if (!isFinite(n) || n < 0 || n > 10000) {
      return NextResponse.json({ error: 'credits must be between 0 and 10000' }, { status: 400 })
    }
    patch.credits = Math.floor(n)
  }

  // Upsert: provide all required profile fields so new rows are valid
  const { error } = await admin.from('profiles').upsert(
    {
      id,
      email: authUser.email ?? '',
      credits: 0,
      eu_credits: 0,
      in_credits: 0,
      ...patch,           // override with the field(s) being set
    },
    { onConflict: 'id' }  // update existing row, insert if missing
  )

  if (error) {
    console.error('Admin PATCH: upsert failed', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Audit log — non-blocking, best-effort
  admin.from('admin_audit_log').insert({
    admin_email: adminUser.email ?? 'unknown',
    action: 'user_patch',
    target_user_id: id,
    details: patch,
  }).then(() => null, () => null)

  return NextResponse.json({ ok: true })
}
