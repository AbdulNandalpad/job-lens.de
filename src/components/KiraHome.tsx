'use client'

// Kira Home — the post-login front door. Arrival layout (v4, modeled on the
// approved design): breathing orb, time-of-day greeting with real context,
// a prominent ask-Kira input with voice, suggestion chips, "pick up where you
// left off" cards built from real session artifacts, and jump-to-tool pills.
// Any chat/voice input hands off to the real Kira (AIWidget, maximized) via
// KIRA_OPEN_EVENT — one Kira, no duplicate chat UI.

import { useState, useRef, useEffect, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { theme } from '@/lib/theme'
import { useCredits } from '@/lib/useCredits'
import { useSavedCv } from '@/lib/useSavedCv'
import { useLanguage } from '@/lib/i18n'
import KiraOrb from '@/components/KiraOrb'
import { KIRA_TILES, type KiraTile } from '@/lib/kiraModes'
import { CREDIT_COST, SS, API, KIRA_MAINTENANCE, KIRA_OPEN_EVENT, IN_REVISION } from '@/lib/constants'

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

interface PickupCard { tag: string; color: string; title: string; sub: string; href: string; warn?: boolean }

const CV_LOADING_STEPS: Record<'DE' | 'EN', string[]> = {
  DE: ['Lese deinen Lebenslauf...', 'Gleiche mit dem Markt ab...', 'Formuliere ehrliches Feedback...'],
  EN: ['Reading your CV...', 'Checking market fit...', 'Writing honest feedback...'],
}

const fa = theme.featureAccents
const TILE_COLOR: Record<string, string> = {
  career_scan:  fa.careerScan,
  job_search:   fa.jobSearch,
  cv_builder:   fa.cvBuilder,
  cover_letter: fa.coverLetter,
  auto_apply:   fa.autoApply,
  job_case:     fa.jobCase,
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
  const [userName,    setUserName]    = useState<string | null>(null)
  const [input,       setInput]       = useState('')
  const [localCvText, setLocalCvText] = useState('')
  const [cvUploading, setCvUploading] = useState(false)
  const [checkingCv,  setCheckingCv]  = useState(false)
  const [cvStep,      setCvStep]      = useState(0)
  const [scan,        setScan]        = useState<ScanFeedback | null>(null)
  const [lastScan,    setLastScan]    = useState<{ score: number; gaps: number } | null>(null)
  const [scanErr,     setScanErr]     = useState('')
  const [leaving,     setLeaving]     = useState(false)
  const [pickups,     setPickups]     = useState<PickupCard[]>([])

  const initRef      = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const effectiveCvText = savedCvText || localCvText

  // One-time greeting build, once we know the user's name and CV status.
  useEffect(() => {
    if (initRef.current || loadingSavedCv) return
    initRef.current = true

    fetch(API.userProfile).then(r => r.ok ? r.json() : null).then(d => { if (d?.isAdmin) setIsAdmin(true) }).catch(() => {})

    fetch(API.userKiraContext).then(r => r.ok ? r.json() : null).then(d => {
      setUserName(d?.name ?? null)
      setReady(true)
    }).catch(() => { setReady(true) })
  }, [loadingSavedCv, hasCv])

  // "Pick up where you left off" — real artifacts from this session only.
  useEffect(() => {
    const cards: PickupCard[] = []
    const p = (path: string) => market === 'in' ? `/in/${path}` : `/app/${path}`

    try {
      const scanRaw = sessionStorage.getItem(market === 'in' ? SS.inCareerScanResult : SS.scanResult)
      if (scanRaw) {
        const s = JSON.parse(scanRaw) as ScanFeedback
        if (typeof s.score === 'number') {
          setLastScan({ score: s.score, gaps: s.gaps?.length ?? 0 })
          const role = sessionStorage.getItem(market === 'in' ? SS.inCareerScanRole : SS.scanRole) || ''
          cards.push({
            tag: market === 'in' ? 'ATS Score' : 'Career Scan', color: fa.careerScan,
            title: role || (isDE ? 'Dein letzter Scan' : 'Your last scan'),
            sub: `Score ${s.score}/100 · ${s.gaps?.length ?? 0} ${isDE ? 'offene Punkte' : 'fixes still open'}`,
            href: p('career-scan'),
          })
        }
      }
    } catch { /* ignore malformed cache */ }

    try {
      const tailored = sessionStorage.getItem(SS.cvbTailored)
      const jobRaw   = sessionStorage.getItem(SS.cvbJob)
      if (tailored && jobRaw) {
        const j = JSON.parse(jobRaw) as { job_title?: string; employer_name?: string }
        cards.push({
          tag: 'CV Builder', color: fa.cvBuilder,
          title: `${j.job_title || (isDE ? 'Zugeschnittener Lebenslauf' : 'Tailored CV')}${j.employer_name ? ` — ${j.employer_name}` : ''}`,
          sub: isDE ? 'Bereit zum Prüfen und Herunterladen' : 'Ready to review and download',
          href: p('cv-builder'),
        })
      }
    } catch { /* ignore */ }

    try {
      const cl = sessionStorage.getItem(SS.clLetter)
      if (cl) {
        let title = isDE ? 'Dein Anschreiben' : 'Your cover letter'
        try {
          const j = JSON.parse(sessionStorage.getItem(SS.cvbJob) || 'null') as { employer_name?: string } | null
          if (j?.employer_name) title = `${isDE ? 'Entwurf für' : 'Draft for'} ${j.employer_name}`
        } catch { /* keep default title */ }
        cards.push({
          tag: 'Cover Letter', color: fa.coverLetter, warn: true,
          title,
          sub: isDE ? 'Bereit zum Feinschliff oder Senden' : 'Ready to polish or send',
          href: p('cover-letter'),
        })
      }
    } catch { /* ignore */ }

    setPickups(cards.slice(0, 3))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      setLastScan({ score: data.score, gaps: data.gaps?.length ?? 0 })
    } catch {
      clearInterval(timer)
      setCheckingCv(false)
      setScanErr(isDE ? 'Verbindungsfehler — nochmal versuchen?' : 'Connection error — want to try that again?')
    }
  }

  // ── Greeting + context (all real data, nothing invented) ──────────────────
  const hour = new Date().getHours()
  const tod = hour < 12 ? (isDE ? 'Guten Morgen' : 'Morning') : hour < 18 ? (isDE ? 'Guten Tag' : 'Afternoon') : (isDE ? 'Guten Abend' : 'Evening')
  const greeting = userName ? `${tod}, ${userName}.` : `${tod}.`

  const subline = lastScan
    ? (isDE
        ? `Dein letzter CV-Score: ${lastScan.score}/100 — ${lastScan.gaps} offene Punkte. Sag mir, womit ich helfen soll.`
        : `Your last CV score: ${lastScan.score}/100 — ${lastScan.gaps} fixes still open. Tell me what to work on.`)
    : hasCv || localCvText
    ? (isDE
        ? 'Dein Lebenslauf ist gespeichert — frag mich etwas oder sag mir, was du brauchst.'
        : 'Your CV is on file — ask me anything, or tell me what you need.')
    : (isDE
        ? 'Lade deinen Lebenslauf hoch und ich kann dir persönliche, ehrliche Antworten geben.'
        : 'Upload your CV and I can give you personal, honest answers.')

  type ChipAction = { kind: 'upload' } | { kind: 'scan' } | { kind: 'ask'; text: string }
  const chips: { label: string; action: ChipAction; accented?: boolean }[] = []
  if (!hasCv && !localCvText) {
    chips.push({ label: cvUploading ? (isDE ? 'Lese...' : 'Reading...') : (isDE ? 'Lebenslauf hochladen' : 'Upload my CV'), action: { kind: 'upload' }, accented: true })
  }
  if (effectiveCvText && !scan && !checkingCv) {
    chips.push({ label: isDE ? `Ehrliches CV-Feedback · ${CREDIT_COST.careerScan} Credits` : `Get honest CV feedback · ${CREDIT_COST.careerScan} credits`, action: { kind: 'scan' }, accented: true })
  }
  chips.push(
    { label: isDE ? 'Verbessere meine CV-Zusammenfassung' : 'Fix my CV summary', action: { kind: 'ask', text: isDE ? 'Verbessere meine CV-Zusammenfassung.' : 'Help me fix my CV summary.' } },
    { label: isDE ? 'Bin ich ATS-ready?' : 'Am I ATS-ready?', action: { kind: 'ask', text: isDE ? 'Bin ich ATS-ready? Was würde ein ATS-Filter an meinem Lebenslauf bemängeln?' : 'Am I ATS-ready? What would an ATS filter flag in my CV?' } },
    { label: isDE ? 'Finde Jobs, die zu mir passen' : 'Find jobs that match my CV', action: { kind: 'ask', text: isDE ? 'Finde Jobs, die zu meinem Lebenslauf passen.' : 'Find jobs that match my CV.' } },
    { label: isDE ? 'Was bin ich wert?' : "What's my market value?", action: { kind: 'ask', text: isDE ? 'Was bin ich auf dem aktuellen Markt wert?' : "What's my current market value?" } },
  )

  function handleChip(action: ChipAction) {
    if (action.kind === 'upload') fileInputRef.current?.click()
    else if (action.kind === 'scan') runCvCheck()
    else openKira({ text: action.text })
  }

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
          0%   { left: 50%; top: 60px; transform: translateX(-50%) scale(1); opacity: 1; }
          100% { left: calc(100% - 170px); top: calc(100% - 130px); transform: translateX(0) scale(.42); opacity: .9; }
        }
        .kh-fly { position: fixed; width: 250px; z-index: 60; animation: kh-fly .48s cubic-bezier(.5,.05,.3,1) forwards; pointer-events: none; }
        @keyframes kh-fadeout { to { opacity: 0 } }
        .kh-fade { animation: kh-fadeout .4s ease forwards; }
        .kh-orbbtn { transition: transform .25s ease; }
        .kh-orbbtn:hover { transform: scale(1.04); }
        .kh-orbbtn:active { transform: scale(.99); }
        .kh-chip {
          padding: 9px 16px; border-radius: 999px; border: 1px solid ${c.borderLight};
          background: ${c.bgCard}; color: ${c.textMuted}; font-size: 12.5px; font-weight: 600;
          cursor: pointer; font-family: inherit; box-shadow: ${theme.shadow.card};
          transition: border-color .2s ease, color .2s ease, transform .2s ease;
          white-space: nowrap;
        }
        .kh-chip:hover { border-color: ${accent}; color: ${c.text}; transform: translateY(-1px); }
        .kh-card {
          display: block; text-align: left; text-decoration: none; cursor: pointer;
          background: ${c.bgCard}; border: 1px solid ${c.borderLight}; border-radius: 14px;
          padding: 16px 18px; box-shadow: ${theme.shadow.card}; font-family: inherit;
          transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
        }
        .kh-card:hover { transform: translateY(-3px); box-shadow: ${theme.shadow.cardHover}; border-color: var(--tc); }
        .kh-pill {
          padding: 8px 16px; border-radius: 10px; border: 1px solid ${c.borderLight};
          background: ${c.bgCard}; color: ${c.text}; font-size: 13px; font-weight: 600;
          cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 7px;
          transition: border-color .2s ease, transform .2s ease, box-shadow .2s ease;
        }
        .kh-pill:hover { transform: translateY(-1px); border-color: var(--tc); box-shadow: 0 6px 18px -8px var(--tc); }
        .kh-input-bar {
          display: flex; align-items: center; gap: 8px; width: 100%;
          background: ${c.bgCard}; border: 1px solid ${c.borderLight}; border-radius: 22px;
          padding: 8px 8px 8px 22px; box-shadow: ${theme.shadow.float};
        }
        .kh-hero-input { color: ${c.text}; }
        .kh-hero-input::placeholder { color: ${c.textFaint}; }
        .kh-talk {
          display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 14px;
          border: none; background: ${c.primaryLight}; color: ${c.navy}; font-size: 13px; font-weight: 700;
          cursor: pointer; font-family: inherit; white-space: nowrap; transition: background .2s ease;
        }
        .kh-talk:hover { background: ${c.accentLight}55; }
        .kh-send {
          width: 44px; height: 44px; border-radius: 14px; border: none; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          background: ${theme.gradients.featureBorder}; transition: opacity .2s ease, transform .2s ease;
        }
        .kh-send:hover { transform: translateY(-1px); }
        .kh-send:disabled { opacity: .45; cursor: default; transform: none; }
        .kh-grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        @media (max-width: 860px) { .kh-grid3 { grid-template-columns: 1fr; } }
        @media (max-width: 640px) {
          .kh-pad { padding: 18px 12px 40px !important; }
          .kh-talk span { display: none; }
        }
      `}</style>

      {leaving && (
        <div className="kh-fly"><KiraOrb state="idle" breathe /></div>
      )}

      <div className={`kh-pad${leaving ? ' kh-fade' : ''}`} style={{ maxWidth: 1060, margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '26px 16px 48px' }}>

        {/* Orb — breathing, tap to talk */}
        {hasVoice ? (
          <button className="kh-rise kh-orbbtn" onClick={() => openKira({ voice: true })}
            aria-label={isDE ? 'Mit Kira sprechen' : 'Talk to Kira'}
            title={isDE ? `Live-Voice · ${CREDIT_COST.liveVoice} Credits / 5 Min` : `Live voice · ${CREDIT_COST.liveVoice} credits / 5 min`}
            style={{ width: '100%', maxWidth: 340, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', visibility: leaving ? 'hidden' as const : 'visible' as const }}>
            <KiraOrb state="idle" breathe />
          </button>
        ) : (
          <div className="kh-rise" style={{ width: '100%', maxWidth: 340, display: 'flex', justifyContent: 'center', visibility: leaving ? 'hidden' as const : 'visible' as const }}>
            <KiraOrb state="idle" breathe />
          </div>
        )}

        {!ready ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: c.textMuted, fontSize: 13, marginTop: 8 }}>
            <TypingDots accent={c.accent} /> Kira is getting ready...
          </div>
        ) : (
          <>
            {/* Greeting + real context */}
            <h1 className="kh-rise" style={{ animationDelay: '.10s', fontFamily: f.heading, fontSize: 'clamp(26px, 4.4vw, 40px)', fontWeight: 800, color: c.text, margin: '2px 0 12px', textAlign: 'center' as const, letterSpacing: -0.5 }}>
              {greeting}
            </h1>
            <div className="kh-rise" style={{ animationDelay: '.20s', fontSize: 'clamp(14px, 1.8vw, 17px)', color: c.textMuted, textAlign: 'center' as const, maxWidth: 640, lineHeight: 1.6, marginBottom: 30 }}>
              {subline}
            </div>

            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }}
              onChange={e => { const file = e.target.files?.[0]; if (file) handleFile(file) }} />

            {/* Ask bar */}
            <div className="kh-rise" style={{ animationDelay: '.30s', width: '100%', maxWidth: 760 }}>
              <div className="kh-input-bar">
                <input value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendToKira() }}
                  placeholder={isDE ? 'Frag Kira etwas — oder sag ihr, was du brauchst...' : 'Ask Kira anything, or tell her what you need...'}
                  className="kh-hero-input"
                  style={{ flex: 1, background: 'none', border: 'none', fontSize: 15, fontFamily: 'inherit', outline: 'none', padding: '8px 0', minWidth: 0 }} />
                {hasVoice && (
                  <button className="kh-talk" onClick={() => openKira({ voice: true })}
                    title={isDE ? `Live-Voice · ${CREDIT_COST.liveVoice} Credits / 5 Min` : `Live voice · ${CREDIT_COST.liveVoice} credits / 5 min`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><line x1="12" y1="19" x2="12" y2="22" />
                    </svg>
                    <span>{isDE ? 'Lieber sprechen' : 'Talk instead'}</span>
                  </button>
                )}
                <button className="kh-send" onClick={sendToKira} disabled={!input.trim()} aria-label="Send">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                  </svg>
                </button>
              </div>
              {hasVoice && (
                <div style={{ textAlign: 'center' as const, marginTop: 8, fontSize: 11, color: c.textFaint }}>
                  {isDE ? `Live-Voice · ${CREDIT_COST.liveVoice} Credits / 5 Min · ` : `Live voice · ${CREDIT_COST.liveVoice} credits / 5 min · `}
                  {isDE ? 'KI-Assistentin · Powered by Claude' : 'AI assistant · Powered by Claude'}
                </div>
              )}
            </div>

            {/* Suggestion chips */}
            <div className="kh-rise" style={{ animationDelay: '.40s', display: 'flex', gap: 10, flexWrap: 'wrap' as const, justifyContent: 'center', marginTop: 18, maxWidth: 820 }}>
              {chips.map((chip, i) => (
                <button key={i} className="kh-chip" onClick={() => handleChip(chip.action)}
                  style={chip.accented ? { borderColor: `${accent}66`, color: accent, background: `${accent}0d` } : undefined}>
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Inline CV check feedback */}
            {checkingCv && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2.5px solid ${c.borderLight}`, borderTopColor: accent, animation: 'kh-spin 0.8s linear infinite' }} />
                <span style={{ fontSize: 13, color: c.textMuted }}>{CV_LOADING_STEPS[stepLang][cvStep]}</span>
              </div>
            )}
            {scanErr && !checkingCv && (
              <div style={{ fontSize: 12.5, color: c.warning, marginTop: 16, textAlign: 'center' as const }}>{scanErr}</div>
            )}
            {scan && !checkingCv && (
              <div className="kh-rise" style={{ width: '100%', maxWidth: 620, padding: '16px 18px', borderRadius: 14, border: `1px solid ${c.borderLight}`, background: c.bgCard, boxShadow: theme.shadow.card, marginTop: 22 }}>
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

            {/* Pick up where you left off — only when there is real activity */}
            {pickups.length > 0 && (
              <div className="kh-rise" style={{ animationDelay: '.52s', width: '100%', marginTop: 44 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 1.6, textTransform: 'uppercase' as const, color: c.textFaint, marginBottom: 12 }}>
                  {isDE ? 'Mach da weiter, wo du warst' : 'Pick up where you left off'}
                </div>
                <div className="kh-grid3">
                  {pickups.map((card, i) => (
                    <a key={i} className="kh-card" href={card.href}
                      style={{ '--tc': `${card.color}66` } as CSSProperties}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' as const, color: card.warn ? c.warning : card.color, marginBottom: 8 }}>
                        {card.tag}{card.warn ? ` · ${isDE ? 'unfertig' : 'unfinished'}` : ''}
                      </div>
                      <div style={{ fontFamily: f.heading, fontSize: 15.5, fontWeight: 700, color: c.text, marginBottom: 5, lineHeight: 1.3 }}>{card.title}</div>
                      <div style={{ fontSize: 13, color: c.textMuted }}>{card.sub}</div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Jump to a tool */}
            <div className="kh-rise" style={{ animationDelay: '.62s', width: '100%', marginTop: pickups.length > 0 ? 34 : 44 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' as const }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 1.6, textTransform: 'uppercase' as const, color: c.textFaint }}>
                  {isDE ? 'Direkt zum Tool' : 'Jump to a tool'}
                </span>
                {KIRA_TILES.filter(tile =>
                  !(IN_REVISION.autoApply && tile.id === 'auto_apply') &&
                  !(IN_REVISION.jobCase && tile.id === 'job_case')
                ).map(tile => {
                  const tc = tile.id === 'career_scan' && market === 'in' ? accent : (TILE_COLOR[tile.id] ?? c.accent)
                  return (
                    <button key={tile.id} className="kh-pill" onClick={() => handleTileClick(tile)}
                      style={{ '--tc': `${tc}88` } as CSSProperties}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: tc, flexShrink: 0 }} />
                      {tile.label[langKey] ?? tile.label.eu_EN}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
