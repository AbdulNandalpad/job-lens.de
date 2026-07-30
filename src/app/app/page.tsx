import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Navbar from './components/Navbar'
import KiraHome from '@/components/KiraHome'
// Kira Home replaced the classic dashboard as the post-login landing (2026-07-30).
// The dashboard is kept intact and could be used later — to restore it:
//   import DACHDashboard from './components/DACHDashboard'
//   if (hasUser) return <DACHDashboard />

export default async function DACHHomePage() {
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
