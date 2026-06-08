import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { normalizeEmail } from '@/lib/supabase-server'

function safeNext(next: string | null): string {
  if (!next) return ''
  // Must be an internal path — no protocol, no external domains
  if (!next.startsWith('/') || next.startsWith('//')) return ''
  return next
}

/** Extract the real client IP from Vercel / proxy headers. */
function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? ''
}

const FREE_CREDITS       = 5   // credits granted to a clean new account
const IP_GRANT_LIMIT     = 2   // max accounts granted credits from one IP per window
const IP_WINDOW_DAYS     = 30  // rolling window in days

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
      const market      = next.startsWith('/in') ? 'in' : 'de'
      const userEmail   = data.user.email ?? ''
      const normalized  = normalizeEmail(userEmail)
      const clientIp    = getClientIp(request)

      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )

      // ── Check whether profile already exists (returning user) ────────────
      const { data: existingProfile } = await admin
        .from('profiles')
        .select('id, signup_country')
        .eq('id', data.user.id)
        .maybeSingle()

      const signupCountry = (request.headers.get('x-vercel-ip-country') ?? '').slice(0, 2).toUpperCase() || null

      if (existingProfile) {
        // Returning user — refresh market stamp and backfill normalized_email.
        // Only write signup_country if it has never been set — never overwrite an
        // existing value, because x-vercel-ip-country is GeoIP-based and can
        // mis-classify DACH users as CH on any given login.
        const countryPatch = (!existingProfile.signup_country && signupCountry)
          ? { signup_country: signupCountry }
          : {}
        await admin
          .from('profiles')
          .update({ market, normalized_email: normalized, ...countryPatch })
          .eq('id', data.user.id)

      } else {
        // ── New user — run fraud checks before granting free credits ─────────
        let fraudFlag: 'duplicate' | 'ip_flagged' | null = null

        // Check 1: Gmail dot/alias duplicate
        // Only meaningful for Gmail; other providers are deduplicated by Supabase Auth.
        const isGmail = userEmail.toLowerCase().endsWith('@gmail.com')
                     || userEmail.toLowerCase().endsWith('@googlemail.com')

        if (isGmail) {
          const { data: dupeRow } = await admin
            .from('profiles')
            .select('id')
            .eq('normalized_email', normalized)
            .maybeSingle()
          if (dupeRow) fraudFlag = 'duplicate'
        }

        // Check 2: IP rate limit on free credit grant
        // Skip if already flagged, or if we couldn't determine the IP.
        if (!fraudFlag && clientIp) {
          const windowStart = new Date(
            Date.now() - IP_WINDOW_DAYS * 24 * 60 * 60 * 1000
          ).toISOString()

          const { count } = await admin
            .from('ip_credit_grants')
            .select('*', { count: 'exact', head: true })
            .eq('ip', clientIp)
            .gte('granted_at', windowStart)

          if ((count ?? 0) >= IP_GRANT_LIMIT) fraudFlag = 'ip_flagged'
        }

        const freeCredits = fraudFlag ? 0 : FREE_CREDITS
        const status      = fraudFlag ?? 'active'

        // Create the profile with the result of the fraud checks
        await admin.from('profiles').insert({
          id:               data.user.id,
          email:            userEmail,
          normalized_email: normalized,
          full_name:        data.user.user_metadata?.full_name  ?? null,
          avatar_url:       data.user.user_metadata?.avatar_url ?? null,
          market,
          signup_country:   signupCountry,
          credits:          freeCredits,
          eu_credits:       0,
          in_credits:       0,
          status,
        })

        // Log the IP grant so future accounts from this IP are counted
        if (!fraudFlag && clientIp) {
          await admin.from('ip_credit_grants').insert({
            ip:      clientIp,
            user_id: data.user.id,
          })
        }
      }

      // Never land on /in directly — it's a server component that races the
      // freshly-set session cookie and may show the marketing page instead of
      // the dashboard. Send India users to a middleware-protected page instead.
      const rawDest   = next || (market === 'in' ? '/in/career-scan' : '/app')
      const destination = rawDest === '/in' ? '/in/career-scan' : rawDest
      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
