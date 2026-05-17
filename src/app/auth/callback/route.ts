import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

function safeNext(next: string | null): string {
  if (!next) return ''
  // Must be an internal path — no protocol, no external domains
  if (!next.startsWith('/') || next.startsWith('//')) return ''
  return next
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // Query param may be stripped if the full URL wasn't in Supabase's allowlist.
  // Fall back to the cookie the login page set just before redirecting to Google.
  let nextRaw = searchParams.get('next')
  if (!nextRaw) {
    const cookieStore = await cookies()
    const cookieVal = cookieStore.get('jl_login_next')?.value
    if (cookieVal) nextRaw = decodeURIComponent(cookieVal)
  }
  const next = safeNext(nextRaw)

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Stamp market on profile based on which route the user came from
      const market = next.startsWith('/in') ? 'in' : 'de'
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
      await admin
        .from('profiles')
        .upsert({ id: data.user.id, market }, { onConflict: 'id', ignoreDuplicates: false })

      // Never land on /in directly — it's a server component that races the
      // freshly-set session cookie and may show the marketing page instead of
      // the dashboard. Send India users to a middleware-protected page instead.
      const rawDest = next || (market === 'in' ? '/in/career-scan' : '/app')
      const destination = rawDest === '/in' ? '/in/career-scan' : rawDest
      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
