'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n'

type Market = 'dach' | 'india'

const blue    = '#378ADD'
const navy    = '#042C53'
const saffron = '#FF9933'
const green   = '#138808'
const white   = '#fff'

export default function HomePage() {
  const [market, setMarket]   = useState<Market>('dach')
  const [loggedIn, setLoggedIn] = useState(false)
  const [loading, setLoading]  = useState(true)
  const { lang, setLang }      = useLanguage()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setLoggedIn(!!data.user)
      setLoading(false)
    })
  }, [])

  const de = lang === 'DE'

  /* ── DACH content ── */
  const dach = {
    tag:      '🇩🇪 Deutschland · 🇨🇭 Schweiz · 🇦🇹 Österreich',
    h1:       de ? 'Deinen nächsten Job im DACH-Markt finden' : 'Find your next job in the DACH market',
    sub:      de
      ? 'Lade deinen Lebenslauf hoch. Sieh wo du stehst. Finde passende Stellen in Deutschland, der Schweiz und Österreich. Bewirb dich mit maßgeschneidertem Lebenslauf und Anschreiben.'
      : 'Upload your CV. See where you stand. Get matched with real jobs across Germany, Switzerland and Austria. Apply with a tailored CV and cover letter.',
    cta:      de ? (loggedIn ? 'Zum Dashboard →'  : 'Kostenlos starten →') : (loggedIn ? 'Go to Dashboard →' : 'Get Started Free →'),
    ctaHref:  loggedIn ? '/app' : '/login',
    accent:   blue,
    features: de
      ? ['🎯 Career Scan — KI-Analyse deines Profils', '🔍 Jobsuche — Live DACH-Stellen', '📄 Lebenslauf-Builder — ATS-optimiert', '✉️ Anschreiben — In deiner Stimme']
      : ['🎯 Career Scan — AI profile analysis', '🔍 Job Search — Live DACH listings', '📄 CV Builder — ATS optimised', '✉️ Cover Letter — In your voice'],
    heroBg:   `radial-gradient(ellipse at 20% 50%, rgba(55,138,221,0.18) 0%, transparent 55%),
               radial-gradient(ellipse at 80% 20%, rgba(4,44,83,0.25) 0%, transparent 50%),
               linear-gradient(160deg, #07111f 0%, #0a1c30 60%, #07111f 100%)`,
  }

  /* ── India content ── */
  const india = {
    tag:      '🇮🇳 India',
    h1:       'Your CV is being rejected by a bot before any human ever sees it.',
    sub:      'In India, lakhs of candidates apply for every job. Companies use ATS software to filter out 90% of CVs automatically. Job-Lens scans, scores and fixes your CV so the bot says yes.',
    cta:      loggedIn ? 'Go to India App →' : 'Check My ATS Score — Free →',
    ctaHref:  loggedIn ? '/in' : '/in/login',
    accent:   saffron,
    features: ['📊 ATS Score — Know exactly where you stand', '🎯 Career Scan — Deep profile analysis', '📄 CV Builder — ATS-ready format', '🔍 Job Search — India live listings'],
    heroBg:   `radial-gradient(ellipse at 15% 60%, rgba(255,153,51,0.18) 0%, transparent 50%),
               radial-gradient(ellipse at 80% 20%, rgba(19,136,8,0.1) 0%, transparent 50%),
               linear-gradient(160deg, #0a1520 0%, #0f2035 60%, #0a1c2e 100%)`,
  }

  const active = market === 'dach' ? dach : india

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700;800&display=swap');
        @keyframes fadeUp  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        .pill { transition: all .18s; cursor: pointer; }
        .pill:hover { opacity: .85; }
        .feat-item { transition: background .15s; }
        .feat-item:hover { background: rgba(255,255,255,0.07) !important; }
        .cta-btn { transition: all .2s; }
        .cta-btn:hover { opacity: .88; transform: translateY(-1px); }
        .sec-btn { transition: all .15s; }
        .sec-btn:hover { background: rgba(255,255,255,0.14) !important; }
        .lang-btn { transition: all .15s; cursor: pointer; }
        .lang-btn:hover { color: #fff !important; }
        @media (max-width: 640px) {
          .feat-grid { grid-template-columns: 1fr !important; }
          .hero-h1   { font-size: 26px !important; }
        }
      `}</style>

      {/* ── Navbar ── */}
      <div style={{ background: '#07111f', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <svg width="24" height="24" viewBox="0 0 44 44">
            <circle cx="20" cy="20" r="13" fill="none" stroke={blue} strokeWidth="2.5"/>
            <circle cx="20" cy="20" r="8"  fill="none" stroke="#85B7EB" strokeWidth="1.2"/>
            <circle cx="20" cy="20" r="3"  fill={blue}/>
            <line x1="7" y1="20" x2="33" y2="20" stroke={blue} strokeWidth="0.8" strokeDasharray="2,2" opacity="0.5"/>
            <line x1="28" y1="28" x2="36" y2="36" stroke={blue} strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, color: '#E6F1FB' }}>
            Job-Lens
          </span>
        </Link>

        {/* Market pills + lang */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* DACH pill */}
          <button className="pill" onClick={() => setMarket('dach')}
            style={{ padding: '5px 14px', borderRadius: 20, border: `1px solid ${market === 'dach' ? blue : 'rgba(255,255,255,0.12)'}`, background: market === 'dach' ? `${blue}22` : 'transparent', color: market === 'dach' ? '#fff' : 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: market === 'dach' ? 700 : 400, fontFamily: 'inherit' }}>
            🇩🇪 DACH
          </button>
          {/* India pill */}
          <button className="pill" onClick={() => setMarket('india')}
            style={{ padding: '5px 14px', borderRadius: 20, border: `1px solid ${market === 'india' ? saffron : 'rgba(255,255,255,0.12)'}`, background: market === 'india' ? `${saffron}22` : 'transparent', color: market === 'india' ? '#fff' : 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: market === 'india' ? 700 : 400, fontFamily: 'inherit' }}>
            🇮🇳 India
          </button>
          {/* DE/EN for DACH */}
          {market === 'dach' && (
            <div style={{ display: 'flex', gap: 2, marginLeft: 4 }}>
              {(['DE', 'EN'] as const).map(code => (
                <button key={code} className="lang-btn" onClick={() => setLang(code)}
                  style={{ padding: '4px 8px', borderRadius: 6, background: lang === code ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', fontSize: 11, fontWeight: lang === code ? 700 : 400, color: lang === code ? '#fff' : 'rgba(255,255,255,0.35)', fontFamily: 'inherit' }}>
                  {code}
                </button>
              ))}
            </div>
          )}
          {/* Sign in / app link */}
          {!loading && (
            <Link href={market === 'dach' ? (loggedIn ? '/app' : '/login') : (loggedIn ? '/in' : '/in/login')}
              style={{ padding: '5px 14px', borderRadius: 20, background: active.accent, color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', fontFamily: 'inherit', marginLeft: 4 }}>
              {loggedIn ? (de && market === 'dach' ? 'Zur App' : 'App') : (de && market === 'dach' ? 'Anmelden' : 'Sign In')}
            </Link>
          )}
        </div>
      </div>

      {/* ── Hero ── */}
      <div style={{ background: active.heroBg, padding: '72px 24px 88px', textAlign: 'center', position: 'relative', overflow: 'hidden', transition: 'background 0.4s' }}>
        <div style={{ maxWidth: 660, margin: '0 auto', position: 'relative', zIndex: 1, animation: 'fadeUp 0.5s ease both' }} key={market}>
          {/* Market tag */}
          <div style={{ display: 'inline-block', marginBottom: 22, padding: '5px 18px', borderRadius: 20, border: `1px solid ${active.accent}40`, background: `${active.accent}12`, fontSize: 12, fontWeight: 600, color: active.accent, letterSpacing: 0.4 }}>
            {active.tag}
          </div>

          <h1 className="hero-h1" style={{ fontFamily: "'Outfit',sans-serif", fontSize: 'clamp(26px,4vw,46px)', fontWeight: 800, color: white, margin: '0 0 20px', lineHeight: 1.15, letterSpacing: -0.5 }}>
            {active.h1}
          </h1>

          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', maxWidth: 520, margin: '0 auto 36px', lineHeight: 1.75 }}>
            {active.sub}
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href={active.ctaHref} className="cta-btn"
              style={{ padding: '14px 32px', borderRadius: 12, background: active.accent, color: white, textDecoration: 'none', fontWeight: 700, fontFamily: "'Outfit',sans-serif", fontSize: 15, boxShadow: `0 6px 24px ${active.accent}45` }}>
              {active.cta}
            </Link>
            {!loggedIn && (
              <Link href={market === 'dach' ? '/app/jobs' : '/in/jobs'} className="sec-btn"
                style={{ padding: '14px 28px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontWeight: 600, fontFamily: "'Outfit',sans-serif", fontSize: 15 }}>
                {de && market === 'dach' ? 'Jobs entdecken' : 'Explore Jobs'}
              </Link>
            )}
          </div>

          <div style={{ marginTop: 18, fontSize: 12, color: 'rgba(255,255,255,0.28)' }}>
            🇩🇪 Made in Germany · {de ? 'Deine Daten werden nie gespeichert' : 'Your data is never stored'} · 5 {de ? 'kostenlose Credits' : 'free credits'}
          </div>
        </div>
      </div>

      {/* ── Features ── */}
      <div style={{ background: '#f8fafc', padding: '60px 24px' }}>
        <div style={{ maxWidth: 880, margin: '0 auto', animation: 'fadeUp 0.5s .1s ease both' }} key={`feat-${market}`}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800, color: navy, marginBottom: 8 }}>
              {market === 'dach'
                ? (de ? 'Alles für deine Jobsuche' : 'Everything for your job search')
                : 'Built for the Indian job market'}
            </div>
            <div style={{ fontSize: 13, color: '#6b7c93' }}>
              {market === 'dach'
                ? (de ? 'Speziell für Deutschland, Schweiz und Österreich' : 'Built specifically for Germany, Switzerland and Austria')
                : 'ATS optimisation, career analysis and more'}
            </div>
          </div>

          <div className="feat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
            {active.features.map((f, i) => (
              <div key={i} className="feat-item" style={{ padding: '18px 20px', borderRadius: 14, background: white, border: '1px solid #edf1f6', boxShadow: '0 2px 8px rgba(4,44,83,0.04)', fontSize: 14, color: navy, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10 }}>
                {f}
              </div>
            ))}
          </div>

          {/* Pricing note */}
          <div style={{ marginTop: 40, padding: '24px 28px', borderRadius: 16, background: `${active.accent}10`, border: `1px solid ${active.accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 15, color: navy, marginBottom: 4 }}>
                {market === 'dach'
                  ? (de ? '5 kostenlose Credits bei Registrierung' : '5 free credits on signup')
                  : '5 free credits on signup'}
              </div>
              <div style={{ fontSize: 13, color: '#6b7c93' }}>
                {market === 'dach'
                  ? (de ? 'Keine Kreditkarte nötig. Credits verfallen nie.' : 'No card needed. Credits never expire.')
                  : 'No card needed. Credits never expire. Prices in INR.'}
              </div>
            </div>
            <Link href={active.ctaHref} className="cta-btn"
              style={{ padding: '11px 24px', borderRadius: 10, background: active.accent, color: white, textDecoration: 'none', fontWeight: 700, fontSize: 13, fontFamily: "'Outfit',sans-serif", whiteSpace: 'nowrap' as const }}>
              {loggedIn
                ? (de && market === 'dach' ? 'Zur App →' : 'Open App →')
                : (de && market === 'dach' ? 'Kostenlos starten →' : 'Get Started Free →')}
            </Link>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ background: navy, padding: '28px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>
          🇩🇪 Made in Germany · Job-Lens
        </div>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/impressum"   style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Impressum</Link>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>·</span>
          <Link href="/datenschutz" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Datenschutz</Link>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>·</span>
          <Link href="/agb"         style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>AGB</Link>
        </div>
      </div>
    </div>
  )
}
