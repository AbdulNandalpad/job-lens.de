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

  // Atomic check-and-deduct via DB function — eliminates TOCTOU race condition.
  // The function locks the profile row, checks balance, deducts, and logs usage
  // in a single transaction.
  const { data, error } = await admin.rpc('check_and_deduct_credits', {
    p_user_id: userId,
    p_cost:    cost,
    p_action:  action,
    p_market:  market,
  })

  if (error) {
    console.error('check_and_deduct_credits RPC failed:', error.message)
    return { ok: false, remaining: 0 }
  }

  const result = data as { ok: boolean; remaining: number; usedCrossMarket?: boolean; reason?: string }
  return { ok: result.ok, remaining: result.remaining, usedCrossMarket: result.usedCrossMarket }
}
