import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * Normalise a Gmail address to its canonical form so dot-tricks and
 * plus-aliases cannot be used to bypass the one-account-per-person limit.
 * Non-Gmail addresses are returned lowercased unchanged.
 *
 * Examples:
 *   j.o.h.n+alias@gmail.com  → john@gmail.com
 *   john@googlemail.com       → john@gmail.com
 *   john@outlook.com          → john@outlook.com
 */
export function normalizeEmail(email: string): string {
  const lower = email.toLowerCase().trim()
  const atIdx = lower.lastIndexOf('@')
  if (atIdx < 0) return lower

  const local  = lower.slice(0, atIdx)
  const domain = lower.slice(atIdx + 1)

  const isGmail = domain === 'gmail.com' || domain === 'googlemail.com'
  if (!isGmail) return lower

  const stripped = local.split('+')[0].replace(/\./g, '')
  return `${stripped}@gmail.com`
}

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

  // Fetch current credits, paid pools, and status
  const { data: profile, error: fetchError } = await admin
    .from('profiles')
    .select('credits, eu_credits, in_credits, status')
    .eq('id', userId)
    .single()

  if (fetchError?.code === 'PGRST116') {
    // Profile missing at API time — should have been created by the auth callback.
    // Grant 0 credits here: the callback is the only legitimate free-credit path.
    const { error: insertError } = await admin
      .from('profiles')
      .insert({ id: userId, credits: 0, eu_credits: 0, in_credits: 0 })
    if (insertError) {
      console.error('Profile insert failed:', insertError.message)
      return { ok: false, remaining: 0 }
    }
    return { ok: false, remaining: 0 }
  } else if (fetchError) {
    console.error('Profile fetch error:', fetchError.message)
    return { ok: false, remaining: 0 }
  }

  // Block if admin has set status to blocked
  if (profile?.status === 'blocked') {
    return { ok: false, remaining: 0 }
  }

  // null credits = 0 (not 5) — never grant free credits due to missing data
  let common = profile?.credits ?? 0
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
