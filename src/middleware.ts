import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const country = request.headers.get('x-vercel-ip-country') ?? ''

  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
  const isAdmin = !!user?.email && adminEmails.includes(user.email.toLowerCase())

  // Hard geo-gate: India IPs may never reach the DACH (/app) site — even by
  // typing the URL directly. Redirect to the matching India page. Admins are
  // exempt so they can test both markets.
  if (country === 'IN' && !isAdmin && (path === '/app' || path.startsWith('/app/'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/in' + path.slice('/app'.length)  // /app → /in, /app/x → /in/x
    url.search = ''
    return NextResponse.redirect(url)
  }

  // IP-based and auth-based root routing
  if (path === '/') {
    if (country === 'IN') {
      // India IP → always show India site
      const url = request.nextUrl.clone()
      url.pathname = '/in'
      return NextResponse.redirect(url)
    }
    if (user) {
      // Logged-in non-India user at root → go straight to DACH dashboard
      const url = request.nextUrl.clone()
      url.pathname = '/app'
      return NextResponse.redirect(url)
    }
  }

  // Public paths — no auth required
  const isPublic =
    path === '/' ||
    path === '/in' ||
    path === '/app' ||        // DACH dashboard (handles own auth check)
    path === '/sitemap.xml' ||
    path === '/robots.txt' ||
    path.startsWith('/api/') ||   // all API routes handle their own auth
    path.startsWith('/login') ||
    path.startsWith('/in/login') ||
    path.startsWith('/auth') ||
    path.startsWith('/impressum') ||
    path.startsWith('/privacy') ||
    path.startsWith('/datenschutz') ||
    path.startsWith('/agb') ||
    path.endsWith('/demo-form') ||  // sandbox demo forms — no auth needed, no data stored
    path.endsWith('.html') ||
    path.startsWith('/case/') ||    // public recruiter view — gated by magic link, not auth
    path.startsWith('/contact')     // contact form — no auth required

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    // Route India paths to India-branded login, DACH paths to shared login
    url.pathname = path.startsWith('/in/') ? '/in/login' : '/login'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  // Check blocked status + market lock for app routes (both DE and IN markets)
  if (user && (path.startsWith('/app') || path.startsWith('/in/'))) {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data: profile } = await admin
      .from('profiles')
      .select('status, market')
      .eq('id', user.id)
      .single()

    if (profile?.status === 'blocked') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'blocked')
      url.searchParams.delete('next')
      return NextResponse.redirect(url)
    }

    // Account market lock (VPN-proof): a user who registered via the India link
    // is bound to the India site — redirect any /app access to /in. Admin exempt.
    if (!isAdmin && profile?.market === 'in' && (path === '/app' || path.startsWith('/app/'))) {
      const url = request.nextUrl.clone()
      url.pathname = '/in' + path.slice('/app'.length)
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
