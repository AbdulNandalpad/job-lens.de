import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import KiraHome from '@/components/KiraHome'
import IndiaLanding from '@/components/IndiaLanding'
// Kira Home replaced the classic dashboard as the post-login landing (2026-07-30).
// The dashboard is kept intact and could be used later — to restore it:
//   import IndiaDashboard from './components/IndiaDashboard'
//   if (hasUser) return <IndiaDashboard />
// The previous dark marketing landing is on standby in ./_landing-v1.tsx.

export default async function IndiaHomePage() {
  // Check auth — logged-in users land on Kira Home, visitors see the marketing page
  let hasUser = false
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    hasUser = !!user
  } catch {
    // Not logged in or cookie error — fall through to landing page
  }
  if (hasUser) return <KiraHome market="in" />

  return <IndiaLanding />
}
