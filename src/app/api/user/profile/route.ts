import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'

export async function GET(_req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  const commonCredits = profile?.credits ?? 5
  const euCredits = profile?.eu_credits ?? 0
  const inCredits = profile?.in_credits ?? 0
  const totalCredits = commonCredits + euCredits + inCredits

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
    status: profile?.status ?? 'active',
    member_since: profile?.created_at ?? user.created_at,
    usage: events ?? [],
  })
}
