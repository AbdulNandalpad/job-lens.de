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

export async function GET(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminSupabase()

  const { data, error } = await admin
    .from('purchase_events')
    .select('id, user_id, paypal_txn_id, paypal_payer_email, amount_eur, credits_added, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    // Table doesn't exist yet — return empty list gracefully
    if (error.code === '42P01') return NextResponse.json({ purchases: [], missing_table: true })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Enrich with user email where possible
  const userIds = [...new Set((data || []).map(p => p.user_id).filter(Boolean))]
  let emailMap: Record<string, string> = {}
  if (userIds.length > 0) {
    try {
      const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 500 })
      emailMap = Object.fromEntries(users.map(u => [u.id, u.email ?? '']))
    } catch { }
  }

  const purchases = (data || []).map(p => ({
    ...p,
    user_email: emailMap[p.user_id] ?? p.paypal_payer_email ?? '—',
  }))

  return NextResponse.json({ purchases })
}
