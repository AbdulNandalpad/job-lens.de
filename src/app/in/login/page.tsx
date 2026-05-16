'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const saffron = '#FF9933'
const dark    = '#07111f'
const border  = 'rgba(255,255,255,0.1)'

function IndiaLoginForm() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/in'

  const signInWithGoogle = async () => {
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl },
    })
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: dark,
      backgroundImage: [
        'linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px)',
        'linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)',
      ].join(','),
      backgroundSize: '48px 48px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Ambient glows */}
      <div style={{ position:'absolute', top:-120, right:-80, width:440, height:440, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,153,51,.14) 0%,transparent 65%)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', bottom:-120, left:-80, width:380, height:380, borderRadius:'50%', background:'radial-gradient(circle,rgba(16,185,129,.08) 0%,transparent 65%)', pointerEvents:'none' }}/>

      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${border}`,
        borderRadius: 20, padding: '48px 40px',
        width: 380, textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        position: 'relative',
      }}>
        {/* Saffron top accent */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${saffron},#e67300)`, borderRadius:'20px 20px 0 0' }}/>

        {/* Logo + brand */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:16 }}>
            <svg width="32" height="32" viewBox="0 0 44 44">
              <circle cx="20" cy="20" r="13" fill="none" stroke="#378ADD" strokeWidth="2.5"/>
              <circle cx="20" cy="20" r="8" fill="none" stroke="#85B7EB" strokeWidth="1.2"/>
              <circle cx="20" cy="20" r="3" fill="#378ADD"/>
              <line x1="7" y1="20" x2="33" y2="20" stroke="#378ADD" strokeWidth="0.8" strokeDasharray="2,2"/>
              <line x1="28" y1="28" x2="36" y2="36" stroke="#378ADD" strokeWidth="3" strokeLinecap="round"/>
            </svg>
            <div style={{ textAlign:'left' }}>
              <div style={{ fontSize:17, fontWeight:700, color:'#fff', lineHeight:1 }}>Job-Lens</div>
              <div style={{ fontSize:12, fontWeight:600, color:saffron, marginTop:2 }}>India 🇮🇳</div>
            </div>
          </div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#fff', margin:'0 0 8px', lineHeight:1.3 }}>
            Get hired in India's<br/>AI-first job market
          </h1>
          <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', margin:0, lineHeight:1.6 }}>
            ATS-optimised CVs · Career insights · Live job search
          </p>
        </div>

        {/* Google sign-in */}
        <button onClick={signInWithGoogle} style={{
          width:'100%', padding:'13px 20px', borderRadius:10,
          border:'1px solid rgba(255,255,255,0.15)',
          background:'rgba(255,255,255,0.07)',
          display:'flex', alignItems:'center', justifyContent:'center',
          gap:12, fontSize:14, fontWeight:500, color:'#fff',
          cursor:'pointer', transition:'all 0.15s',
          marginBottom: 20,
        }}
          onMouseOver={e => { e.currentTarget.style.background='rgba(255,255,255,0.12)'; e.currentTarget.style.borderColor=`rgba(255,153,51,0.4)` }}
          onMouseOut={e => { e.currentTarget.style.background='rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.15)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        {/* Feature pills */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, padding:'14px', background:'rgba(255,153,51,0.06)', border:`1px solid rgba(255,153,51,0.15)`, borderRadius:12, marginBottom:18 }}>
          {[
            { icon:'🎯', label:'ATS Scan' },
            { icon:'🤖', label:'AI CV Build' },
            { icon:'💼', label:'Job Search' },
          ].map(f => (
            <div key={f.label} style={{ textAlign:'center' }}>
              <div style={{ fontSize:16, marginBottom:3 }}>{f.icon}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)', fontWeight:500 }}>{f.label}</div>
            </div>
          ))}
        </div>

        <p style={{ fontSize:11, color:'rgba(255,255,255,0.25)', margin:0, lineHeight:1.6 }}>
          By continuing you agree to our Terms of Service.<br/>
          Your data is private and never shared.
        </p>
      </div>
    </div>
  )
}

export default function IndiaLoginPage() {
  return (
    <Suspense>
      <IndiaLoginForm />
    </Suspense>
  )
}
