import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import Navbar from './components/Navbar'
import KiraHome from '@/components/KiraHome'
// Kira Home replaced the classic dashboard as the post-login landing (2026-07-30).
// The dashboard is kept intact and could be used later — to restore it:
//   import DACHDashboard from './components/DACHDashboard'
//   if (hasUser) return <DACHDashboard />

export default async function DACHHomePage() {
  // Uses the shared server client (getAll/setAll cookie contract) — a
  // hand-rolled get-only adapter here previously could miss refreshed
  // session cookies and bounce logged-in users to the marketing page.
  let hasUser = false
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    hasUser = !!user
  } catch {
    // fall through
  }
  if (hasUser) {
    return (
      <>
        <Navbar />
        <KiraHome market="eu" />
      </>
    )
  }
  redirect('/')
}
