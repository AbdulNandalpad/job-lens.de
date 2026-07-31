'use client'

// Kira Home — the post-login front door. This page is the ARRIVAL only:
// orb, greeting, CV nudge + honest CV check, and the feature tiles.
// The moment the user talks (text or voice), it hands off to the real Kira
// (AIWidget, maximized) via KIRA_OPEN_EVENT — one Kira, no duplicate chat UI.

import { useState, useRef, useEffect, type ReactNode, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { theme } from '@/lib/theme'
import { useCredits } from '@/lib/useCredits'
import { useSavedCv } from '@/lib/useSavedCv'
import { useLanguage } from '@/lib/i18n'
import KiraOrb from '@/components/KiraOrb'
import { KIRA_TILES, type KiraTile } from '@/lib/kiraModes'
import { CREDIT_COST, SS, API, KIRA_MAINTENANCE, KIRA_OPEN_EVENT } from '@/lib/constants'

const { colors: c, fonts: f, gradients: g } = theme

interface ScanFeedback {
  score: number
  headline: string
  strengths: string[]
  gaps: string[]
  quick_wins: string[]
  creditsRemaining?: number
  fromCache?: boolean
}

const CV_LOADING_STEPS: Record<'DE' | 'EN', string[]> = {
  DE: ['Lese deinen Lebenslauf...', 'Gleiche mit dem Markt ab...', 'Formuliere ehrliches Feedback...'],
  EN: ['Reading your CV...', 'Checking market fit...', 'Writing honest feedback...'],
}

// Tile accents mirror the marketing hero panels exactly (theme.featureAccents),
// so the doors the site advertises are the doors the user sees after login.
const fa = theme.featureAccents
const TILE_COLOR: Record<string, string> = {
  career_scan:  fa.careerScan,
  job_search:   fa.jobSearch,
  cv_builder:   fa.cvBuilder,
  cover_letter: fa.coverLetter,
  auto_apply:   fa.autoApply,
  job_case:     fa.jobCase,
}

// Same SVG paths as the HeroDACH/HeroIndia feature panels.
const TILE_ICONS: Record<string, ReactNode> = {
  career_scan: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  job_search: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="13" height="11" rx="2" /><path d="M9 7V5a2 2 0 0 1 4 0v2" /><circle cx="18.5" cy="9.5" r="3" /><line x1="20.6" y1="11.6" x2="22.5" y2="13.5" />
    </svg>
  ),
  cv_builder: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  cover_letter: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  auto_apply: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  job_case: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /><circle cx="17" cy="8" r="2" /><path d="M17 10v3" />
    </svg>
  ),
}

function TypingDots({ accent }: { accent: string }) {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', height: 18 }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: '50%', background: accent,
          display: 'inline-block',
          animation: `kh-dot 1.2s ${i * 0.18}s ease-in-out infinite`,
        }} />
      ))}
    </span>
  )
}

function KiraGlyph({ accent, size = 34 }: { accent: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `${accent}1f`, border: `1px solid ${accent}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 44 44">
        <circle cx="20" cy="20" r="13" fill="none" stroke={accent} strokeWidth="2.8" />
        <circle cx="20" cy="20" r="3" fill={accent} />
        <line x1="28" y1="28" x2="36" y2="36" stroke={accent} strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export default function KiraHome({ market }: { market: 'eu' | 'in' }) {
  const router = useRouter()
  const { lang } = useLanguage()
  const { credits, setCredits } = useCredits()
  const { hasCv, cvText: savedCvText, loadingSavedCv } = useSavedCv()

  const accent = market === 'in' ? '#FF9933' : c.accent
  const stepLang: 'DE' | 'EN' = market === 'eu' && lang === 'DE' ? 'DE' : 'EN'
  const isDE = market === 'eu' && lang === 'DE'
  const langKey = market === 'in' ? 'in_EN' : lang === 'DE' ? 'eu_DE' : 'eu_EN'
  const hasVoice = Boolean(process.env.NEXT_PUBLIC_REALTIME_WS_URL)

  const [ready,       setReady]       = useState(false)
  const [isAdmin,     setIsAdmin]     = useState(false)
  const [greeting,    setGreeting]    = useState('')
  const [input,       setInput]       = useState('')
  const [localCvText, setLocalCvText] = useState('')
  const [cvUploading, setCvUploading] = useState(false)
  const [checkingCv,  setCheckingCv]  = useState(false)
  const [cvStep,      setCvStep]      = useState(0)
  const [scan,        setScan]        = useState<ScanFeedback | null>(null)
  const [scanErr,     setScanErr]     = useState('')
  const [leaving,     setLeaving]     = useState(false)

  const initRef      = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const effectiveCvText = savedCvText || localCvText

  // One-time greeting build, once we know the user's name and CV status.
  useEffect(() => {
    if (initRef.current || loadingSavedCv) return
    initRef.current = true

    fetch(API.userProfile).then(r => r.ok ? r.json() : null).then(d => { if (d?.isAdmin) setIsAdmin(true) }).catch(() => {})

    fetch(API.userKiraContext).then(r => r.ok ? r.json() : null).then(d => {
      const name: string | null = d?.name ?? null
      setGreeting(name
        ? (isDE ? `Hi ${name}! Wie kann ich dir helfen?` : `Hi ${name}! How can I help you today?`)
        : (isDE ? 'Hi! Wie kann ich dir helfen?' : 'Hi! How can I help you today?'))
      setReady(true)
    }).catch(() => {
      setGreeting(isDE ? 'Hi! Wie kann ich dir helfen?' : 'Hi! How can I help you today?')
      setReady(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingSavedCv, hasCv])

  // Hand the conversation to the real Kira (AIWidget, maximized).
  function openKira(detail: { text?: string; voice?: boolean }) {
    window.dispatchEvent(new CustomEvent(KIRA_OPEN_EVENT, { detail }))
  }

  function sendToKira() {
    const text = input.trim()
    if (!text) return
    setInput('')
    openKira({ text })
  }

  function handleTileClick(tile: KiraTile) {
    if (!tile.href || leaving) return
    const dest = tile.href[market]
    // Kira shrinks into the corner she'll occupy (as AIWidget) on the next page.
    setLeaving(true)
    setTimeout(() => router.push(dest), 480)
  }

  async function handleFile(file: File) {
    setCvUploading(true)
    setScanErr('')
    try {
      if (file.name.endsWith('.txt') || file.type === 'text/plain') {
        setLocalCvText(await file.text())
      } else {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch(API.extractPdf, { method: 'POST', body: form })
        const data = await res.json()
        if (data.text) setLocalCvText(data.text)
        else setScanErr(data.error || "Couldn't read that file — try a PDF or DOCX.")
      }
    } catch {
      setScanErr("Couldn't read that file — try a PDF or DOCX.")
    }
    setCvUploading(false)
  }

  async function runCvCheck() {
    if (!effectiveCvText || checkingCv) return
    setScanErr('')

    const resultKey = market === 'in' ? SS.inCareerScanResult : SS.scanResult
    const cached = sessionStorage.getItem(resultKey)
    if (cached) {
      try {
        const data = JSON.parse(cached) as ScanFeedback
        setScan({ ...data, fromCache: true })
        return
      } catch { /* fall through to a fresh check */ }
    }

    if (credits !== null && credits < CREDIT_COST.careerScan) {
      setScanErr(isDE
        ? `Dafür brauchst du ${CREDIT_COST.careerScan} Credits — Aufladen geht auf der Account-Seite.`
        : `That needs ${CREDIT_COST.careerScan} credits — top up on the Account page.`)
      return
    }

    setCheckingCv(true)
    setCvStep(0)
    const steps = CV_LOADING_STEPS[stepLang]
    const timer = setInterval(() => setCvStep(p => Math.min(p + 1, steps.length - 1)), 1400)
    try {
      const endpoint = market === 'in' ? API.indiaCareerScanPro : API.careerScan
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText: effectiveCvText, role: '', market: 'Germany', lang }),
      })
      const data = await res.json()
      clearInterval(timer)
      setCheckingCv(false)
      if (res.status === 402) {
        setScanErr(isDE ? 'Nicht genug Credits für einen CV-Check.' : 'Not enough credits for a CV check right now.')
        return
      }
      if (data.error || typeof data.score !== 'number') {
        setScanErr(isDE ? 'Der Check hat nicht geklappt — nochmal versuchen?' : "Couldn't finish that check — want to try again?")
        return
      }
      if (typeof data.creditsRemaining === 'number') setCredits(data.creditsRemaining)
      sessionStorage.setItem(resultKey, JSON.stringify(data))
      setScan(data as ScanFeedback)
    } catch {
      clearInterval(timer)
      setCheckingCv(false)
      setScanErr(isDE ? 'Verbindungsfehler — nochmal versuchen?' : 'Connection error — want to try that again?')
    }
  }

  const nudgeText = hasCv || localCvText
    ? (isDE ? 'Dein Lebenslauf ist gespeichert — sag mir einfach, was du brauchst.' : 'Your CV is on file — just tell me what you need.')
    : (isDE ? 'Optional: Lade deinen Lebenslauf hoch und ich kann dir persönliche, ehrliche Antworten geben.' : 'Optional: upload your CV and I can give you personal, honest answers.')

  if (KIRA_MAINTENANCE && !isAdmin) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, padding: 24, textAlign: 'center' as const }}>
        <KiraGlyph accent={accent} size={48} />
        <div style={{ fontFamily: f.heading, fontSize: 17, fontWeight: 700, color: c.text }}>Kira is in maintenance mode</div>
        <div style={{ fontSize: 13, color: c.textMuted, maxWidth: 280 }}>She&apos;ll be back soon — check back later.</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: 'calc(100dvh - 52px)', background: g.heroLight, fontFamily: f.body, display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes kh-dot { 0%,60%,100%{opacity:.3;transform:translateY(0)} 30%{opacity:1;transform:translateY(-4px)} }
        @keyframes kira-dot { 0%,60%,100%{opacity:.3;transform:translateY(0)} 30%{opacity:1;transform:translateY(-4px)} }
        @keyframes kh-spin { to { transform: rotate(360deg) } }
        @keyframes kh-rise { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
        .kh-rise { opacity: 0; animation: kh-rise .65s cubic-bezier(.22,1,.36,1) forwards; }
        @keyframes kh-fly {
          0%   { left: 50%; top: 72px; transform: translateX(-50%) scale(1); opacity: 1; }
          100% { left: calc(100% - 170px); top: calc(100% - 130px); transform: translateX(0) scale(.42); opacity: .9; }
        }
        .kh-fly { position: fixed; width: 250px; z-index: 60; animation: kh-fly .48s cubic-bezier(.5,.05,.3,1) forwards; pointer-events: none; }
        @keyframes kh-fadeout { to { opacity: 0 } }
        .kh-fade { animation: kh-fadeout .4s ease forwards; }
        .kh-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; width: 100%; margin-bottom: 30px; }
        .kh-orbwrap { width: 100%; max-width: 560px; margin: 0 auto; }
        .kh-tile {
          position: relative; overflow: hidden; text-align: left; cursor: pointer;
          padding: 14px 15px; border-radius: 14px;
          border: 1px solid ${c.borderLight};
          box-shadow: ${theme.shadow.card};
          transition: transform .25s ease, border-color .25s ease, box-shadow .25s ease;
        }
        .kh-tile:hover {
          transform: translateY(-4px);
          border-color: var(--tc);
          box-shadow: 0 14px 34px -10px var(--tc);
        }
        .kh-tile:active { transform: translateY(-1px); }
        .kh-orbbtn { transition: transform .25s ease; }
        .kh-orbbtn:hover { transform: scale(1.03); }
        .kh-orbbtn:active { transform: scale(.99); }
        .kh-cta { transition: transform .22s ease, box-shadow .22s ease; }
        .kh-cta:hover { transform: translateY(-2px); box-shadow: 0 12px 30px ${c.ai}55; }
        .kh-cta:active { transform: translateY(0); }
        .kh-hero-input { color: ${c.text}; }
        .kh-hero-input::placeholder { color: ${c.textFaint}; }
        @media (max-width: 640px) {
          .kh-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .kh-orbwrap { max-width: 320px; }
          .kh-pad { padding: 20px 12px 32px !important; }
          .kh-tile { padding: 12px 12px; }
        }
      `}</style>

      {leaving && (
        <div className="kh-fly"><KiraOrb state="idle" breathe /></div>
      )}
      <div className={`kh-pad${leaving ? ' kh-fade' : ''}`} style={{ maxWidth: 780, margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px 40px' }}>
        {hasVoice ? (
          <button className="kh-rise kh-orbwrap kh-orbbtn" onClick={() => openKira({ voice: true })}
            aria-label={isDE ? 'Mit Kira sprechen' : 'Talk to Kira'}
            style={{ display: 'flex', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', visibility: leaving ? 'hidden' as const : 'visible' as const }}>
            <KiraOrb state="idle" breathe large />
          </button>
        ) : (
          <div className="kh-rise kh-orbwrap" style={{ display: 'flex', justifyContent: 'center', visibility: leaving ? 'hidden' as const : 'visible' as const }}>
            <KiraOrb state="idle" breathe large />
          </div>
        )}

        {!ready ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: c.textMuted, fontSize: 13, marginTop: 8 }}>
            <TypingDots accent={c.accent} /> Kira is getting ready...
          </div>
        ) : (
          <>
            <h1 className="kh-rise" style={{ animationDelay: '.12s', fontFamily: f.heading, fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 700, color: c.text, margin: '4px 0 10px', textAlign: 'center' as const }}>
              {greeting}
            </h1>

            <div className="kh-rise" style={{ animationDelay: '.24s', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const, justifyContent: 'center', marginBottom: scan || checkingCv || scanErr ? 14 : 28 }}>
              <span style={{ fontSize: 14, color: c.textMuted, textAlign: 'center' as const }}>{nudgeText}</span>
              {!hasCv && !localCvText && (
                <button onClick={() => fileInputRef.current?.click()} disabled={cvUploading}
                  style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${c.borderLight}`, background: c.bgCard, color: c.text, fontSize: 12.5, fontWeight: 700, cursor: cvUploading ? 'wait' : 'pointer', fontFamily: 'inherit', boxShadow: theme.shadow.card }}>
                  {cvUploading ? 'Reading...' : (isDE ? 'Lebenslauf hochladen' : 'Upload CV')}
                </button>
              )}
              {effectiveCvText && !scan && !checkingCv && (
                <button onClick={runCvCheck}
                  style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${accent}55`, background: `${accent}12`, color: accent, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {isDE ? `Ehrliches CV-Feedback · ${CREDIT_COST.careerScan} Credits` : `Get honest CV feedback · ${CREDIT_COST.careerScan} credits`}
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }}
              onChange={e => { const file = e.target.files?.[0]; if (file) handleFile(file) }} />

            {hasVoice && (
              <div className="kh-rise" style={{ animationDelay: '.32s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, marginBottom: 28 }}>
                <button className="kh-cta" onClick={() => openKira({ voice: true })}
                  style={{ padding: '12px 28px', borderRadius: 999, border: 'none', background: theme.gradients.featureBorder, color: '#fff', fontSize: 14.5, fontWeight: 700, fontFamily: f.heading, display: 'inline-flex', alignItems: 'center', gap: 9, cursor: 'pointer', boxShadow: theme.shadow.glow }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                  {isDE ? 'Mit Kira sprechen' : 'Talk to Kira'}
                </button>
                <span style={{ fontSize: 11.5, color: c.textFaint }}>
                  {isDE ? `Live-Voice · ${CREDIT_COST.liveVoice} Credits / 5 Min` : `Live voice · ${CREDIT_COST.liveVoice} credits / 5 min`}
                </span>
              </div>
            )}

            {checkingCv && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2.5px solid ${c.borderLight}`, borderTopColor: accent, animation: 'kh-spin 0.8s linear infinite' }} />
                <span style={{ fontSize: 13, color: c.textMuted }}>{CV_LOADING_STEPS[stepLang][cvStep]}</span>
              </div>
            )}

            {scanErr && !checkingCv && (
              <div style={{ fontSize: 12.5, color: c.warning, marginBottom: 18, textAlign: 'center' as const }}>{scanErr}</div>
            )}

            {scan && !checkingCv && (
              <div className="kh-rise" style={{ width: '100%', maxWidth: 560, padding: '16px 18px', borderRadius: 14, border: `1px solid ${c.borderLight}`, background: c.bgCard, boxShadow: theme.shadow.card, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontFamily: f.heading, fontSize: 30, fontWeight: 800, color: accent }}>{scan.score}</span>
                  <span style={{ fontSize: 12, color: c.textMuted }}>/ 100{scan.fromCache ? (isDE ? ' · aus deinem letzten Scan' : ' · from your last scan') : ''}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: c.text, marginBottom: 10 }}>{scan.headline}</div>
                {scan.strengths?.slice(0, 2).map((s, si) => (
                  <div key={si} style={{ fontSize: 13, color: c.text, marginBottom: 4 }}>✓ {s}</div>
                ))}
                {scan.gaps?.slice(0, 2).map((g2, gi) => (
                  <div key={gi} style={{ fontSize: 13, color: c.textMuted, marginBottom: 4 }}>↑ {g2}</div>
                ))}
                <button onClick={() => openKira({ text: isDE ? 'Ich habe gerade meinen CV-Check gemacht — lass uns mein Feedback durchgehen und die Lücken beheben.' : "I just ran my CV check — let's go through my feedback and fix the gaps." })}
                  style={{ marginTop: 10, padding: '8px 16px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {isDE ? 'Mit Kira besprechen →' : 'Discuss with Kira →'}
                </button>
              </div>
            )}

            <div className="kh-rise" style={{ animationDelay: '.32s', fontSize: 12, color: c.textFaint, marginBottom: 10, textAlign: 'center' as const }}>
              {isDE ? 'Lieber selbst machen? Wähl ein Tool:' : 'Prefer to do it yourself? Pick a tool:'}
            </div>
            <div className="kh-grid">
              {KIRA_TILES.map((tile, i) => {
                const tc = tile.id === 'career_scan' && market === 'in' ? accent : (TILE_COLOR[tile.id] ?? c.accent)
                return (
                  <button key={tile.id} onClick={() => handleTileClick(tile)}
                    className="kh-tile kh-rise"
                    style={{ animationDelay: `${0.36 + i * 0.08}s`, fontFamily: 'inherit', background: `linear-gradient(175deg, ${c.bgCard} 55%, ${tc}0d 100%)`, '--tc': `${tc}66` } as CSSProperties}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: `${tc}16`, border: `1px solid ${tc}30`, color: tc, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, boxShadow: `0 4px 14px -6px ${tc}55` }}>
                      {TILE_ICONS[tile.id]}
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: c.text, marginBottom: 3 }}>{tile.label[langKey] ?? tile.label.eu_EN}</div>
                    <div style={{ fontSize: 11.5, color: c.textMuted, lineHeight: 1.45 }}>{tile.desc[langKey] ?? tile.desc.eu_EN}</div>
                  </button>
                )
              })}
            </div>

            <div className="kh-rise" style={{ animationDelay: '.8s', width: '100%', maxWidth: 620 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 6px 6px 18px', borderRadius: 28, background: c.bgCard, border: `1px solid ${c.borderLight}`, boxShadow: theme.shadow.float }}>
                <input value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendToKira() }}
                  placeholder={isDE ? 'Frag Kira etwas — oder sag einfach, was du brauchst...' : 'Ask Kira anything — or just say what you need...'}
                  className="kh-hero-input"
                  style={{ flex: 1, background: 'none', border: 'none', fontSize: 14, fontFamily: 'inherit', outline: 'none', padding: '8px 0', minWidth: 0 }} />
                {hasVoice && (
                  <button onClick={() => openKira({ voice: true })}
                    aria-label="Live voice"
                    title={isDE ? `Live-Voice · ${CREDIT_COST.liveVoice} Credits / 5 Min` : `Live voice · ${CREDIT_COST.liveVoice} credits / 5 min`}
                    style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', background: 'transparent', color: c.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><line x1="12" y1="19" x2="12" y2="22" /><line x1="9" y1="22" x2="15" y2="22" />
                    </svg>
                  </button>
                )}
                <button onClick={sendToKira} disabled={!input.trim()} aria-label="Send"
                  style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', background: input.trim() ? g.button : c.borderLight, cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .2s ease', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? '#fff' : c.textFaint} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                  </svg>
                </button>
              </div>
              {/* EU AI Act Art. 50 — AI system identity disclosure */}
              <div style={{ textAlign: 'center' as const, marginTop: 8, fontSize: 11, color: c.textFaint }}>
                {isDE ? 'KI-Assistentin · Powered by Claude' : 'AI assistant · Powered by Claude'}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
