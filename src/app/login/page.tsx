'use client'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const supabase = createClient()

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#042C53',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '48px 40px',
        width: 380, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{ marginBottom: 24 }}>
          <svg width="48" height="48" viewBox="0 0 44 44" style={{ margin: '0 auto 12px' }}>
            <circle cx="20" cy="20" r="13" fill="none" stroke="#378ADD" strokeWidth="2.5"/>
            <circle cx="20" cy="20" r="8" fill="none" stroke="#85B7EB" strokeWidth="1.2"/>
            <circle cx="20" cy="20" r="3" fill="#378ADD"/>
            <line x1="7" y1="20" x2="33" y2="20" stroke="#378ADD" strokeWidth="0.8" strokeDasharray="2,2"/>
            <line x1="28" y1="28" x2="36" y2="36" stroke="#378ADD" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#042C53', margin: '0 0 4px' }}>
            Job-Lens AI
          </h1>
          <p style={{ fontSize: 13, color: '#6b7c93', margin: 0 }}>
            Apply smarter. Track everything. Land faster.
          </p>
        </div>

        <button onClick={signInWithGoogle} style={{
          width: '100%', padding: '12px 20px', borderRadius: 8,
          border: '1px solid #dce4ef', background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 12, fontSize: 14, fontWeight: 500, color: '#1a2332',
          cursor: 'pointer', transition: 'background 0.15s'
        }}
          onMouseOver={e => (e.currentTarget.style.background = '#f7f9fc')}
          onMouseOut={e => (e.currentTarget.style.background = '#fff')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <p style={{ fontSize: 11, color: '#6b7c93', marginTop: 20, lineHeight: 1.6 }}>
          By continuing you agree to our Terms of Service.<br/>
          Your data is private and never shared.
        </p>
      </div>
    </div>
  )
}