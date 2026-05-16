import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())

export async function GET(_req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Admin accounts bypass credit limits — show as unlimited
  if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return NextResponse.json({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name ?? '',
      avatar_url: user.user_metadata?.avatar_url ?? '',
      provider: user.app_metadata?.provider ?? 'google',
      credits: 9999,
      commonCredits: 9999,
      euCredits: 0,
      inCredits: 0,
      totalUsed: 0,
      status: 'admin',
      member_since: user.created_at,
      usage: [],
      isAdmin: true,
    })
  }

  const admin = createAdminSupabase()

  // Ensure profile exists
  const { data: profile } = await admin
    .from('profiles')
    .select('credits, eu_credits, in_credits, status, created_at')
    .eq('id', user.id)
    .single()

  if (!profile) {
    await admin.from('profiles').insert({ id: user.id, email: user.email, full_name: user.user_metadata?.full_name, avatar_url: user.user_metadata?.avatar_url, credits: 5, eu_credits: 0, in_credits: 0 })
  }

  const { data: events } = await admin
    .from('usage_events')
    .select('action, credits_used, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  const commonCredits = profile?.credits ?? 0
  const euCredits = profile?.eu_credits ?? 0
  const inCredits = profile?.in_credits ?? 0
  const totalCredits = commonCredits + euCredits + inCredits
  const totalUsed = (events ?? []).filter((e: { action: string }) => !e.action.startsWith('refund_')).reduce((s: number, e: { credits_used: number }) => s + (e.credits_used ?? 0), 0)

  return NextResponse.json({
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name ?? '',
    avatar_url: user.user_metadata?.avatar_url ?? '',
    provider: user.app_metadata?.provider ?? 'google',
    credits: totalCredits,
    commonCredits,
    euCredits,
    inCredits,
    totalUsed,
    status: profile?.status ?? 'active',
    member_since: profile?.created_at ?? user.created_at,
    usage: events ?? [],
  })
}
