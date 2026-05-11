'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'

export default function HomePage() {
  const [user, setUser] = useState<{ name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [typedText, setTypedText] = useState('')
  const [showCursor, setShowCursor] = useState(true)
  const [visibleCards, setVisibleCards] = useState<number[]>([])
  const cardsRef = useRef<HTMLDivElement>(null)
  const fullText = 'Faster and smarter.'

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const name = data.user.user_metadata?.full_name ?? data.user.email ?? 'User'
        setUser({ name: name.split(' ')[0] })
      }
      setLoading(false)
    })
  }, [])

  // Typing effect
  useEffect(() => {
    let i = 0
    const timer = setInterval(() => {
      if (i <= fullText.length) {
        setTypedText(fullText.slice(0, i))
        i++
      } else {
        clearInterval(timer)
      }
    }, 60)
    return () => clearInterval(timer)
  }, [])

  // Cursor blink
  useEffect(() => {
    const timer = setInterval(() => setShowCursor(p => !p), 500)
    return () => clearInterval(timer)
  }, [])

  // Scroll reveal for cards
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = parseInt(entry.target.getAttribute('data-idx') || '0')
            setVisibleCards(prev => [...new Set([...prev, idx])])
          }
        })
      },
      { threshold: 0.1 }
    )
    const cards = document.querySelectorAll('.jl-card')
    cards.forEach(card => observer.observe(card))
    return () => observer.disconnect()
  }, [])

  const features = [
    { icon: '◎', title: 'Career Scan', desc: 'Upload your CV and get an honest AI analysis. Strengths, gaps, salary estimate, quick wins — in 30 seconds.', href: user ? '/app/career-scan' : '/login', cta: 'Scan my profile', bg: '#E6F1FB', color: '#185FA5', badge: null },
    { icon: '🔍', title: 'Smart Job Search', desc: 'AI reads your CV and finds the best matching jobs across Germany and Switzerland. Live postings, real companies.', href: user ? '/app/smart-apply' : '/login', cta: 'Find matching jobs', bg: '#E1F5EE', color: '#1D9E75', badge: null },
    { icon: '📄', title: 'AI CV & Cover Letter', desc: 'One click to generate a tailored CV and cover letter for any job. Optimised for ATS and DACH hiring managers.', href: user ? '/app/cv-builder' : '/login', cta: 'Tailor my CV', bg: '#FFF8EC', color: '#BA7517', badge: null },
    { icon: '⚡', title: 'Auto Apply', desc: 'Point it at any job listing and AI fills the application form for you — name, experience, cover letter, file uploads. You just review and submit.', href: user ? '/app/auto-apply' : '/login', cta: 'Try Auto Apply', bg: '#F0EEFF', color: '#6D28D9', badge: 'Beta' },
  ]

  const steps = [
    { step: '1', title: 'Upload your CV or LinkedIn PDF', desc: 'We extract your skills, experience, and career history automatically.' },
    { step: '2', title: 'Get your AI Career Scan', desc: 'See your profile score, strengths, gaps, salary range, and quick wins.' },
    { step: '3', title: 'Find matching jobs', desc: 'AI searches live job boards across DACH and ranks results by match.' },
    { step: '4', title: 'Apply with one click', desc: 'Generate a tailored CV and cover letter for each job in seconds.' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: "'DM Sans', system-ui, sans-serif", overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        .jl-feature-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        .jl-cta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        @media (max-width: 768px) {
          .jl-feature-grid { grid-template-columns: 1fr !important; }
          .jl-cta-grid { grid-template-columns: 1fr !important; }
        }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
        @keyframes float2 { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes pulse { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.05); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideCard { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: translateY(0); } }
        .jl-card { opacity: 0; transform: translateY(32px); transition: box-shadow 0.2s; }
        .jl-card.visible { animation: slideCard 0.5s ease forwards; }
        .jl-card:hover { box-shadow: 0 8px 32px rgba(4,44,83,0.10) !important; transform: translateY(-2px) !important; }
        .jl-nav-link { transition: all 0.15s; }
        .jl-nav-link:hover { color: #E6F1FB !important; }
        .jl-cta-btn { transition: all 0.15s; }
        .jl-cta-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(55,138,221,0.3); }
        .jl-step { transition: all 0.2s; }
        .jl-step:hover .jl-step-dot { background: #378ADD !important; transform: scale(1.1); }
        .jl-hero-badge { animation: fadeIn 0.6s ease 0.2s both; }
        .jl-hero-title { animation: fadeUp 0.7s ease 0.4s both; }
        .jl-hero-sub { animation: fadeUp 0.7s ease 0.6s both; }
        .jl-hero-btns { animation: fadeUp 0.7s ease 0.8s both; }
        .jl-particle { position: absolute; border-radius: 50%; pointer-events: none; }
      `}</style>

      {/* Navbar */}
      <div style={{ background: '#042C53', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <svg width="26" height="26" viewBox="0 0 44 44">
            <circle cx="20" cy="20" r="13" fill="none" stroke="#378ADD" strokeWidth="2.5"/>
            <circle cx="20" cy="20" r="8" fill="none" stroke="#85B7EB" strokeWidth="1.2"/>
            <circle cx="20" cy="20" r="3" fill="#378ADD"/>
            <line x1="7" y1="20" x2="33" y2="20" stroke="#378ADD" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.5"/>
            <line x1="28" y1="28" x2="36" y2="36" stroke="#378ADD" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: '#E6F1FB' }}>
            Job-Lens <span style={{ color: '#378ADD' }}>AI</span>
          </span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {!loading && (
            <>
              {user ? (
                <>
                  <span style={{ fontSize: 13, color: '#85B7EB' }}>Hi, {user.name}</span>
                  <Link href="/app/career-scan" className="jl-cta-btn" style={{ fontSize: 12, padding: '6px 16px', borderRadius: 20, background: '#378ADD', color: '#fff', textDecoration: 'none', fontWeight: 600 }}>
                    Go to App
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/app/career-scan" className="jl-nav-link" style={{ fontSize: 13, color: '#85B7EB', textDecoration: 'none' }}>Career Scan</Link>
                  <Link href="/app/smart-apply" className="jl-nav-link" style={{ fontSize: 13, color: '#85B7EB', textDecoration: 'none' }}>Job Search</Link>
                  <Link href="/login" className="jl-cta-btn" style={{ fontSize: 12, padding: '6px 16px', borderRadius: 20, background: '#378ADD', color: '#fff', textDecoration: 'none', fontWeight: 600 }}>
                    Sign In
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #042C53 0%, #073d6e 60%, #0a4d8a 100%)', padding: '80px 24px 100px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>

        {/* Animated background particles */}
        <div className="jl-particle" style={{ width: 200, height: 200, background: 'rgba(55,138,221,0.08)', top: -60, left: -60, animation: 'float 6s ease-in-out infinite' }} />
        <div className="jl-particle" style={{ width: 120, height: 120, background: 'rgba(55,138,221,0.06)', top: 20, right: 80, animation: 'float2 8s ease-in-out infinite' }} />
        <div className="jl-particle" style={{ width: 80, height: 80, background: 'rgba(29,158,117,0.08)', bottom: 40, left: '20%', animation: 'float 7s ease-in-out infinite 1s' }} />
        <div className="jl-particle" style={{ width: 160, height: 160, background: 'rgba(55,138,221,0.05)', bottom: -40, right: '15%', animation: 'float2 9s ease-in-out infinite 0.5s' }} />
        <div className="jl-particle" style={{ width: 40, height: 40, background: 'rgba(55,138,221,0.12)', top: '40%', left: '10%', animation: 'pulse 4s ease-in-out infinite' }} />
        <div className="jl-particle" style={{ width: 24, height: 24, background: 'rgba(29,158,117,0.15)', top: '30%', right: '12%', animation: 'pulse 5s ease-in-out infinite 1s' }} />

        {/* Animated grid lines */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(55,138,221,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(55,138,221,0.04) 1px, transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="jl-hero-badge" style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, color: '#378ADD', background: 'rgba(55,138,221,0.15)', border: '1px solid rgba(55,138,221,0.3)', padding: '5px 16px', borderRadius: 20, marginBottom: 24, letterSpacing: 0.6, textTransform: 'uppercase' }}>
            AI-Powered Career Platform - DACH Market
          </div>

          <h1 className="jl-hero-title" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 700, color: '#E6F1FB', margin: '0 0 12px', lineHeight: 1.15 }}>
            Find your next role.
          </h1>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 700, margin: '0 0 24px', lineHeight: 1.15, minHeight: '1.15em' }}>
            <span style={{ color: '#378ADD' }}>{typedText}</span>
            <span style={{ color: '#378ADD', opacity: showCursor ? 1 : 0 }}>|</span>
          </h1>

          <p className="jl-hero-sub" style={{ fontSize: 16, color: '#85B7EB', maxWidth: 540, margin: '0 auto 40px', lineHeight: 1.75 }}>
            Upload your CV, get an honest AI career scan, find matching jobs across Germany and Switzerland,
            and apply with a tailored CV and cover letter - all in one place.
          </p>

          <div className="jl-hero-btns" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href={user ? '/app/career-scan' : '/login'} className="jl-cta-btn" style={{ padding: '14px 32px', borderRadius: 12, background: '#378ADD', color: '#fff', textDecoration: 'none', fontWeight: 700, fontFamily: "'Outfit', sans-serif", fontSize: 15 }}>
              Get Started Free
            </Link>
            <Link href={user ? '/app/smart-apply' : '/login'} className="jl-cta-btn" style={{ padding: '14px 32px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', color: '#E6F1FB', textDecoration: 'none', fontWeight: 600, fontFamily: "'Outfit', sans-serif", fontSize: 15, border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }}>
              Smart Job Search
            </Link>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 40, justifyContent: 'center', marginTop: 48, flexWrap: 'wrap' }}>
            {[
              { value: 'DACH', label: 'Market Focus' },
              { value: 'AI', label: 'Powered Analysis' },
              { value: '30s', label: 'Career Scan' },
              { value: '1-Click', label: 'CV Tailoring' },
            ].map(stat => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 700, color: '#E6F1FB' }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: '#85B7EB', marginTop: 2, letterSpacing: 0.3 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Wave */}
      <div style={{ background: 'linear-gradient(135deg, #042C53 0%, #073d6e 60%, #0a4d8a 100%)', lineHeight: 0 }}>
        <svg viewBox="0 0 1440 50" style={{ display: 'block', width: '100%' }}>
          <path d="M0,50 C480,0 960,0 1440,50 L1440,50 L0,50 Z" fill="#f0f4f8"/>
        </svg>
      </div>

      {/* Features */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '56px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 24, fontWeight: 700, color: '#042C53', marginBottom: 8 }}>
            Everything you need to land your next role
          </div>
          <div style={{ fontSize: 14, color: '#6b7c93', maxWidth: 440, margin: '0 auto', lineHeight: 1.6 }}>
            Built specifically for the DACH market - Germany, Switzerland, Austria
          </div>
        </div>

        <div className="jl-feature-grid" ref={cardsRef}>
          {features.map((feat, idx) => (
            <div
              key={feat.title}
              data-idx={idx}
              className={`jl-card${visibleCards.includes(idx) ? ' visible' : ''}`}
              style={{ background: '#fff', border: '1px solid #edf1f6', borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column', gap: 14, animationDelay: `${idx * 0.15}s` }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: feat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                  {feat.icon}
                </div>
                {feat.badge && (
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' as const, background: feat.bg, color: feat.color, padding: '3px 10px', borderRadius: 20, border: `1px solid ${feat.color}22` }}>
                    {feat.badge}
                  </span>
                )}
              </div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 17, fontWeight: 700, color: '#042C53' }}>{feat.title}</div>
              <div style={{ fontSize: 13, color: '#6b7c93', lineHeight: 1.75, flex: 1 }}>{feat.desc}</div>
              <Link href={feat.href} style={{ fontSize: 13, padding: '9px 18px', borderRadius: 9, background: '#042C53', color: '#E6F1FB', textDecoration: 'none', fontWeight: 600, display: 'inline-block', textAlign: 'center', fontFamily: "'Outfit', sans-serif", transition: 'background 0.15s' }}>
                {feat.cta} &rarr;
              </Link>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div style={{ marginTop: 64 }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 24, fontWeight: 700, color: '#042C53', marginBottom: 8 }}>How it works</div>
            <div style={{ fontSize: 14, color: '#6b7c93' }}>Four steps from CV to offer</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxWidth: 580, margin: '0 auto' }}>
            {steps.map((item, idx) => (
              <div key={idx} className="jl-step" style={{ display: 'flex', gap: 20, paddingBottom: idx < steps.length - 1 ? 28 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div className="jl-step-dot" style={{ width: 36, height: 36, borderRadius: '50%', background: '#042C53', color: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, fontFamily: "'Outfit', sans-serif", transition: 'all 0.2s', flexShrink: 0 }}>
                    {item.step}
                  </div>
                  {idx < steps.length - 1 && <div style={{ width: 2, flex: 1, background: 'linear-gradient(to bottom, #042C53, #edf1f6)', marginTop: 4 }} />}
                </div>
                <div style={{ paddingTop: 6, paddingBottom: idx < steps.length - 1 ? 0 : 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#042C53', marginBottom: 5, fontFamily: "'Outfit', sans-serif" }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: '#6b7c93', lineHeight: 1.65 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div style={{ marginTop: 64, background: 'linear-gradient(135deg, #042C53 0%, #073d6e 100%)', borderRadius: 20, padding: '48px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div className="jl-particle" style={{ width: 180, height: 180, background: 'rgba(55,138,221,0.08)', top: -60, right: -40, animation: 'float 7s ease-in-out infinite' }} />
          <div className="jl-particle" style={{ width: 100, height: 100, background: 'rgba(29,158,117,0.08)', bottom: -30, left: 40, animation: 'float2 8s ease-in-out infinite' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 26, fontWeight: 700, color: '#E6F1FB', marginBottom: 8 }}>
              Ready to find your next role?
            </div>
            <div style={{ fontSize: 14, color: '#85B7EB', marginBottom: 28, lineHeight: 1.6 }}>
              Free to use - No credit card required - Built for DACH job seekers
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 560, margin: '0 auto' }}>
              <Link href={user ? '/app/career-scan' : '/login'} className="jl-cta-btn" style={{ padding: '13px 24px', borderRadius: 10, background: '#378ADD', color: '#fff', textDecoration: 'none', fontWeight: 700, fontFamily: "'Outfit', sans-serif", fontSize: 14, display: 'block', textAlign: 'center' }}>
                Career Scan
              </Link>
              <Link href={user ? '/app/smart-apply' : '/login'} className="jl-cta-btn" style={{ padding: '13px 24px', borderRadius: 10, background: 'rgba(255,255,255,0.1)', color: '#E6F1FB', textDecoration: 'none', fontWeight: 600, fontFamily: "'Outfit', sans-serif", fontSize: 14, border: '1px solid rgba(255,255,255,0.2)', display: 'block', textAlign: 'center' }}>
                Smart Job Search
              </Link>
              <Link href={user ? '/app/auto-apply' : '/login'} className="jl-cta-btn" style={{ padding: '13px 24px', borderRadius: 10, background: 'rgba(109,40,217,0.3)', color: '#E6F1FB', textDecoration: 'none', fontWeight: 600, fontFamily: "'Outfit', sans-serif", fontSize: 14, border: '1px solid rgba(109,40,217,0.5)', display: 'block', textAlign: 'center' }}>
                ⚡ Auto Apply
              </Link>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 40, fontSize: 12, color: '#8fa3b8' }}>
          Job-Lens AI - Built for DACH job seekers
        </div>
      </div>
    </div>
  )
}