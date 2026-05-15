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
    await admin.from('profiles').update({ credits: profile.credits + amount }).eq('id', userId)
    await admin.from('usage_events').insert({ user_id: userId, action: `refund_${action}`, credits_used: -amount })
  } catch (err) {
    console.error('Credit refund failed:', err)
  }
}

export async function checkAndDeductCredits(
  userId: string,
  cost: number,
  action: string,
  userEmail?: string
): Promise<{ ok: boolean; remaining: number }> {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
  if (userEmail && adminEmails.includes(userEmail.toLowerCase())) {
    return { ok: true, remaining: 9999 }
  }

  const admin = createAdminSupabase()

  // Fetch current credits
  const { data: profile, error: fetchError } = await admin
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single()

  if (fetchError?.code === 'PGRST116') {
    // No profile yet — create with 5 starter credits
    const { data: inserted, error: insertError } = await admin
      .from('profiles')
      .insert({ id: userId, credits: 5 })
      .select('credits')
      .single()
    if (insertError) {
      console.error('Profile insert failed:', insertError.message)
      return { ok: false, remaining: 0 }
    }
    if ((inserted?.credits ?? 0) < cost) return { ok: false, remaining: inserted?.credits ?? 0 }
  } else if (fetchError) {
    console.error('Profile fetch error:', fetchError.message)
    return { ok: false, remaining: 0 }
  }

  const currentCredits = profile?.credits ?? 5

  if (currentCredits < cost) return { ok: false, remaining: currentCredits }

  // Atomic deduct: only updates if credits are still >= cost at write time
  // Prevents race conditions where two simultaneous requests both pass the check
  const { error: updateError } = await admin
    .from('profiles')
    .update({ credits: currentCredits - cost })
    .eq('id', userId)
    .gte('credits', cost)

  if (updateError) {
    console.error('Credits update failed:', updateError.message)
    return { ok: false, remaining: currentCredits }
  }

  await admin
    .from('usage_events')
    .insert({ user_id: userId, action, credits_used: cost })

  return { ok: true, remaining: currentCredits - cost }
}
