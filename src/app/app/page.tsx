import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DACHDashboard from './components/DACHDashboard'

export default async function DACHHomePage() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (user) return <DACHDashboard />
  } catch {
    // fall through
  }
  redirect('/login')
}
