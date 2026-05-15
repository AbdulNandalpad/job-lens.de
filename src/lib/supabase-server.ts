import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

export function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function refundCredits(
  userId: string,
  amount: number,
  action: string
): Promise<void> {
  try {
    const admin = createAdminSupabase()
    const { data: profile } = await admin.from('profiles').select('credits').eq('id', userId).single()
    if (!profile) return
    await admin.from('profiles').update({ credits: (profile.credits ?? 0) + amount }).eq('id', userId)
    await admin.from('usage_events').insert({ user_id: userId, action: `refund_${action}`, credits_used: -amount })
  } catch (err) {
    console.error('Credit refund failed:', err)
  }
}

export async function checkAndDeductCredits(
  userId: string,
  cost: number,
  action: string,
  userEmail?: string,
  market: 'eu' | 'in' = 'eu'
): Promise<{ ok: boolean; remaining: number; usedCrossMarket?: boolean }> {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
  if (userEmail && adminEmails.includes(userEmail.toLowerCase())) {
    return { ok: true, remaining: 9999 }
  }

  const admin = createAdminSupabase()

  // Fetch current credits (all three pools)
  const { data: profile, error: fetchError } = await admin
    .from('profiles')
    .select('credits, eu_credits, in_credits')
    .eq('id', userId)
    .single()

  if (fetchError?.code === 'PGRST116') {
    // No profile yet — create with 5 starter credits
    const { data: inserted, error: insertError } = await admin
      .from('profiles')
      .insert({ id: userId, credits: 5, eu_credits: 0, in_credits: 0 })
      .select('credits, eu_credits, in_credits')
      .single()
    if (insertError) {
      console.error('Profile insert failed:', insertError.message)
      return { ok: false, remaining: 0 }
    }
    const total = (inserted?.credits ?? 0) + (inserted?.eu_credits ?? 0) + (inserted?.in_credits ?? 0)
    if (total < cost) return { ok: false, remaining: total }
  } else if (fetchError) {
    console.error('Profile fetch error:', fetchError.message)
    return { ok: false, remaining: 0 }
  }

  // Treat null credits as 5 starter credits, paid pools default to 0
  let common = profile?.credits ?? 5
  let eu = profile?.eu_credits ?? 0
  let inPool = profile?.in_credits ?? 0
  const total = common + eu + inPool

  if (total < cost) return { ok: false, remaining: total }

  // Drain order: common → native paid → cross-market paid
  let remaining = cost
  let usedCrossMarket = false

  // 1. Drain common pool
  const fromCommon = Math.min(common, remaining)
  common -= fromCommon
  remaining -= fromCommon

  if (remaining > 0) {
    // 2. Drain native paid pool
    if (market === 'eu') {
      const fromEu = Math.min(eu, remaining)
      eu -= fromEu
      remaining -= fromEu
    } else {
      const fromIn = Math.min(inPool, remaining)
      inPool -= fromIn
      remaining -= fromIn
    }
  }

  if (remaining > 0) {
    // 3. Drain cross-market paid pool
    usedCrossMarket = true
    if (market === 'eu') {
      inPool -= remaining
    } else {
      eu -= remaining
    }
    remaining = 0
  }

  const newTotal = common + eu + inPool

  const { error: updateError } = await admin
    .from('profiles')
    .update({ credits: common, eu_credits: eu, in_credits: inPool })
    .eq('id', userId)

  if (updateError) {
    console.error('Credits update failed:', updateError.message)
    return { ok: false, remaining: total }
  }

  await admin
    .from('usage_events')
    .insert({ user_id: userId, action, credits_used: cost })

  return { ok: true, remaining: newTotal, usedCrossMarket }
}
