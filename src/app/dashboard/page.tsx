import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const name = user.user_metadata?.full_name?.split(' ')[0] || 'there'

  return (
    <main style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: '#042C53', height: 50, display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between' }}>
        <span style={{ color: '#E6F1FB', fontWeight: 700, fontSize: 16 }}>
          Job-Lens <span style={{ color: '#378ADD' }}>AI</span>
        </span>
        <span style={{ color: '#85B7EB', fontSize: 12 }}>{user.email}</span>
      </div>
      <div style={{ padding: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#042C53', marginBottom: 8 }}>
          Welcome, {name} 👋
        </h1>
        <p style={{ fontSize: 14, color: '#6b7c93', marginBottom: 32 }}>
          You are logged in as {user.email}. Let's find your next role.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {[
            { title: 'Career Scan', desc: 'Upload your CV and LinkedIn PDF to get your profile score and upgrade path', color: '#378ADD' },
            { title: 'Matching Jobs', desc: 'Browse AI-matched jobs based on your profile', color: '#1D9E75' },
            { title: 'Application Tracker', desc: 'Log and track every application in one place', color: '#BA7517' },
          ].map((card, i) => (
            <div key={i} style={{ background: '#fff', border: '0.5px solid #dce4ef', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: card.color, marginBottom: 8 }}>{card.title}</div>
              <div style={{ fontSize: 12, color: '#6b7c93', lineHeight: 1.6 }}>{card.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}