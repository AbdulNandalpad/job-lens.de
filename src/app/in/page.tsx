import { createServerSupabase } from '@/lib/supabase-server'
import KiraHome from '@/components/KiraHome'
import IndiaLanding from '@/components/IndiaLanding'
// Kira Home replaced the classic dashboard as the post-login landing (2026-07-30).
// The dashboard is kept intact and could be used later — to restore it:
//   import IndiaDashboard from './components/IndiaDashboard'
//   if (hasUser) return <IndiaDashboard />
// The previous dark marketing landing is on standby in ./_landing-v1.tsx.

export default async function IndiaHomePage() {
  // Check auth — logged-in users land on Kira Home, visitors see the marketing
  // page. Uses the shared server client (getAll/setAll cookie contract) — a
  // hand-rolled get-only adapter here previously could miss refreshed session
  // cookies and render the logged-out page under the logged-in navbar.
  let hasUser = false
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    hasUser = !!user
  } catch {
    // Not logged in or cookie error — fall through to landing page
  }
  if (hasUser) return <KiraHome market="in" />

  return <IndiaLanding />
}
