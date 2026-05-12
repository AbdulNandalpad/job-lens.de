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

export async function checkAndDeductCredits(
  userId: string,
  cost: number,
  action: string
): Promise<{ ok: boolean; remaining: number }> {
  const admin = createAdminSupabase()

  const { data: profile } = await admin
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single()

  if (!profile) {
    // Profile not created yet (old user) — create it with 5 credits
    await admin.from('profiles').insert({ id: userId, credits: 5 })
    if (5 < cost) return { ok: false, remaining: 5 }
    await admin.from('profiles').update({ credits: 5 - cost }).eq('id', userId)
    await admin.from('usage_events').insert({ user_id: userId, action, credits_used: cost })
    return { ok: true, remaining: 5 - cost }
  }

  if (profile.credits < cost) return { ok: false, remaining: profile.credits }

  await admin
    .from('profiles')
    .update({ credits: profile.credits - cost, updated_at: new Date().toISOString() })
    .eq('id', userId)

  await admin
    .from('usage_events')
    .insert({ user_id: userId, action, credits_used: cost })

  return { ok: true, remaining: profile.credits - cost }
}
