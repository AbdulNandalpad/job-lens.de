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
  action: string,
  userEmail?: string
): Promise<{ ok: boolean; remaining: number }> {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
  if (userEmail && adminEmails.includes(userEmail.toLowerCase())) {
    return { ok: true, remaining: 9999 }
  }

  const admin = createAdminSupabase()

  let currentCredits = 5

  const { data: profile } = await admin
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single()

  if (!profile) {
    // Profile not created yet — create it with 5 credits
    await admin.from('profiles').insert({ id: userId, credits: 5 })
  } else {
    currentCredits = profile.credits
  }

  if (currentCredits < cost) return { ok: false, remaining: currentCredits }

  const { error: updateError } = await admin
    .from('profiles')
    .update({ credits: currentCredits - cost })
    .eq('id', userId)

  if (updateError) {
    console.error('Credits update failed:', updateError.message)
    return { ok: false, remaining: currentCredits }
  }

  await admin
    .from('usage_events')
    .insert({ user_id: userId, action, credits_used: cost })

  return { ok: true, remaining: currentCredits - cost }
}
