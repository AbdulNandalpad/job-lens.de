'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { theme } from '@/lib/theme'

const { colors: c, gradients: g, glass: gl, fonts: f, shadow: sh } = theme

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

  useEffect(() => {
    let i = 0
    const timer = setInterval(() => {
      if (i <= fullText.length) { setTypedText(fullText.slice(0, i)); i++ }
      else clearInterval(timer)
    }, 60)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setShowCursor(p => !p), 500)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          const idx = parseInt(e.target.getAttribute('data-idx') || '0')
          setVisibleCards(prev => [...new Set([...prev, idx])])
        }
      }),
      { threshold: 0.1 }
    )
    document.querySelectorAll('.jl-card').forEach(card => observer.observe(card))
    return () => observer.disconnect()
  }, [])

  const go = (path: string) => user ? path : '/login'

  const features = [
    {
      icon: '◎', title: 'Career Scan',
      desc: 'Upload your CV and get an honest AI analysis — strengths, gaps, salary estimate, and quick wins in 30 seconds.',
      href: go('/app/career-scan'), cta: 'Scan my profile',
      iconBg: c.primaryLight, iconColor: c.navy, badge: null,
    },
    {
      icon: '🔍', title: 'Smart Job Search',
      desc: 'AI reads your CV and finds the best matching jobs across Germany and Switzerland. Live postings, real companies.',
      href: go('/app/smart-apply'), cta: 'Find matching jobs',
      iconBg: c.successLight, iconColor: c.success, badge: null,
    },
    {
      icon: '📄', title: 'CV & Cover Letter',
      desc: 'One click to generate a tailored CV and cover letter for any job. Optimised for ATS and DACH hiring managers.',
      href: go('/app/cv-builder'), cta: 'Tailor my CV',
      iconBg: c.warningLight, iconColor: c.warning, badge: null,
    },
    {
      icon: '⚡', title: 'Auto Apply',
      desc: 'Point it at any job listing and AI fills the whole application form for you — fields, cover letter, file uploads. You just review and hit submit.',
      href: go('/app/auto-apply'), cta: 'Try Auto Apply',
      iconBg: c.aiLight, iconColor: c.ai, badge: 'Beta',
    },
  ]

  const steps = [
    { color: c.accent, title: 'Upload your CV', desc: 'We read your skills, experience and career history automatically — no manual entry.' },
    { color: c.success, title: 'Get your Career Scan', desc: 'See your profile score, strengths, gaps, salary range and personalised quick wins.' },
    { color: c.warning, title: 'Find matching jobs', desc: 'AI searches live boards across DACH and ranks results by how well they fit you.' },
    { color: c.ai, title: 'Apply in one click', desc: 'Generate a tailored CV and cover letter per job — or let Auto Apply fill the form for you.' },
  ]

  const stats = [
    { value: 'DACH', label: 'Market focus' },
    { value: 'AI', label: 'Powered analysis' },
    { value: '30s', label: 'Career scan' },
    { value: '1-click', label: 'CV tailoring' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: c.bg, fontFamily: f.body, overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');

        @keyframes fadeUp { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes slideCard { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0%,100% { opacity:0.5; } 50% { opacity:1; } }

        .jl-hero-badge { animation: fadeIn 0.5s ease 0.1s both; }
        .jl-hero-h1    { animation: fadeUp 0.6s ease 0.3s both; }
        .jl-hero-sub   { animation: fadeUp 0.6s ease 0.5s both; }
        .jl-hero-btns  { animation: fadeUp 0.6s ease 0.65s both; }

        .jl-card { opacity:0; transform:translateY(28px); }
        .jl-card.visible { animation: slideCard 0.5s ease forwards; }

        .jl-feat-card {
          background: #fff;
          border: 1.5px solid ${c.border};
          border-radius: 16px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          cursor: default;
          transition: border-color 0.3s, box-shadow 0.3s, transform 0.25s;
        }
        .jl-feat-card:hover {
          background: linear-gradient(#fff, #fff) padding-box,
                      linear-gradient(135deg, ${c.accent}, ${c.ai}) border-box;
          border-color: transparent;
          box-shadow: ${sh.cardHover};
          transform: translateY(-4px);
        }

        .jl-nav-link:hover { color: ${c.text} !important; }
        .jl-btn-primary {
          background: ${g.button};
          transition: all 0.2s;
        }
        .jl-btn-primary:hover {
          background: ${g.buttonHover};
          box-shadow: ${sh.glow};
          transform: translateY(-1px);
        }
        .jl-btn-glass {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.18);
          transition: all 0.2s;
        }
        .jl-btn-glass:hover {
          background: rgba(255,255,255,0.14);
          transform: translateY(-1px);
        }
        .jl-step-dot { transition: transform 0.2s, box-shadow 0.2s; }
        .jl-step:hover .jl-step-dot { transform: scale(1.12); box-shadow: 0 0 0 4px rgba(55,138,221,0.15); }

        .jl-feature-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        @media (max-width: 768px) { .jl-feature-grid { grid-template-columns: 1fr; } }
        .jl-pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 860px; margin: 0 auto; }
        @media (max-width: 700px) { .jl-pricing-grid { grid-template-columns: 1fr; } }
      `}</style>

      {/* ── Navbar ── */}
      <div style={{ background: theme.navbar.bg, padding: '0 24px', height: theme.navbar.height, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, borderBottom: `1px solid ${theme.navbar.border}`, boxShadow: '0 1px 0 rgba(255,255,255,0.05)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <svg width="26" height="26" viewBox="0 0 44 44">
            <circle cx="20" cy="20" r="13" fill="none" stroke={c.accent} strokeWidth="2.5"/>
            <circle cx="20" cy="20" r="8" fill="none" stroke={c.accentLight} strokeWidth="1.2"/>
            <circle cx="20" cy="20" r="3" fill={c.accent}/>
            <line x1="7" y1="20" x2="33" y2="20" stroke={c.accent} strokeWidth="0.8" strokeDasharray="2,2" opacity="0.5"/>
            <line x1="28" y1="28" x2="36" y2="36" stroke={c.accent} strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <span style={{ fontFamily: f.heading, fontSize: 16, fontWeight: 700, color: theme.navbar.text }}>
            Job-Lens <span style={{ color: c.accent }}>AI</span>
          </span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {!loading && (user ? (
            <>
              <span style={{ fontSize: 13, color: theme.navbar.textMuted }}>Hi, {user.name}</span>
              <Link href="/app/career-scan" className="jl-btn-primary" style={{ fontSize: 12, padding: '6px 18px', borderRadius: 20, color: '#fff', textDecoration: 'none', fontWeight: 600 }}>
                Go to App
              </Link>
            </>
          ) : (
            <>
              <Link href="/app/career-scan" className="jl-nav-link" style={{ fontSize: 13, color: theme.navbar.textMuted, textDecoration: 'none', transition: 'color 0.15s' }}>Career Scan</Link>
              <Link href="/app/smart-apply" className="jl-nav-link" style={{ fontSize: 13, color: theme.navbar.textMuted, textDecoration: 'none', transition: 'color 0.15s' }}>Job Search</Link>
              <Link href="/login" className="jl-btn-primary" style={{ fontSize: 12, padding: '6px 18px', borderRadius: 20, color: '#fff', textDecoration: 'none', fontWeight: 600 }}>
                Sign In
              </Link>
            </>
          ))}
        </div>
      </div>

      {/* ── Hero ── */}
      <div style={{ background: g.hero, padding: '88px 24px 112px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Subtle grid overlay */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(rgba(55,138,221,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(55,138,221,0.04) 1px, transparent 1px)`, backgroundSize: '64px 64px', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto' }}>
          {/* Live badge */}
          <div className="jl-hero-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, color: c.accentLight, background: gl.dark, border: `1px solid ${gl.borderDark}`, padding: '5px 16px', borderRadius: 20, marginBottom: 28, letterSpacing: 0.5, backdropFilter: gl.blur }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.success, flexShrink: 0, boxShadow: `0 0 6px ${c.success}`, animation: 'shimmer 2s ease-in-out infinite' }} />
            AI-Powered &nbsp;&middot;&nbsp; DACH Market
          </div>

          <h1 className="jl-hero-h1" style={{ fontFamily: f.heading, fontSize: 'clamp(34px, 5.5vw, 56px)', fontWeight: 700, color: theme.navbar.text, margin: '0 0 10px', lineHeight: 1.12, letterSpacing: -0.5 }}>
            Find your next role.
          </h1>
          <h1 style={{ fontFamily: f.heading, fontSize: 'clamp(34px, 5.5vw, 56px)', fontWeight: 700, margin: '0 0 28px', lineHeight: 1.12, minHeight: '1.12em', letterSpacing: -0.5 }}>
            <span style={{ background: `linear-gradient(135deg, ${c.accent}, #a78bfa)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{typedText}</span>
            <span style={{ color: c.accent, opacity: showCursor ? 1 : 0 }}>|</span>
          </h1>

          <p className="jl-hero-sub" style={{ fontSize: 16, color: theme.navbar.textMuted, maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.8 }}>
            Upload your CV, get an honest AI career analysis, discover matching jobs across Germany and Switzerland, and apply with a tailored CV and cover letter &mdash; all in one place.
          </p>

          <div className="jl-hero-btns" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href={go('/app/career-scan')} className="jl-btn-primary" style={{ padding: '14px 32px', borderRadius: 12, color: '#fff', textDecoration: 'none', fontWeight: 700, fontFamily: f.heading, fontSize: 15 }}>
              Get Started Free
            </Link>
            <Link href={go('/app/smart-apply')} className="jl-btn-glass" style={{ padding: '14px 32px', borderRadius: 12, color: theme.navbar.text, textDecoration: 'none', fontWeight: 600, fontFamily: f.heading, fontSize: 15 }}>
              Explore Jobs
            </Link>
          </div>
        </div>
      </div>

      {/* ── Floating stats strip ── */}
      <div style={{ maxWidth: 900, margin: '-52px auto 0', padding: '0 24px', position: 'relative', zIndex: 10 }}>
        <div style={{ background: gl.light, backdropFilter: gl.blur, border: `1px solid ${gl.borderLight}`, borderRadius: 16, padding: '22px 32px', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 16, boxShadow: sh.float }}>
          {stats.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: f.heading, fontSize: 22, fontWeight: 700, color: c.primary }}>{s.value}</div>
              <div style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px 56px' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{ fontFamily: f.heading, fontSize: 26, fontWeight: 700, color: c.primary, marginBottom: 10 }}>
            Everything you need to land your next role
          </div>
          <div style={{ fontSize: 14, color: c.textMuted, maxWidth: 440, margin: '0 auto', lineHeight: 1.65 }}>
            Built specifically for Germany, Switzerland and Austria
          </div>
        </div>

        <div className="jl-feature-grid" ref={cardsRef}>
          {features.map((feat, idx) => (
            <div
              key={feat.title}
              data-idx={idx}
              className={`jl-card jl-feat-card${visibleCards.includes(idx) ? ' visible' : ''}`}
              style={{ animationDelay: `${idx * 0.12}s` }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: feat.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                  {feat.icon}
                </div>
                {feat.badge && (
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' as const, background: feat.iconBg, color: feat.iconColor, padding: '3px 10px', borderRadius: 20, border: `1px solid ${feat.iconColor}30` }}>
                    {feat.badge}
                  </span>
                )}
              </div>
              <div style={{ fontFamily: f.heading, fontSize: 17, fontWeight: 700, color: c.primary }}>{feat.title}</div>
              <div style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.75, flex: 1 }}>{feat.desc}</div>
              <Link href={feat.href} style={{ fontSize: 13, padding: '10px 18px', borderRadius: 9, background: g.primaryBtn, color: '#fff', textDecoration: 'none', fontWeight: 600, display: 'inline-block', textAlign: 'center', fontFamily: f.heading }}>
                {feat.cta} &rarr;
              </Link>
            </div>
          ))}
        </div>

        {/* ── How it works ── */}
        <div style={{ marginTop: 80 }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <div style={{ fontFamily: f.heading, fontSize: 26, fontWeight: 700, color: c.primary, marginBottom: 10 }}>How it works</div>
            <div style={{ fontSize: 14, color: c.textMuted }}>From CV upload to submitted application in minutes</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 0, maxWidth: 900, margin: '0 auto', background: '#fff', border: `1px solid ${c.border}`, borderRadius: 16, overflow: 'hidden' }}>
            {steps.map((item, idx) => (
              <div key={idx} className="jl-step" style={{ padding: '28px 24px', borderRight: idx < steps.length - 1 ? `1px solid ${c.border}` : 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="jl-step-dot" style={{ width: 36, height: 36, borderRadius: '50%', background: item.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, fontFamily: f.heading, flexShrink: 0 }}>
                  {idx + 1}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: c.primary, fontFamily: f.heading, lineHeight: 1.3 }}>{item.title}</div>
                <div style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.65 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Pricing ── */}
        <div style={{ marginTop: 80 }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontFamily: f.heading, fontSize: 26, fontWeight: 700, color: c.primary, marginBottom: 10 }}>Simple credit pricing</div>
            <div style={{ fontSize: 14, color: c.textMuted, maxWidth: 480, margin: '0 auto', lineHeight: 1.65 }}>
              Buy once, use anytime. Credits never expire — perfect for a seasonal job search.
            </div>
          </div>

          {/* Cost table */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, maxWidth: 860, margin: '0 auto 36px', background: '#fff', border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden', padding: '18px 20px' }}>
            {[
              { feature: 'Smart Job Search', cost: 'Free', icon: '🔍', note: 'Always free' },
              { feature: 'Career Scan', cost: '2 credits', icon: '◎', note: 'Full AI analysis' },
              { feature: 'CV Tailoring', cost: '1 credit', icon: '📄', note: 'Per job application' },
              { feature: 'Cover Letter', cost: '1 credit', icon: '✉️', note: 'Per job application' },
              { feature: 'Feedback & Edits', cost: '1 credit', icon: '✏️', note: 'Each revision round' },
              { feature: 'Auto Apply', cost: '3 credits', icon: '⚡', note: 'Per application' },
            ].map(item => (
              <div key={item.feature} style={{ display: 'flex', flexDirection: 'column' as const, gap: 4, padding: '12px 14px', background: c.bg, borderRadius: 10, border: `1px solid ${c.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: c.primary }}>{item.icon} {item.feature}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: item.cost === 'Free' ? c.success : c.accent, fontFamily: f.heading }}>{item.cost}</span>
                </div>
                <span style={{ fontSize: 11, color: c.textMuted }}>{item.note}</span>
              </div>
            ))}
          </div>

          {/* Pack cards */}
          <div className="jl-pricing-grid">
            {[
              { label: 'Starter', price: '€4.99', credits: 20, desc: 'A quick CV refresh or a few targeted applications.', color: c.accent, popular: false, cta: 'Get Starter' },
              { label: 'Job Hunt', price: '€12.99', credits: 60, desc: 'A full 1–2 month active job search. Most popular.', color: c.accent, popular: true, cta: 'Get Job Hunt' },
              { label: 'Full Sprint', price: '€24.99', credits: 150, desc: 'Aggressive multi-apply strategy with Auto Apply.', color: c.ai, popular: false, cta: 'Get Full Sprint' },
            ].map((pack) => (
              <div key={pack.label} style={{ position: 'relative', background: '#fff', border: `1.5px solid ${pack.popular ? pack.color : c.border}`, borderRadius: 16, padding: '24px 20px', display: 'flex', flexDirection: 'column' as const, gap: 10, transition: 'box-shadow 0.2s', boxShadow: pack.popular ? `0 8px 32px ${pack.color}20` : 'none' }}>
                {pack.popular && (
                  <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: pack.color, color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 14px', borderRadius: 20, letterSpacing: 0.5, whiteSpace: 'nowrap' as const }}>
                    MOST POPULAR
                  </div>
                )}
                <div style={{ fontFamily: f.heading, fontSize: 16, fontWeight: 700, color: c.primary }}>{pack.label}</div>
                <div style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.6 }}>{pack.desc}</div>
                <div>
                  <span style={{ fontFamily: f.heading, fontSize: 32, fontWeight: 700, color: c.primary }}>{pack.price}</span>
                  <span style={{ fontSize: 13, color: c.textMuted }}> one-time</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: pack.color }}>{pack.credits} AI credits</div>
                <div style={{ fontSize: 11, color: c.textMuted }}>Credits never expire</div>
                <Link href={go('/app/account')} style={{ marginTop: 6, padding: '11px 0', borderRadius: 9, background: pack.popular ? g.primaryBtn : c.primaryLight, color: pack.popular ? '#fff' : c.navy, textDecoration: 'none', fontWeight: 700, fontFamily: f.heading, fontSize: 13, textAlign: 'center' as const, display: 'block' }}>
                  {pack.cta} &rarr;
                </Link>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <span style={{ fontSize: 13, color: c.textMuted }}>
              New accounts get <strong style={{ color: c.success }}>5 free credits</strong> to try the app — no payment needed.
            </span>
          </div>
        </div>

        {/* ── Bottom CTA ── */}
        <div style={{ marginTop: 80, background: g.ctaBlock, borderRadius: 20, padding: '56px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(rgba(55,138,221,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(55,138,221,0.04) 1px, transparent 1px)`, backgroundSize: '56px 56px', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: c.accentLight, background: gl.dark, border: `1px solid ${gl.borderDark}`, padding: '4px 14px', borderRadius: 20, marginBottom: 20, letterSpacing: 0.5, fontWeight: 600 }}>
              5 free credits on signup &nbsp;&middot;&nbsp; No card needed
            </div>
            <div style={{ fontFamily: f.heading, fontSize: 28, fontWeight: 700, color: theme.navbar.text, marginBottom: 10, letterSpacing: -0.3 }}>
              Ready to find your next role?
            </div>
            <div style={{ fontSize: 15, color: theme.navbar.textMuted, marginBottom: 32, lineHeight: 1.65 }}>
              Join DACH job seekers using AI to get hired faster.
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href={go('/app/career-scan')} className="jl-btn-primary" style={{ padding: '13px 28px', borderRadius: 10, color: '#fff', textDecoration: 'none', fontWeight: 700, fontFamily: f.heading, fontSize: 14 }}>
                Start with Career Scan
              </Link>
              <Link href={go('/app/smart-apply')} className="jl-btn-glass" style={{ padding: '13px 28px', borderRadius: 10, color: theme.navbar.text, textDecoration: 'none', fontWeight: 600, fontFamily: f.heading, fontSize: 14 }}>
                Browse Jobs
              </Link>
              <Link href={go('/app/auto-apply')} style={{ padding: '13px 28px', borderRadius: 10, background: `rgba(109,40,217,0.25)`, color: '#c4b5fd', textDecoration: 'none', fontWeight: 600, fontFamily: f.heading, fontSize: 14, border: '1px solid rgba(109,40,217,0.4)', transition: 'all 0.2s', display: 'inline-block' }}>
                &#9889; Auto Apply Beta
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 48, paddingBottom: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: c.textFaint }}>Job-Lens AI &mdash; Built for DACH job seekers</span>
          <span style={{ fontSize: 12, color: c.border }}>|</span>
          {user ? (
            <Link href="/app/career-scan" style={{ fontSize: 12, color: c.textFaint, textDecoration: 'none' }}>Go to App</Link>
          ) : (
            <Link href="/login" style={{ fontSize: 12, color: c.textFaint, textDecoration: 'none' }}>Sign in</Link>
          )}
          <Link href="/app/career-scan" style={{ fontSize: 12, color: c.textFaint, textDecoration: 'none' }}>Career Scan</Link>
          <Link href="/app/smart-apply" style={{ fontSize: 12, color: c.textFaint, textDecoration: 'none' }}>Job Search</Link>
        </div>
      </div>
    </div>
  )
}
