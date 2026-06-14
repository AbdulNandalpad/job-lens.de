'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { theme } from '@/lib/theme'
import SvgIcon, { type IconName } from '@/components/SvgIcon'

interface Slide {
  icon: IconName
  tag: string
  h1: string
  h1Accent: string
  sub: string
  cta: string
  href: string
  accentColor: string
}

const DECK_EU_DE: Slide[] = [
  {
    icon: 'sparkle',
    tag: 'DACH-Markt · KI-gestützt',
    h1: 'Dein komplettes',
    h1Accent: 'KI-Bewerbungs-Toolkit.',
    sub: 'Career Scan, Auto Apply, Lebenslauf, Anschreiben, Interview-Training — alles an einem Ort. Speziell für den DACH-Markt entwickelt.',
    cta: 'Kostenlos starten →',
    href: '/login',
    accentColor: '#378ADD',
  },
  {
    icon: 'rocket',
    tag: 'Auto Apply · Beta',
    h1: 'Schluss mit copy-paste.',
    h1Accent: 'Kira füllt dein Formular.',
    sub: 'Füge eine Job-URL ein — Workday, Greenhouse, Lever. Kira liest das Formular, ordnet deinen Lebenslauf zu und füllt alle Felder. Du siehst eine Vorschau, dann sendet es ab.',
    cta: 'Auto Apply testen →',
    href: '/app/auto-apply',
    accentColor: '#5B8FF9',
  },
  {
    icon: 'bot',
    tag: 'Kira AI · KI-Karriereassistentin',
    h1: 'Dein nächster Job ist',
    h1Accent: 'ein Gespräch entfernt.',
    sub: 'Kira kennt den DACH-Markt in- und auswendig. Voice-first — sprich einfach mit ihr. Sie findet Jobs, liest deinen Lebenslauf und gibt echte Gehaltsdaten.',
    cta: 'Mit Kira chatten →',
    href: '/app/ai',
    accentColor: '#9B6BFF',
  },
  {
    icon: 'target',
    tag: 'Career Scan · 30 Sekunden',
    h1: 'Weißt du, wo du',
    h1Accent: 'wirklich stehst?',
    sub: 'Lade deinen Lebenslauf hoch. Kira berechnet deinen Score, schätzt dein Gehalt, zeigt Stärken und Lücken — und liefert einen personalisierten Aktionsplan.',
    cta: 'Career Scan starten →',
    href: '/app/career-scan',
    accentColor: '#3DD68C',
  },
  {
    icon: 'document',
    tag: 'Zeugnis Decoder · Neu',
    h1: 'Versteh dein Arbeitszeugnis',
    h1Accent: 'endlich auf einen Blick.',
    sub: 'Zeugnisse sind codiert — „stets bemüht" klingt gut, bedeutet aber schlecht. Kira entschlüsselt jede Formulierung und erklärt die versteckte Bedeutung.',
    cta: 'Zeugnis prüfen →',
    href: '/app/zeugnis',
    accentColor: '#F59E0B',
  },
  {
    icon: 'briefcase',
    tag: 'Demnächst · Job Case',
    h1: 'Mehr als ein Lebenslauf —',
    h1Accent: 'deine persönliche Fallstudie.',
    sub: 'KI analysiert die Stellenanzeige, du lieferst die Belege. Recruiter erhalten einen privaten Link — kein Formular, kein PDF, nur dein stärkstes Argument.',
    cta: 'Coming Soon',
    href: '#',
    accentColor: '#a855f7',
  },
]

const DECK_EU_EN: Slide[] = [
  {
    icon: 'sparkle',
    tag: 'DACH Market · AI-Powered',
    h1: 'Your complete',
    h1Accent: 'AI job application toolkit.',
    sub: 'Career Scan, Auto Apply, CV builder, cover letter, interview training — all in one place. Built specifically for Germany, Switzerland and Austria.',
    cta: 'Start for free →',
    href: '/login',
    accentColor: '#378ADD',
  },
  {
    icon: 'rocket',
    tag: 'Auto Apply · Beta',
    h1: 'Stop copy-pasting.',
    h1Accent: 'Kira fills your job application.',
    sub: 'Paste a job URL — Workday, Greenhouse, Lever. Kira reads the form, maps your CV, and fills every field. You review a preview, then it submits.',
    cta: 'Try Auto Apply →',
    href: '/app/auto-apply',
    accentColor: '#5B8FF9',
  },
  {
    icon: 'bot',
    tag: 'Kira AI · Career Assistant',
    h1: 'Your next job is',
    h1Accent: 'just a conversation away.',
    sub: 'Kira knows the DACH market inside out. Voice-first — just talk to her. She finds jobs, reads your CV, and gives you real salary data.',
    cta: 'Chat with Kira →',
    href: '/app/ai',
    accentColor: '#9B6BFF',
  },
  {
    icon: 'target',
    tag: 'Career Scan · 30 seconds',
    h1: 'Do you know where',
    h1Accent: 'you really stand?',
    sub: 'Upload your CV. Kira calculates your score, estimates your salary, shows strengths and gaps — and delivers a personalised action plan.',
    cta: 'Start Career Scan →',
    href: '/app/career-scan',
    accentColor: '#3DD68C',
  },
  {
    icon: 'document',
    tag: 'Zeugnis Decoder · New',
    h1: 'Finally understand',
    h1Accent: 'your German work reference.',
    sub: 'German work references are coded — "always tried hard" sounds fine but means poor. Kira decodes every phrase and explains the hidden meaning.',
    cta: 'Decode Zeugnis →',
    href: '/app/zeugnis',
    accentColor: '#F59E0B',
  },
  {
    icon: 'briefcase',
    tag: 'Coming Soon · Job Case',
    h1: 'More than a CV —',
    h1Accent: 'your personal case study.',
    sub: 'AI analyses the job posting, you supply the evidence. Recruiters get a private link — no form, no PDF, just your strongest argument.',
    cta: 'Coming Soon',
    href: '#',
    accentColor: '#a855f7',
  },
]

const DECK_IN: Slide[] = [
  {
    icon: 'sparkle',
    tag: 'Built for India · AI-Powered',
    h1: 'Everything you need',
    h1Accent: 'to land your next role.',
    sub: 'ATS Score, Auto Apply, CV builder, cover letter, interview prep — all in one place. Built for Naukri, LinkedIn, and every company portal in India.',
    cta: 'Start for free →',
    href: '/in/login',
    accentColor: '#FF9933',
  },
  {
    icon: 'rocket',
    tag: 'Auto Apply · Beta',
    h1: 'Stop filling the same details',
    h1Accent: 'into every job portal.',
    sub: 'Paste any Naukri, LinkedIn or company portal URL. Kira reads the form, fills CTC, notice period, skills — everything from your profile. You review, then confirm.',
    cta: 'Try Auto Apply →',
    href: '/in/auto-apply',
    accentColor: '#5B8FF9',
  },
  {
    icon: 'bot',
    tag: 'Kira AI · Career Coach',
    h1: 'Your AI career coach',
    h1Accent: 'for the India market.',
    sub: "Kira knows Naukri, LinkedIn, and every major Indian employer. Ask about salaries, missing skills, or how to crack a specific company's interview.",
    cta: 'Chat with Kira →',
    href: '/in#kira-demo',
    accentColor: '#9B6BFF',
  },
  {
    icon: 'target',
    tag: 'ATS Score · 30 seconds',
    h1: 'Know exactly how ATS',
    h1Accent: 'reads your resume.',
    sub: 'Paste your CV and any job description. Kira scores your CV against ATS criteria, lists missing keywords, and flags format issues — keyword by keyword.',
    cta: 'Check ATS Score →',
    href: '/in/career-scan',
    accentColor: '#3DD68C',
  },
  {
    icon: 'passport',
    tag: 'Work Visa DE · Fachkräfte',
    h1: 'Dreaming of working',
    h1Accent: 'in Germany?',
    sub: 'Check your Fachkräfteeinwanderungsgesetz eligibility in minutes. Kira analyses your qualifications, salary expectations and language level against current requirements.',
    cta: 'Check Visa Eligibility →',
    href: '/in/visa',
    accentColor: '#F59E0B',
  },
]

const INTERVAL = 5000

interface HeroSliderProps {
  market: 'eu' | 'in'
  lang?: 'DE' | 'EN'
}

export default function HeroSlider({ market, lang = 'EN' }: HeroSliderProps) {
  const deck = market === 'in' ? DECK_IN : (lang === 'DE' ? DECK_EU_DE : DECK_EU_EN)

  const [active, setActive]       = useState(0)
  const [prev, setPrev]           = useState<number | null>(null)
  const [dir, setDir]             = useState<'next' | 'prev'>('next')
  const [animating, setAnimating] = useState(false)
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const pausedRef   = useRef(false)
  const activeRef   = useRef(0)
  const animatingRef = useRef(false)

  const go = useCallback((idx: number, direction: 'next' | 'prev' = 'next') => {
    if (animatingRef.current) return
    animatingRef.current = true
    setDir(direction)
    setPrev(activeRef.current)
    activeRef.current = idx
    setActive(idx)
    setAnimating(true)
    setTimeout(() => { setPrev(null); setAnimating(false); animatingRef.current = false }, 520)
  }, [])

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      if (!pausedRef.current) {
        go((activeRef.current + 1) % deck.length, 'next')
      }
    }, INTERVAL)
  }, [go, deck.length])

  useEffect(() => {
    startTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [startTimer])

  const manualGo = (idx: number) => {
    go(idx, idx >= activeRef.current ? 'next' : 'prev')
    startTimer()
  }

  const slide = deck[active]

  return (
    <section
      style={{ position: 'relative', overflow: 'hidden', background: '#070e18' }}
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}
    >
      <style>{`
        @keyframes hs-in-next  { from{opacity:0;transform:translateX(52px)}  to{opacity:1;transform:translateX(0)} }
        @keyframes hs-in-prev  { from{opacity:0;transform:translateX(-52px)} to{opacity:1;transform:translateX(0)} }
        @keyframes hs-out-next { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(-52px)} }
        @keyframes hs-out-prev { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(52px)}  }
        .hs-in-next  { animation: hs-in-next  0.46s cubic-bezier(.4,0,.2,1) forwards }
        .hs-in-prev  { animation: hs-in-prev  0.46s cubic-bezier(.4,0,.2,1) forwards }
        .hs-out-next { animation: hs-out-next 0.46s cubic-bezier(.4,0,.2,1) forwards; position:absolute;inset:0;pointer-events:none }
        .hs-out-prev { animation: hs-out-prev 0.46s cubic-bezier(.4,0,.2,1) forwards; position:absolute;inset:0;pointer-events:none }
        .hs-arrow { width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,0.14);
          background:rgba(255,255,255,0.06);cursor:pointer;display:flex;align-items:center;
          justify-content:center;font-size:20px;line-height:1;color:rgba(255,255,255,0.55);
          transition:all 0.18s;flex-shrink:0;padding:0;font-family:sans-serif }
        .hs-arrow:hover { background:rgba(255,255,255,0.13);color:#fff;border-color:rgba(255,255,255,0.28) }
        .hs-dot { border:none;cursor:pointer;transition:all 0.25s;padding:0;height:8px;border-radius:4px }
        .hs-cta { display:inline-block;transition:opacity 0.15s,transform 0.15s;text-decoration:none }
        .hs-cta:hover { opacity:0.86!important;transform:translateY(-1px)!important }
      `}</style>

      {/* Slide track */}
      <div style={{ position: 'relative', minHeight: 460, overflow: 'hidden' }}>
        {prev !== null && (
          <div className={dir === 'next' ? 'hs-out-next' : 'hs-out-prev'}>
            <SlideContent slide={deck[prev]} />
          </div>
        )}
        <div className={animating ? (dir === 'next' ? 'hs-in-next' : 'hs-in-prev') : ''}>
          <SlideContent slide={slide} />
        </div>
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 14, padding: '4px 24px 28px',
      }}>
        <button className="hs-arrow" onClick={() => manualGo((active - 1 + deck.length) % deck.length)} aria-label="Previous">‹</button>
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          {deck.map((s, i) => (
            <button
              key={i}
              className="hs-dot"
              onClick={() => manualGo(i)}
              style={{
                background: i === active ? s.accentColor : 'rgba(255,255,255,0.18)',
                width: i === active ? 22 : 8,
              }}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
        <button className="hs-arrow" onClick={() => manualGo((active + 1) % deck.length)} aria-label="Next">›</button>
      </div>

      {/* Progress bar */}
      <ProgressBar key={active} duration={INTERVAL} color={slide.accentColor} />
    </section>
  )
}

function SlideContent({ slide }: { slide: Slide }) {
  return (
    <div style={{
      padding: '60px 24px 28px',
      textAlign: 'center',
      maxWidth: 680,
      margin: '0 auto',
      position: 'relative',
    }}>
      {/* Radial glow */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: 500, height: 300,
        background: `radial-gradient(ellipse, ${slide.accentColor}17 0%, transparent 68%)`,
        pointerEvents: 'none',
      }} />

      {/* Icon badge */}
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: `${slide.accentColor}17`,
        border: `1.5px solid ${slide.accentColor}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 18px',
        boxShadow: `0 0 28px ${slide.accentColor}22`,
      }}>
        <SvgIcon name={slide.icon} size={30} color={slide.accentColor} />
      </div>

      {/* Tag chip */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: `${slide.accentColor}11`,
        border: `1px solid ${slide.accentColor}26`,
        borderRadius: 20, padding: '4px 13px', marginBottom: 20,
      }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: slide.accentColor, display: 'inline-block', flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: slide.accentColor, letterSpacing: 0.8, textTransform: 'uppercase' as const, fontFamily: theme.fonts.heading }}>
          {slide.tag}
        </span>
      </div>

      {/* Headline */}
      <h1 style={{
        fontFamily: theme.fonts.heading,
        fontSize: 'clamp(24px, 4.2vw, 42px)',
        fontWeight: 800,
        color: '#fff',
        lineHeight: 1.17,
        margin: '0 0 14px',
        letterSpacing: -0.5,
      }}>
        {slide.h1}<br />
        <span style={{ color: slide.accentColor }}>{slide.h1Accent}</span>
      </h1>

      {/* Sub */}
      <p style={{
        fontSize: 'clamp(13px, 1.7vw, 15px)',
        color: 'rgba(255,255,255,0.52)',
        lineHeight: 1.72,
        margin: '0 auto 30px',
        maxWidth: 540,
      }}>
        {slide.sub}
      </p>

      {/* CTA */}
      {slide.href === '#' ? (
        <span
          style={{
            display: 'inline-block',
            padding: '12px 32px',
            borderRadius: 10,
            background: `${slide.accentColor}22`,
            border: `1.5px solid ${slide.accentColor}55`,
            color: slide.accentColor,
            fontWeight: 700,
            fontSize: 15,
            fontFamily: theme.fonts.heading,
            letterSpacing: 0.3,
          }}
        >
          {slide.cta}
        </span>
      ) : (
        <a
          href={slide.href}
          className="hs-cta"
          style={{
            padding: '12px 32px',
            borderRadius: 10,
            background: slide.accentColor,
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            fontFamily: theme.fonts.heading,
            boxShadow: `0 6px 22px ${slide.accentColor}32`,
          }}
        >
          {slide.cta}
        </a>
      )}
    </div>
  )
}

function ProgressBar({ duration, color }: { duration: number; color: string }) {
  const id = `hs-pb-${color.replace('#', '')}`
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.05)' }}>
      <style>{`@keyframes ${id} { from{width:0} to{width:100%} }`}</style>
      <div style={{ height: '100%', background: color, animation: `${id} ${duration}ms linear forwards` }} />
    </div>
  )
}
