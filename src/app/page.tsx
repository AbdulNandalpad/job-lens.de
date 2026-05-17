'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const bg     = '#07111f'
const card   = 'rgba(255,255,255,0.04)'
const border = 'rgba(255,255,255,0.08)'
const txt1   = '#f1f5f9'
const txt2   = '#94a3b8'
const txt3   = '#475569'
const blue   = '#378ADD'
const saffron= '#FF9933'
const green  = '#138808'

export default function RootPage() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setLoggedIn(!!data.user)
      setLoading(false)
    })
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700;800&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
        .market-card { transition: all .2s; cursor: pointer; }
        .market-card:hover { transform: translateY(-4px); }
        .market-card.dach:hover { border-color: ${blue} !important; box-shadow: 0 20px 60px rgba(55,138,221,0.15); }
        .market-card.india:hover { border-color: ${saffron} !important; box-shadow: 0 20px 60px rgba(255,153,51,0.15); }
        .btn-dach { transition: all .2s; }
        .btn-dach:hover { background: #2a6fc0 !important; transform: translateY(-1px); }
        .btn-india { transition: all .2s; }
        .btn-india:hover { background: #e67300 !important; transform: translateY(-1px); }
        @media (max-width: 640px) {
          .market-grid { flex-direction: column !important; }
          .market-card { max-width: 100% !important; }
        }
      `}</style>

      {/* Logo */}
      <div style={{ animation: 'fadeUp .4s ease both', marginBottom: 48, textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
          <svg width="32" height="32" viewBox="0 0 44 44">
            <circle cx="20" cy="20" r="13" fill="none" stroke={blue} strokeWidth="2.5"/>
            <circle cx="20" cy="20" r="8" fill="none" stroke="#85B7EB" strokeWidth="1.2"/>
            <circle cx="20" cy="20" r="3" fill={blue}/>
            <line x1="7" y1="20" x2="33" y2="20" stroke={blue} strokeWidth="0.8" strokeDasharray="2,2" opacity="0.5"/>
            <line x1="28" y1="28" x2="36" y2="36" stroke={blue} strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 800, color: txt1 }}>
            Job-Lens
          </span>
        </div>
        <p style={{ fontSize: 14, color: txt3, margin: 0 }}>Where are you looking for jobs?</p>
      </div>

      {/* Market cards */}
      {!loading && (
        <div className="market-grid" style={{ display: 'flex', gap: 20, width: '100%', maxWidth: 720, animation: 'fadeUp .5s .1s ease both' }}>

          {/* DACH */}
          <div className="market-card dach" style={{ flex: 1, background: card, border: `1px solid ${border}`, borderRadius: 22, padding: '36px 28px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 340 }}>
            <div style={{ display: 'flex', gap: 8, fontSize: 28 }}>🇩🇪 🇨🇭 🇦🇹</div>
            <div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 800, color: txt1, marginBottom: 6 }}>
                Job-Lens <span style={{ color: blue }}>DACH</span>
              </div>
              <div style={{ fontSize: 13, color: txt2, lineHeight: 1.6 }}>
                Germany, Switzerland & Austria.<br/>
                Career Scan, CV builder, cover letter and live job search.
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {['🎯 Career Scan', '🔍 Job Search', '📄 CV Builder', '✉️ Cover Letter'].map(f => (
                <div key={f} style={{ fontSize: 12, color: txt2 }}>{f}</div>
              ))}
            </div>
            <Link
              href={loggedIn ? '/app/jobs' : '/login'}
              className="btn-dach"
              style={{ display: 'block', textAlign: 'center', padding: '13px 0', borderRadius: 12, background: blue, color: '#fff', fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 15, textDecoration: 'none' }}
            >
              {loggedIn ? 'Open DACH App →' : 'Get Started →'}
            </Link>
          </div>

          {/* India */}
          <div className="market-card india" style={{ flex: 1, background: card, border: `1px solid ${border}`, borderRadius: 22, padding: '36px 28px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 340 }}>
            <div style={{ fontSize: 28 }}>🇮🇳</div>
            <div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 800, color: txt1, marginBottom: 6 }}>
                Job-Lens <span style={{ color: saffron }}>India</span>
              </div>
              <div style={{ fontSize: 13, color: txt2, lineHeight: 1.6 }}>
                Built for the Indian job market.<br/>
                ATS Score, Career Scan, CV builder and job search.
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {['📊 ATS Score', '🎯 Career Scan', '📄 CV Builder', '🔍 Job Search'].map(f => (
                <div key={f} style={{ fontSize: 12, color: txt2 }}>{f}</div>
              ))}
            </div>
            <Link
              href={loggedIn ? '/in/jobs' : '/in/login'}
              className="btn-india"
              style={{ display: 'block', textAlign: 'center', padding: '13px 0', borderRadius: 12, background: saffron, color: '#fff', fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 15, textDecoration: 'none' }}
            >
              {loggedIn ? 'Open India App →' : 'Get Started →'}
            </Link>
          </div>

        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 48, textAlign: 'center', animation: 'fadeUp .5s .2s ease both' }}>
        <div style={{ fontSize: 11, color: txt3, marginBottom: 12 }}>🇩🇪 Made in Germany · Your data is never stored</div>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/impressum" style={{ fontSize: 11, color: txt3, textDecoration: 'none' }}>Impressum</Link>
          <span style={{ fontSize: 11, color: border }}>·</span>
          <Link href="/datenschutz" style={{ fontSize: 11, color: txt3, textDecoration: 'none' }}>Datenschutz</Link>
          <span style={{ fontSize: 11, color: border }}>·</span>
          <Link href="/agb" style={{ fontSize: 11, color: txt3, textDecoration: 'none' }}>AGB</Link>
        </div>
      </div>
    </div>
  )
}
