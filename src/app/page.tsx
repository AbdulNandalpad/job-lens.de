'use client'

import Link from 'next/link'
import { useState, useEffect, useRef, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase'
import { theme } from '@/lib/theme'

const { colors: c, gradients: g, glass: gl, fonts: f, shadow: sh } = theme

export default function HomePage() {
  const [user, setUser] = useState<{ name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [visibleCards, setVisibleCards] = useState<number[]>([])
  const cardsRef = useRef<HTMLDivElement>(null)

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

        .jl-hero-tag   { animation: fadeIn 0.4s ease 0.1s both; }
        .jl-hero-h1    { animation: fadeUp 0.6s ease 0.25s both; }
        .jl-hero-sub   { animation: fadeUp 0.6s ease 0.4s both; }
        .jl-hero-btns  { animation: fadeUp 0.6s ease 0.55s both; }

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
          transition: border-color 0.25s, box-shadow 0.25s, transform 0.25s;
        }
        .jl-feat-card:hover {
          border-color: ${c.accent};
          box-shadow: ${sh.cardHover};
          transform: translateY(-3px);
        }

        .jl-feature-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        @media (max-width: 768px) { .jl-feature-grid { grid-template-columns: 1fr; } }
        .jl-pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 900px; margin: 0 auto; align-items: start; }
        @media (max-width: 700px) { .jl-pricing-grid { grid-template-columns: 1fr; } }
        @media (max-width: 700px) { .jl-pricing-grid > *:nth-child(2) { margin-top: 0 !important; } }

        .jl-steps { display: flex; gap: 0; position: relative; }
        .jl-step { flex: 1; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 0 12px; position: relative; z-index: 1; }
        .jl-step-circle {
          width: 56px; height: 56px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; line-height: 1; margin-bottom: 20px; flex-shrink: 0;
          position: relative;
        }
        .jl-step-circle::after {
          content: ''; position: absolute; inset: -3px; border-radius: 50%;
          opacity: 0; transition: opacity 0.25s;
        }
        .jl-step:hover .jl-step-circle::after { opacity: 1; }
        @media (max-width: 680px) {
          .jl-steps { flex-direction: column; gap: 0; }
          .jl-step { flex-direction: row; text-align: left; padding: 0 0 28px 0; align-items: flex-start; }
          .jl-step-circle { margin-bottom: 0; margin-right: 20px; flex-shrink: 0; }
          .jl-steps-track { display: none !important; }
        }
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
      <div style={{ background: g.hero, padding: '80px 24px 108px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto' }}>
          {/* Location tag */}
          <div className="jl-hero-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', padding: '5px 16px', borderRadius: 20, letterSpacing: 0.5 }}>
              🇩🇪 Germany &nbsp;·&nbsp; 🇨🇭 Switzerland &nbsp;·&nbsp; 🇦🇹 Austria
            </span>
          </div>

          <h1 className="jl-hero-h1" style={{ fontFamily: f.heading, fontSize: 'clamp(30px, 4.5vw, 50px)', fontWeight: 700, color: '#fff', margin: '0 0 20px', lineHeight: 1.15, letterSpacing: -0.5 }}>
            Find your next job in the DACH market
          </h1>

          <p className="jl-hero-sub" style={{ fontSize: 17, color: 'rgba(255,255,255,0.6)', maxWidth: 500, margin: '0 auto 40px', lineHeight: 1.75, fontWeight: 400 }}>
            Upload your CV. See where you stand. Get matched with real jobs across Germany, Switzerland and Austria. Apply with a tailored CV and cover letter.
          </p>

          <div className="jl-hero-btns" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href={go('/app/career-scan')} className="jl-btn-primary" style={{ padding: '14px 32px', borderRadius: 12, color: '#fff', textDecoration: 'none', fontWeight: 700, fontFamily: f.heading, fontSize: 15 }}>
              Get Started Free
            </Link>
            <Link href={go('/app/smart-apply')} className="jl-btn-glass" style={{ padding: '14px 32px', borderRadius: 12, color: theme.navbar.text, textDecoration: 'none', fontWeight: 600, fontFamily: f.heading, fontSize: 15 }}>
              Explore Jobs
            </Link>
          </div>

          {/* India market switch */}
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
            <Link href="/in" style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,153,51,0.07)', border: '1px solid rgba(255,153,51,0.18)', borderRadius: 20, padding: '6px 16px', textDecoration: 'none' }}>
              🇮🇳 Looking for jobs in India? <span style={{ color: '#FF9933', fontWeight: 600 }}>Job-Lens India →</span>
            </Link>
          </div>

          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            <span>🇩🇪 Made in Germany</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>Your data is never stored</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>5 free credits</span>
          </div>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div style={{ maxWidth: 860, margin: '-44px auto 0', padding: '0 24px', position: 'relative', zIndex: 10 }}>
        <div style={{ background: '#fff', border: `1px solid ${c.border}`, borderRadius: 14, padding: '20px 32px', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          {stats.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: f.heading, fontSize: 20, fontWeight: 700, color: c.text }}>{s.value}</div>
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
              <Link href={feat.href} style={{ fontSize: 13, padding: '10px 18px', borderRadius: 9, background: g.primaryBtn, color: '#fff', textDecoration: 'none', fontWeight: 600, display: 'inline-block', textAlign: 'center' as const, fontFamily: f.heading }}>
                {feat.cta} &rarr;
              </Link>
            </div>
          ))}
        </div>

        {/* ── How it works ── */}
        <div style={{ marginTop: 80 }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ fontFamily: f.heading, fontSize: 26, fontWeight: 700, color: c.primary, marginBottom: 10 }}>How it works</div>
            <div style={{ fontSize: 14, color: c.textMuted }}>From CV upload to submitted application in minutes</div>
          </div>

          <div style={{ maxWidth: 920, margin: '0 auto', position: 'relative' }}>
            {/* Connector track — sits behind the circles */}
            <div className="jl-steps-track" style={{ position: 'absolute', top: 28, left: 'calc(12.5% + 4px)', right: 'calc(12.5% + 4px)', height: 2, background: `linear-gradient(90deg, ${c.accent} 0%, ${c.success} 40%, ${c.warning} 70%, ${c.accent} 100%)`, opacity: 0.18, borderRadius: 1 }} />
            <div className="jl-steps-track" style={{ position: 'absolute', top: 28, left: 'calc(12.5% + 4px)', right: 'calc(12.5% + 4px)', height: 2, background: c.borderLight, borderRadius: 1 }} />

            <div className="jl-steps">
              {([
                {
                  num: '01', color: c.accent, bg: c.primaryLight,
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                    </svg>
                  ),
                  title: 'Upload your CV', desc: 'PDF, DOCX or paste text. We extract your skills and experience automatically.',
                },
                {
                  num: '02', color: c.success, bg: c.successLight,
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  ),
                  title: 'Get your Career Scan', desc: 'Score, salary range, strengths, gaps and a personalised action plan — in 30 seconds.',
                },
                {
                  num: '03', color: c.warning, bg: c.warningLight,
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                  ),
                  title: 'Find matching jobs', desc: 'AI searches live boards across DACH and ranks results by how well they fit your profile.',
                },
                {
                  num: '04', color: c.accent, bg: c.primaryLight,
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                  ),
                  title: 'Apply in one click', desc: 'Tailored CV and cover letter per job — or let Auto Apply fill the whole form for you.',
                },
              ] as { num: string; color: string; bg: string; icon: ReactNode; title: string; desc: string }[]).map((step, idx) => (
                <div key={idx} className="jl-step">
                  <div className="jl-step-circle" style={{ background: step.bg, border: `2px solid ${step.color}22` }}>
                    {step.icon}
                    {/* Step number badge */}
                    <div style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: step.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', fontFamily: f.heading, letterSpacing: 0.5 }}>
                      {step.num}
                    </div>
                  </div>
                  <div style={{ fontFamily: f.heading, fontSize: 15, fontWeight: 700, color: c.primary, marginBottom: 8, lineHeight: 1.3 }}>{step.title}</div>
                  <div style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.65, maxWidth: 200 }}>{step.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Pricing ── */}
        <div style={{ marginTop: 80 }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ fontFamily: f.heading, fontSize: 26, fontWeight: 700, color: c.primary, marginBottom: 10 }}>Simple, honest pricing</div>
            <div style={{ fontSize: 14, color: c.textMuted, maxWidth: 480, margin: '0 auto', lineHeight: 1.65 }}>
              Buy once, use anytime. Credits never expire — perfect for a focused job search.
            </div>
          </div>

          {/* 3-column pricing — middle card raised as "Most Popular" */}
          <div className="jl-pricing-grid" style={{ alignItems: 'start' }}>

            {/* ── Tier 1: Free ── */}
            <div style={{ background: '#fff', border: `1.5px solid ${c.border}`, borderRadius: 16, padding: '28px 24px', display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: c.success, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 8 }}>Free</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontFamily: f.heading, fontSize: 34, fontWeight: 700, color: c.primary, lineHeight: 1 }}>€0</span>
                </div>
                <div style={{ fontSize: 12, color: c.textMuted, marginTop: 4 }}>Forever free · no card needed</div>
              </div>
              <div style={{ height: 1, background: c.border }} />
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10, flex: 1 }}>
                {[
                  '5 credits on signup',
                  'Career Scan (preview)',
                  'Unlimited job browsing',
                  'Smart job matching',
                ].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: c.text }}>
                    <span style={{ color: c.success, fontWeight: 700, fontSize: 15, lineHeight: '1.4', flexShrink: 0 }}>✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <Link href={go('/app/career-scan')} style={{ padding: '11px 0', borderRadius: 9, background: c.primaryLight, color: c.navy, textDecoration: 'none', fontWeight: 700, fontFamily: f.heading, fontSize: 13, textAlign: 'center' as const, display: 'block', transition: 'opacity 0.15s' }}>
                Start free &rarr;
              </Link>
            </div>

            {/* ── Tier 2: Job Hunt — Most Popular (middle, raised) ── */}
            <div style={{ position: 'relative', background: '#fff', border: `2px solid ${c.accent}`, borderRadius: 18, padding: '36px 24px 28px', display: 'flex', flexDirection: 'column' as const, gap: 16, boxShadow: `0 12px 40px ${c.accent}22, 0 2px 8px rgba(0,0,0,0.06)`, marginTop: -16 }}>
              {/* Badge */}
              <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: g.button, color: '#fff', fontSize: 10, fontWeight: 700, padding: '5px 18px', borderRadius: 20, whiteSpace: 'nowrap' as const, letterSpacing: 0.8, boxShadow: `0 4px 12px ${c.accent}40` }}>
                ★ MOST POPULAR
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: c.accent, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 8 }}>Job Hunt</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontFamily: f.heading, fontSize: 34, fontWeight: 700, color: c.primary, lineHeight: 1 }}>€12.99</span>
                </div>
                <div style={{ fontSize: 12, color: c.textMuted, marginTop: 4 }}>60 credits · never expire</div>
              </div>
              <div style={{ height: 1, background: `${c.accent}22` }} />
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10, flex: 1 }}>
                {[
                  '60 credits (~20 full applications)',
                  'CV tailoring — 1 credit each',
                  'Cover letter — 1 credit each',
                  'Career Scan — 2 credits',
                  'Auto Apply — 3 credits',
                ].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: c.text }}>
                    <span style={{ color: c.accent, fontWeight: 700, fontSize: 15, lineHeight: '1.4', flexShrink: 0 }}>✓</span>
                    <span>{item}</span>
                  </div>
                ))}
                <div style={{ marginTop: 4, padding: '8px 12px', background: c.primaryLight, borderRadius: 8, fontSize: 12, color: c.navy, fontWeight: 600 }}>
                  Best value for active job seekers
                </div>
              </div>
              <Link href={go('/app/account')} style={{ padding: '13px 0', borderRadius: 10, background: g.button, color: '#fff', textDecoration: 'none', fontWeight: 700, fontFamily: f.heading, fontSize: 14, textAlign: 'center' as const, display: 'block', boxShadow: `0 4px 14px ${c.accent}35` }}>
                Get Job Hunt &rarr;
              </Link>
            </div>

            {/* ── Tier 3: Full Sprint ── */}
            <div style={{ background: '#fff', border: `1.5px solid ${c.border}`, borderRadius: 16, padding: '28px 24px', display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: c.primary, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 8 }}>Full Sprint</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontFamily: f.heading, fontSize: 34, fontWeight: 700, color: c.primary, lineHeight: 1 }}>€24.99</span>
                </div>
                <div style={{ fontSize: 12, color: c.textMuted, marginTop: 4 }}>150 credits · never expire</div>
              </div>
              <div style={{ height: 1, background: c.border }} />
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10, flex: 1 }}>
                {[
                  '150 credits (~50 full applications)',
                  'Everything in Job Hunt',
                  'Multi-month job search',
                  'Ideal for career changers',
                ].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: c.text }}>
                    <span style={{ color: c.success, fontWeight: 700, fontSize: 15, lineHeight: '1.4', flexShrink: 0 }}>✓</span>
                    <span>{item}</span>
                  </div>
                ))}
                <div style={{ marginTop: 4, padding: '8px 12px', background: c.bg, borderRadius: 8, border: `1px solid ${c.border}`, fontSize: 12, color: c.textMuted }}>
                  Also available: Starter pack €4.99 / 20 credits
                </div>
              </div>
              <Link href={go('/app/account')} style={{ padding: '11px 0', borderRadius: 9, background: c.primaryLight, color: c.navy, textDecoration: 'none', fontWeight: 700, fontFamily: f.heading, fontSize: 13, textAlign: 'center' as const, display: 'block' }}>
                Get Full Sprint &rarr;
              </Link>
            </div>

          </div>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <span style={{ fontSize: 13, color: c.textMuted }}>
              New accounts get <strong style={{ color: c.success }}>5 free credits</strong> — no card needed. Credits never expire.
            </span>
          </div>
        </div>

        {/* ── Bottom CTA ── */}
        <div style={{ marginTop: 80, background: g.ctaBlock, borderRadius: 20, padding: '56px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16, letterSpacing: 0.5 }}>
            5 free credits on signup &nbsp;·&nbsp; No card required
          </div>
          <div style={{ fontFamily: f.heading, fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 10, letterSpacing: -0.3 }}>
            Ready to start your job search?
          </div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', marginBottom: 36, lineHeight: 1.65 }}>
            Career analysis, job matching and applications — all in one place.
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href={go('/app/career-scan')} className="jl-btn-primary" style={{ padding: '13px 28px', borderRadius: 10, color: '#fff', textDecoration: 'none', fontWeight: 700, fontFamily: f.heading, fontSize: 14 }}>
              Start with Career Scan
            </Link>
            <Link href={go('/app/smart-apply')} className="jl-btn-glass" style={{ padding: '13px 28px', borderRadius: 10, color: theme.navbar.text, textDecoration: 'none', fontWeight: 600, fontFamily: f.heading, fontSize: 14 }}>
              Browse Jobs
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 48, paddingBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: c.textFaint }}>🇩🇪 Made in Germany &nbsp;&middot;&nbsp; Job-Lens AI</span>
            <span style={{ fontSize: 12, color: c.border }}>|</span>
            {user ? (
              <Link href="/app/career-scan" style={{ fontSize: 12, color: c.textFaint, textDecoration: 'none' }}>Go to App</Link>
            ) : (
              <Link href="/login" style={{ fontSize: 12, color: c.textFaint, textDecoration: 'none' }}>Sign in</Link>
            )}
            <Link href="/app/career-scan" style={{ fontSize: 12, color: c.textFaint, textDecoration: 'none' }}>Career Scan</Link>
            <Link href="/app/smart-apply" style={{ fontSize: 12, color: c.textFaint, textDecoration: 'none' }}>Job Search</Link>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Link href="/impressum" style={{ fontSize: 11, color: c.textFaint, textDecoration: 'none' }}>Impressum</Link>
            <span style={{ fontSize: 11, color: c.border }}>·</span>
            <Link href="/datenschutz" style={{ fontSize: 11, color: c.textFaint, textDecoration: 'none' }}>Datenschutzerklärung</Link>
            <span style={{ fontSize: 11, color: c.border }}>·</span>
            <Link href="/agb" style={{ fontSize: 11, color: c.textFaint, textDecoration: 'none' }}>AGB</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
