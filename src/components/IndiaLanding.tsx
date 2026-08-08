'use client'

// India landing — warm-skin sibling of the DACH landing (same skeleton,
// saffron temperature), ATS-first messaging with the Germany path as the
// aspiration layer. Rendered for logged-out visitors by src/app/in/page.tsx.
// The previous dark landing is on standby in src/app/in/_landing-v1.tsx.

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { theme } from '@/lib/theme'
import KiraDemoWidget from '@/components/KiraDemoWidget'
import KiraOrb from '@/components/KiraOrb'
import { RAZORPAY_PACKS } from '@/lib/constants'

const { colors: c, gradients: g } = theme
const saffron = '#FF9933'
const saffronDeep = '#e67300'
const indiaGreen = '#138808'
const navy = '#042C53'
const ctaGrad = `linear-gradient(135deg, ${saffron}, ${saffronDeep})`

const T = {
  navHow: 'How it works',
  navAts: 'Why ATS?',
  navGuides: 'Visa Guides',
  navSignIn: 'Sign in',
  navApp: 'Go to App',
  navCta: 'Talk to Kira',
  eyebrow: 'AI career copilot · India + Germany',
  h1a: '90% of CVs die in the ATS.',
  h1b: 'Yours won’t.',
  sub: 'Kira scores your CV the way the bots do, fixes the gaps, finds matching jobs in India and Germany — and hands you the finished application.',
  cta1: 'Talk to Kira',
  cta2: 'What is ATS?',
  trust: ['5 free credits', 'No card needed', 'Packs from ₹149'],
  strip: ['Live jobs: India + Germany', 'Credits never expire', 'Data never sold', 'Powered by Claude AI'],
  atsTitle: 'The filter nobody told you about.',
  atsSub: 'Before any human sees your CV, software decides if it survives. That software is the ATS.',
  atsCards: [
    { title: 'What the ATS actually does', body: 'When you apply on Naukri, LinkedIn or a company portal, your CV goes to software first — not a recruiter. It scans for keywords from the job description. No match = instant rejection.' },
    { title: 'Why your CV fails it', body: 'Missing keywords the job demands. Tables, sidebars and graphics the bot can’t read. No clear sections. The bot doesn’t read meaning — only matches.' },
    { title: 'How Kira beats it', body: 'She scores your CV against the exact job description, rewrites it with the right keywords in a clean format, and shows you the before/after score. In minutes, not days.' },
  ],
  atsCompanies: ['TCS', 'Infosys', 'Wipro', 'HCL', 'Cognizant', 'Accenture', 'Flipkart', 'Swiggy', 'Razorpay', 'CRED', 'PhonePe', 'Paytm'],
  atsCompaniesNote: 'Companies in India screening CVs with ATS software',
  howTitle: 'One conversation. Finished applications.',
  howSub: 'No form marathon. You talk, Kira works.',
  steps: [
    { n: '01', title: 'Show Kira your CV', desc: 'Upload it or just talk — by text or live voice. She runs the ATS check the moment she has it.', mock: 'chat' },
    { n: '02', title: 'She scores and searches', desc: 'ATS score with exact keyword gaps, then live jobs across India and Germany — every role scored against your profile.', mock: 'jobs' },
    { n: '03', title: 'Application, done', desc: 'ATS-optimised CV, personal cover letter, interview prep. Review, download, send.', mock: 'doc' },
  ],
  outputTitle: 'Real output — not just a score.',
  outputSub: 'What you actually hold after 10 minutes:',
  outputs: [
    { title: 'ATS Score + fix list', desc: 'Your score out of 100, every keyword gap, format issues flagged — like the bots see it.', cost: '2 credits' },
    { title: 'ATS-optimised CV', desc: 'Rewritten for the specific job — right keywords, clean single-column format, recruiter-ready.', cost: '1 credit' },
    { title: 'Personal cover letter', desc: 'No template. Written fresh for exactly this role and your profile.', cost: '1 credit' },
  ],
  outputNote: 'A complete application costs about 3–4 credits. Your first 5 are free.',
  tools: ['ATS Score', 'Job Search', 'CV Builder', 'Cover Letter', 'Interview Training', 'Salary Simulator (LPA)', 'Application Tracker'],
  toolsTitle: 'Prefer doing it yourself?',
  toolsSub: 'Every tool also works standalone — classic mode, no Kira.',
  demoTag: 'Live demo',
  demoTitle: 'Talk to her. Right now.',
  demoSub: 'Kira holds real conversations, finds real jobs and executes real tasks — by text or voice. Try the demo, no signup needed.',
  demoBullets: ['Live job search across India and Germany', 'Executes tasks: ATS check, CV fixing, cover letters', 'Voice mode: 5 minutes of real conversation'],
  deTag: 'The Germany path · Free guides',
  deTitle: 'Dreaming of Germany? We know the way.',
  deSub: 'Step-by-step guides to every German work visa, a Chancenkarte points calculator with the official 2026 criteria — and live German jobs right inside your job search.',
  deCta1: 'Calculate Chancenkarte points',
  deCta2: 'All visa guides',
  priceTitle: 'Simple pricing in ₹',
  priceSub: 'No dollar conversions. Credits never expire. No card required to start.',
  faqTitle: 'Frequently asked questions',
  faq: [
    { q: 'What does Job-Lens cost?', a: 'Starting is free — you get 5 credits, no card. After that: an ATS scan costs 2 credits, an optimised CV 1 credit, a cover letter 1 credit. Packs start at ₹149 for 10 credits, and credits never expire.' },
    { q: 'What exactly is an ATS?', a: 'An Applicant Tracking System — the software companies use to screen CVs before a human reads them. It scans for keywords from the job description; around 90% of CVs are rejected at this stage. Kira scores your CV the same way the ATS does, then fixes what fails.' },
    { q: 'Where do the job listings come from?', a: 'Live from Adzuna for Indian roles, and for Germany from Adzuna plus the German Federal Employment Agency’s official job board. No invented listings.' },
    { q: 'Is my CV safe?', a: 'Yes. It’s stored only with your explicit consent, encrypted, on EU servers under GDPR — one of the world’s strictest privacy laws. Never shared, never sold, delete it any time.' },
    { q: 'Can Job-Lens really help me get to Germany?', a: 'It’s built for exactly that. The visa check scores all 5 routes to a German work visa against your profile, free guides explain every step with official sources, the Chancenkarte calculator shows if you reach the 6 points — and the job search includes live German listings.' },
  ],
  finalTitle: 'Your next job starts with one sentence.',
  finalSub: 'Start free — 5 credits included, no card needed.',
  finalCta: 'Talk to Kira',
}

// Self-playing hero demo — ATS-first script, India + Germany jobs.
type DemoItem =
  | { kind: 'user' | 'kira'; text: string }
  | { kind: 'file'; name: string; note: string }
  | { kind: 'job'; title: string; co: string; pct: string }
  | { kind: 'done'; text: string; dl: string }

type DemoStep = { delay: number; item: DemoItem | null; mode?: 'type' | 'voice' }

function HeroDemo() {
  const [items, setItems] = useState<DemoItem[]>([])
  const [mode, setMode] = useState<'type' | 'voice'>('type')

  useEffect(() => {
    const steps: DemoStep[] = [
      { delay: 700,  item: { kind: 'user', text: 'Here’s my CV — will it pass the ATS for React developer roles?' } },
      { delay: 600,  item: { kind: 'file', name: 'Resume.pdf', note: 'uploaded ✓' } },
      { delay: 1500, item: { kind: 'kira', text: 'ATS check: 61/100 — 4 keyword gaps. Want me to fix them and find matching jobs?' } },
      { delay: 1600, item: { kind: 'user', text: 'Yes — India and Germany both.' } },
      { delay: 1500, item: { kind: 'kira', text: 'Fixed — new score 89/100. Top matches:' } },
      { delay: 700,  item: { kind: 'job', title: 'React Developer', co: 'Infosys · Bangalore', pct: '88% match' } },
      { delay: 500,  item: { kind: 'job', title: 'Frontend Engineer', co: 'SAP · Berlin', pct: '84% match' } },
      { delay: 1200, item: { kind: 'done', text: '✓ ATS-ready application — Infosys', dl: 'Download ↓' } },
      { delay: 3400, item: null, mode: 'voice' },
      { delay: 3600, item: null, mode: 'type' },
    ]
    let idx = 0
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      timer = setTimeout(() => {
        const s = steps[idx]
        if (s.mode) setMode(s.mode)
        if (s.item === null) setItems([])
        else { const item = s.item; setItems(prev => [...prev, item]) }
        idx = (idx + 1) % steps.length
        tick()
      }, steps[idx].delay)
    }
    setItems([])
    setMode('type')
    tick()
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="v2-demo-panel" style={{ background: '#fff', border: '1px solid #f3e3cf', borderRadius: 18, boxShadow: '0 18px 50px rgba(230,115,0,0.13)', padding: '16px 16px 14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, paddingBottom: 11, borderBottom: '1px solid #f6ede1', marginBottom: 11, flexShrink: 0 }}>
        <div className="v2-orb-mini" style={{ width: 26, height: 26, borderRadius: '50%', background: `linear-gradient(135deg, ${c.ai}, ${c.accent})`, flexShrink: 0 }} />
        <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13.5, fontWeight: 700, color: c.text }}>Kira</span>
        <span style={{ fontSize: 9.5, fontWeight: 800, color: saffronDeep, background: `${saffron}18`, padding: '2px 8px', borderRadius: 9, letterSpacing: 0.5 }}>LIVE</span>
        <span style={{ flex: 1 }} />
        <span style={{ display: 'inline-flex', background: '#faf4ea', borderRadius: 16, padding: 3, gap: 2 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, padding: '4px 11px', borderRadius: 13, transition: 'all .3s', background: mode === 'type' ? '#fff' : 'transparent', color: mode === 'type' ? saffronDeep : c.textFaint, boxShadow: mode === 'type' ? '0 1px 4px rgba(4,44,83,0.12)' : 'none' }}>
            ⌨ Type
          </span>
          <span style={{ fontSize: 10.5, fontWeight: 700, padding: '4px 11px', borderRadius: 13, transition: 'all .3s', background: mode === 'voice' ? '#fff' : 'transparent', color: mode === 'voice' ? c.ai : c.textFaint, boxShadow: mode === 'voice' ? '0 1px 4px rgba(4,44,83,0.12)' : 'none' }}>
            🎤 Talk
          </span>
        </span>
      </div>
      {mode === 'voice' ? (
        <div className="v2-chat-item" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden' }}>
          <KiraOrb state="speaking" />
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14.5, fontWeight: 700, color: c.text, textAlign: 'center' }}>
            Or just talk to her — live.
          </div>
          <div style={{ fontSize: 11.5, color: c.textFaint, textAlign: 'center' }}>
            Same conversation, same results. By voice.
          </div>
        </div>
      ) : (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
        {items.map((item, i) => {
          if (item.kind === 'user') return (
            <div key={i} className="v2-chat-item" style={{ alignSelf: 'flex-end', background: saffronDeep, color: '#fff', padding: '8px 13px', borderRadius: '13px 13px 3px 13px', maxWidth: '80%', lineHeight: 1.5 }}>{item.text}</div>
          )
          if (item.kind === 'file') return (
            <div key={i} className="v2-chat-item" style={{ alignSelf: 'flex-end', display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #f3e3cf', background: '#fffaf3', borderRadius: 10, padding: '7px 12px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={saffronDeep} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: c.text }}>{item.name}</span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: indiaGreen }}>{item.note}</span>
            </div>
          )
          if (item.kind === 'kira') return (
            <div key={i} className="v2-chat-item" style={{ alignSelf: 'flex-start', background: '#faf4ea', color: c.text, padding: '8px 13px', borderRadius: '3px 13px 13px 13px', maxWidth: '84%', lineHeight: 1.5 }}>{item.text}</div>
          )
          if (item.kind === 'job') return (
            <div key={i} className="v2-chat-item" style={{ alignSelf: 'stretch', border: '1px solid #f3e3cf', borderRadius: 11, padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
              <span>
                <span style={{ fontWeight: 700, color: c.text }}>{item.title}</span><br />
                <span style={{ fontSize: 11, color: c.textFaint }}>{item.co}</span>
              </span>
              <span style={{ fontSize: 11, fontWeight: 800, color: indiaGreen, background: `${indiaGreen}12`, padding: '3px 9px', borderRadius: 9, flexShrink: 0 }}>{item.pct}</span>
            </div>
          )
          if (item.kind === 'done') return (
            <div key={i} className="v2-chat-item" style={{ alignSelf: 'stretch', border: `1.5px solid ${indiaGreen}55`, background: `${indiaGreen}0a`, borderRadius: 11, padding: '10px 13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: c.text }}>{item.text}</span>
              <span style={{ fontSize: 11.5, color: saffronDeep, fontWeight: 700, flexShrink: 0 }}>{item.dl}</span>
            </div>
          )
          return null
        })}
      </div>
      )}
    </div>
  )
}

export default function IndiaLanding() {
  const [user, setUser] = useState<{ name: string } | null>(null)
  const t = T

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ name: data.user.user_metadata?.full_name ?? data.user.email ?? 'User' })
    })
  }, [])

  const go = (path: string) => (user ? path : `/in/login?next=${encodeURIComponent(path)}`)

  const packs = [
    { name: 'Free', price: 0, credits: 5, note: 'On signup — try everything', popular: false },
    { name: 'Starter', price: 149, credits: RAZORPAY_PACKS['149'], note: '≈ 2–3 full applications', popular: false },
    { name: 'Job Hunt', price: 499, credits: RAZORPAY_PACKS['499'], note: '≈ 8 full applications', popular: true },
    { name: 'Full Sprint', price: 999, credits: RAZORPAY_PACKS['999'], note: '≈ 17 full applications', popular: false },
  ]

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: c.text, background: '#fff' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700;800&display=swap');
        .v2-wrap { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
        .v2-cta { transition: transform .18s ease, box-shadow .18s ease; }
        .v2-cta:hover { transform: translateY(-2px); box-shadow: 0 14px 34px rgba(230,115,0,0.35); }
        .v2-ghost:hover { border-color: ${saffron} !important; color: ${saffronDeep} !important; }
        .v2-tool { transition: transform .18s ease, border-color .18s ease; }
        .v2-tool:hover { transform: translateY(-3px); border-color: ${saffron}88; }
        .v2-nav-link { color: ${c.textMuted}; text-decoration: none; font-size: 14px; white-space: nowrap; }
        .v2-nav-link:hover { color: ${saffronDeep}; }
        .v2-nav-links { display: flex; gap: 26px; align-items: center; }
        .v2-header-row { flex-wrap: nowrap; }
        @keyframes v2-rise { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: translateY(0) } }
        .v2-rise { opacity: 0; animation: v2-rise .7s cubic-bezier(.22,1,.36,1) forwards; }
        .v2-chat-item { animation: v2-rise .35s ease forwards; opacity: 0; }
        @keyframes v2-pulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.08) } }
        .v2-orb-mini { animation: v2-pulse 2.6s ease-in-out infinite; }
        .v2-hero-grid { display: grid; grid-template-columns: 1.05fr 1fr; gap: 30px; align-items: center; }
        .v2-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
        .v2-outputs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
        .v2-ats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
        .v2-price-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; align-items: start; }
        .v2-demo-grid { display: grid; grid-template-columns: 0.85fr 1.15fr; gap: 34px; align-items: center; }
        @media (max-width: 900px) {
          .v2-hero-grid { grid-template-columns: 1fr; text-align: center; }
          .v2-hero-copy { display: flex; flex-direction: column; align-items: center; }
          .v2-steps, .v2-outputs, .v2-ats-grid { grid-template-columns: 1fr; }
          .v2-price-grid { grid-template-columns: repeat(2, 1fr); }
          .v2-demo-grid { grid-template-columns: 1fr; }
          .v2-h1 { font-size: 34px !important; }
          .v2-nav-links { display: none; }
        }
        @media (max-width: 540px) { .v2-price-grid { grid-template-columns: 1fr; } }
        .v2-demo-panel { height: 420px; }
        @media (max-width: 640px) {
          .v2-wrap { padding: 0 16px; }
          .v2-h1 { font-size: 29px !important; letter-spacing: -1px !important; }
          .v2-hero-inner { padding-top: 40px !important; padding-bottom: 40px !important; }
          .v2-demo-panel { height: 510px; }
          .v2-signin { display: none !important; }
          .v2-cta { padding: 8px 14px !important; font-size: 12.5px !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,253,249,0.88)', backdropFilter: 'blur(14px)', borderBottom: '1px solid #f6ede1' }}>
        <div className="v2-wrap v2-header-row" style={{ height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/in" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.svg" alt="Job-Lens India" width={30} height={30} style={{ display: 'block' }} />
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 17, fontWeight: 800, color: navy, whiteSpace: 'nowrap' }}>
              Job-Lens <span style={{ color: saffron }}>India</span>
            </span>
          </Link>
          <nav className="v2-nav-links">
            <a href="#how" className="v2-nav-link">{t.navHow}</a>
            <a href="#ats" className="v2-nav-link">{t.navAts}</a>
            <Link href="/guides" className="v2-nav-link">{t.navGuides}</Link>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href={user ? '/in' : '/in/login'} className="v2-nav-link v2-signin" style={{ fontWeight: 600 }}>
              {user ? t.navApp : t.navSignIn}
            </Link>
            <Link href={go('/in')} className="v2-cta"
              style={{ background: ctaGrad, color: '#fff', padding: '9px 20px', borderRadius: 10, fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 13.5, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {t.navCta}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ background: g.heroWarm, overflow: 'hidden' }}>
        <div className="v2-wrap v2-hero-inner" style={{ paddingTop: 72, paddingBottom: 60 }}>
          <div className="v2-hero-grid">
            <div className="v2-hero-copy">
              <div className="v2-rise" style={{ fontSize: 12.5, fontWeight: 700, color: saffronDeep, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 18 }}>
                {t.eyebrow}
              </div>
              <h1 className="v2-rise v2-h1" style={{ animationDelay: '.08s', fontFamily: "'Outfit', sans-serif", fontSize: 50, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1.5, margin: '0 0 20px', color: navy }}>
                {t.h1a}<br />
                <span style={{ background: `linear-gradient(90deg, ${saffron}, ${indiaGreen})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {t.h1b}
                </span>
              </h1>
              <p className="v2-rise" style={{ animationDelay: '.16s', fontSize: 17, color: c.textMuted, lineHeight: 1.7, maxWidth: 480, margin: '0 0 28px' }}>
                {t.sub}
              </p>
              <div className="v2-rise" style={{ animationDelay: '.24s', display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
                <Link href={go('/in')} className="v2-cta"
                  style={{ background: ctaGrad, color: '#fff', padding: '15px 32px', borderRadius: 12, fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 16, textDecoration: 'none', boxShadow: '0 8px 24px rgba(230,115,0,0.3)' }}>
                  {t.cta1} →
                </Link>
                <a href="#ats" className="v2-ghost"
                  style={{ background: '#fff', border: '1.5px solid #f0dfc8', color: c.text, padding: '15px 28px', borderRadius: 12, fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 15, textDecoration: 'none', transition: 'all .15s' }}>
                  {t.cta2}
                </a>
              </div>
              <div className="v2-rise" style={{ animationDelay: '.32s', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {t.trust.map(item => (
                  <span key={item} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: c.textFaint }}>
                    <span style={{ color: indiaGreen, fontWeight: 800 }}>✓</span>{item}
                  </span>
                ))}
              </div>
            </div>

            <div className="v2-rise" style={{ animationDelay: '.2s' }}>
              <HeroDemo />
            </div>
          </div>
        </div>

        {/* Trust strip */}
        <div style={{ borderTop: '1px solid #f6ede1', background: 'rgba(255,255,255,0.6)' }}>
          <div className="v2-wrap" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', padding: '16px 24px' }}>
            {t.strip.map(item => (
              <span key={item} style={{ fontSize: 12.5, fontWeight: 600, color: c.textMuted, background: '#fff', border: '1px solid #f6ede1', borderRadius: 20, padding: '7px 16px' }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── ATS education — India's #1 hook, highlighted ── */}
      <section id="ats" style={{ padding: '84px 0 70px', background: '#fff' }}>
        <div className="v2-wrap">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: saffronDeep, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>ATS explained simply</div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 34, fontWeight: 800, color: navy, margin: '0 0 10px', letterSpacing: -0.5 }}>
              {t.atsTitle}
            </h2>
            <p style={{ fontSize: 15, color: c.textMuted, maxWidth: 560, margin: '0 auto' }}>{t.atsSub}</p>
          </div>
          <div className="v2-ats-grid">
            {t.atsCards.map((card, i) => (
              <div key={card.title} style={{ background: '#fffdf9', border: '1px solid #f3e3cf', borderTop: `3px solid ${[saffron, '#E24B4A', indiaGreen][i]}`, borderRadius: 16, padding: '24px 22px' }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16.5, fontWeight: 700, color: navy, marginBottom: 10 }}>{card.title}</div>
                <div style={{ fontSize: 13.5, color: c.textMuted, lineHeight: 1.7 }}>{card.body}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 26, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: c.textFaint, marginBottom: 12, fontWeight: 600 }}>{t.atsCompaniesNote}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {t.atsCompanies.map(co => (
                <span key={co} style={{ padding: '5px 14px', borderRadius: 20, background: '#faf4ea', fontSize: 12, color: '#374151', fontWeight: 500 }}>{co}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" style={{ padding: '70px 0', background: g.heroWarm }}>
        <div className="v2-wrap">
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 34, fontWeight: 800, color: navy, textAlign: 'center', margin: '0 0 10px', letterSpacing: -0.5 }}>
            {t.howTitle}
          </h2>
          <p style={{ fontSize: 15, color: c.textMuted, textAlign: 'center', margin: '0 0 44px' }}>{t.howSub}</p>
          <div className="v2-steps">
            {t.steps.map(step => (
              <div key={step.n} style={{ background: '#fff', border: '1px solid #f3e3cf', borderRadius: 18, padding: '26px 24px' }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 800, color: saffronDeep, marginBottom: 12 }}>{step.n}</div>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 700, color: c.text, marginBottom: 8 }}>{step.title}</div>
                <div style={{ fontSize: 13.5, color: c.textMuted, lineHeight: 1.65, marginBottom: 18 }}>{step.desc}</div>
                {step.mock === 'chat' && (
                  <div style={{ background: '#fffdf9', border: '1px solid #f6ede1', borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ background: `${saffron}15`, borderRadius: '12px 12px 3px 12px', padding: '8px 12px', fontSize: 12, color: c.text, marginBottom: 8, marginLeft: 24 }}>
                      “Here’s my CV — check it for this Infosys job.”
                    </div>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: saffron, opacity: 0.9 }} />
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: saffron, opacity: 0.55 }} />
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: saffron, opacity: 0.3 }} />
                    </div>
                  </div>
                )}
                {step.mock === 'jobs' && (
                  <div style={{ background: '#fffdf9', border: '1px solid #f6ede1', borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {[['88%', indiaGreen], ['84%', indiaGreen], ['71%', saffronDeep]].map(([pct, col], i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ height: 8, borderRadius: 4, background: '#f0e6d6', width: `${68 - i * 10}%` }} />
                        <span style={{ fontSize: 11, fontWeight: 800, color: col as string }}>{pct}</span>
                      </div>
                    ))}
                  </div>
                )}
                {step.mock === 'doc' && (
                  <div style={{ background: '#fffdf9', border: '1px solid #f6ede1', borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ height: 9, width: '46%', borderRadius: 4, background: navy, opacity: 0.85, marginBottom: 8 }} />
                    {[86, 74, 80].map((w, i) => (
                      <div key={i} style={{ height: 6, width: `${w}%`, borderRadius: 3, background: '#f0e6d6', marginBottom: 5 }} />
                    ))}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 11, fontWeight: 700, color: indiaGreen }}>
                      ✓ Ready to send
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Real output ── */}
      <section style={{ padding: '70px 0', background: '#fff' }}>
        <div className="v2-wrap">
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 34, fontWeight: 800, color: navy, textAlign: 'center', margin: '0 0 10px', letterSpacing: -0.5 }}>
            {t.outputTitle}
          </h2>
          <p style={{ fontSize: 15, color: c.textMuted, textAlign: 'center', margin: '0 0 44px' }}>{t.outputSub}</p>
          <div className="v2-outputs">
            {t.outputs.map(o => (
              <div key={o.title} style={{ background: '#fffdf9', border: '1px solid #f3e3cf', borderRadius: 18, padding: '26px 24px' }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 17, fontWeight: 700, color: c.text, marginBottom: 8 }}>{o.title}</div>
                <div style={{ fontSize: 13.5, color: c.textMuted, lineHeight: 1.65, marginBottom: 14 }}>{o.desc}</div>
                <span style={{ fontSize: 12, fontWeight: 700, color: saffronDeep, background: `${saffron}12`, border: `1px solid ${saffron}35`, borderRadius: 16, padding: '4px 12px' }}>
                  {o.cost}
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 13, color: c.textFaint, textAlign: 'center', marginTop: 24 }}>{t.outputNote}</p>

          <div style={{ marginTop: 44, textAlign: 'center' }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700, color: c.text, marginBottom: 4 }}>{t.toolsTitle}</div>
            <div style={{ fontSize: 12.5, color: c.textMuted, marginBottom: 16 }}>{t.toolsSub}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {t.tools.map(tool => (
                <Link key={tool} href={go('/in')} className="v2-tool"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #f3e3cf', borderRadius: 20, padding: '8px 16px', textDecoration: 'none' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: saffron, flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: c.text }}>{tool}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Live demo ── */}
      <section style={{ padding: '10px 0 84px', background: '#fff' }}>
        <div className="v2-wrap">
          <div style={{ background: 'linear-gradient(160deg,#0c1c30 0%,#08121f 100%)', borderRadius: 26, padding: '52px 36px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -70, left: '30%', width: 500, height: 280, background: `radial-gradient(ellipse, rgba(255,153,51,0.16) 0%, rgba(109,40,217,0.1) 45%, transparent 70%)`, pointerEvents: 'none' }} />
            <div className="v2-demo-grid" style={{ position: 'relative', zIndex: 1 }}>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: saffron, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 }}>{t.demoTag}</div>
                <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 32, fontWeight: 800, color: '#fff', margin: '0 0 12px', letterSpacing: -0.5 }}>
                  {t.demoTitle}
                </h2>
                <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: '0 0 22px' }}>{t.demoSub}</p>
                {t.demoBullets.map(b => (
                  <div key={b} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                    <span style={{ color: '#00e8d0', fontWeight: 800, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>{b}</span>
                  </div>
                ))}
              </div>
              <KiraDemoWidget market="in" lang="EN" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Germany path ── */}
      <section style={{ padding: '0 0 70px', background: '#fff' }}>
        <div className="v2-wrap">
          <div style={{ background: `${saffron}0a`, border: `1.5px solid ${saffron}45`, borderRadius: 20, padding: '30px 30px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20, justifyContent: 'space-between' }}>
            <div style={{ flex: '1 1 380px' }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: saffronDeep, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>{t.deTag}</div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 800, color: navy, marginBottom: 8, lineHeight: 1.3 }}>{t.deTitle}</div>
              <div style={{ fontSize: 13.5, color: c.textMuted, lineHeight: 1.65 }}>{t.deSub}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link href="/guides/chancenkarte-calculator" className="v2-cta"
                style={{ background: ctaGrad, color: '#fff', padding: '12px 22px', borderRadius: 10, fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 13.5, textDecoration: 'none' }}>
                {t.deCta1} →
              </Link>
              <Link href="/guides" className="v2-ghost"
                style={{ background: '#fff', border: '1.5px solid #f0dfc8', color: c.text, padding: '12px 22px', borderRadius: 10, fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13.5, textDecoration: 'none', transition: 'all .15s' }}>
                {t.deCta2}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section style={{ padding: '70px 0', background: g.heroWarm }}>
        <div className="v2-wrap">
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 30, fontWeight: 800, color: navy, textAlign: 'center', margin: '0 0 8px', letterSpacing: -0.5 }}>
            {t.priceTitle}
          </h2>
          <p style={{ fontSize: 13.5, color: c.textMuted, textAlign: 'center', margin: '0 0 36px' }}>{t.priceSub}</p>
          <div className="v2-price-grid">
            {packs.map(p => (
              <div key={p.name} style={{ background: '#fff', border: p.popular ? `2px solid ${saffron}` : '1px solid #f3e3cf', borderRadius: 18, padding: '24px 20px', position: 'relative', boxShadow: p.popular ? '0 16px 44px rgba(230,115,0,0.15)' : 'none' }}>
                {p.popular && (
                  <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', background: saffron, color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 14px', borderRadius: '0 0 10px 10px', whiteSpace: 'nowrap' }}>
                    Most popular
                  </div>
                )}
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: navy, marginBottom: 4 }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 4 }}>
                  {p.price > 0 && <span style={{ fontSize: 13, color: c.textFaint }}>₹</span>}
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 32, fontWeight: 800, color: p.popular ? saffronDeep : navy }}>
                    {p.price === 0 ? 'Free' : p.price}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: c.textMuted, marginBottom: 4 }}>{p.credits} credits</div>
                <div style={{ fontSize: 12, color: c.textFaint, marginBottom: 16 }}>{p.note}</div>
                <Link href={go(p.price === 0 ? '/in' : '/in/account')} className="v2-cta"
                  style={{ display: 'block', textAlign: 'center', background: p.popular ? ctaGrad : '#fff', border: p.popular ? 'none' : '1.5px solid #f0dfc8', color: p.popular ? '#fff' : navy, padding: '10px 0', borderRadius: 10, fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                  {p.price === 0 ? 'Start free' : `Get ${p.name}`}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: '70px 0', background: '#fff' }}>
        <div className="v2-wrap" style={{ maxWidth: 760 }}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 30, fontWeight: 800, color: navy, textAlign: 'center', margin: '0 0 34px', letterSpacing: -0.5 }}>
            {t.faqTitle}
          </h2>
          {t.faq.map(f => (
            <details key={f.q} style={{ borderBottom: '1px solid #f6ede1', padding: '16px 4px' }}>
              <summary style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15.5, fontWeight: 700, color: c.text, cursor: 'pointer', listStyle: 'none' }}>
                {f.q}
              </summary>
              <p style={{ fontSize: 14, color: c.textMuted, lineHeight: 1.7, margin: '10px 0 4px' }}>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{ padding: '0 0 84px', background: '#fff' }}>
        <div className="v2-wrap">
          <div style={{ background: `linear-gradient(155deg, ${navy} 0%, #0d3a6b 100%)`, borderRadius: 26, padding: '56px 36px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 520, height: 260, background: `radial-gradient(ellipse, ${saffron}30 0%, transparent 70%)`, pointerEvents: 'none' }} />
            <h2 style={{ position: 'relative', fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, color: '#fff', margin: '0 0 12px', letterSpacing: -0.5 }}>
              {t.finalTitle}
            </h2>
            <p style={{ position: 'relative', fontSize: 15, color: 'rgba(255,255,255,0.6)', margin: '0 0 28px' }}>{t.finalSub}</p>
            <Link href={go('/in')} className="v2-cta"
              style={{ position: 'relative', display: 'inline-block', background: ctaGrad, color: '#fff', padding: '16px 40px', borderRadius: 12, fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 16, textDecoration: 'none', boxShadow: '0 8px 24px rgba(230,115,0,0.4)' }}>
              {t.finalCta} →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid #f6ede1', padding: '30px 0 36px', background: '#fff' }}>
        <div className="v2-wrap" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', height: 3, maxWidth: 180, margin: '0 auto 18px', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ flex: 1, background: saffron }} />
            <div style={{ flex: 1, background: '#fff', border: '1px solid #f0e6d6' }} />
            <div style={{ flex: 1, background: indiaGreen }} />
          </div>
          <div style={{ fontSize: 12.5, color: c.textFaint, marginBottom: 14 }}>Built in Germany. Made for India.</div>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/" style={{ fontSize: 12.5, color: c.textMuted, textDecoration: 'none' }}>Job-Lens Germany</Link>
            <Link href="/guides" style={{ fontSize: 12.5, color: c.textMuted, textDecoration: 'none' }}>Visa Guides</Link>
            <Link href="/contact" style={{ fontSize: 12.5, color: c.textMuted, textDecoration: 'none' }}>Contact</Link>
            <Link href="/impressum" style={{ fontSize: 12.5, color: c.textMuted, textDecoration: 'none' }}>Impressum</Link>
            <Link href="/privacy" style={{ fontSize: 12.5, color: c.textMuted, textDecoration: 'none' }}>Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
