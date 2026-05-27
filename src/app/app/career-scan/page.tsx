'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'
import { theme } from '@/lib/theme'
import { useCredits } from '@/lib/useCredits'
import { useLanguage } from '@/lib/i18n'
import CrossMarketModal from '@/components/CrossMarketModal'
import CareerCard from '@/components/CareerCard'
import { CREDIT_COST, LOW_CREDIT_WARN, MARKET, SS, API } from '@/lib/constants'
import SvgIcon, { type IconName } from '@/components/SvgIcon'

const { colors: c, gradients: g, fonts: f } = theme

interface ScanResult {
  score: number
  market_fit_score: number | null
  keyword_score: number | null
  readiness: string
  headline: string
  summary: string
  strengths: string[]
  gaps: string[]
  quick_wins: string[]
  role_suggestions: string[]
  salary_min: number
  salary_max: number
  salary_currency: string
  top_keyword: string
  market_insight: string
  ai_vulnerability: number
  ai_vulnerability_label: string
  ai_vulnerability_reason: string
  career_path_steps: { timeframe: string; focus: string; actions: string[] }[]
  roast_lines: string[]
  domain_mismatch: boolean
  mismatch_message: string
  creditsRemaining?: number
}

type Mode = 'insights' | 'roast' | 'upgrade'

function ScoreRing({ value, color, label, size = 80 }: { value: number; color: string; label: string; size?: number }) {
  const r = (size / 2) - 8
  const circ = 2 * Math.PI * r
  const dash = (value / 100) * circ
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      {/* position:relative wrapper so the label text is absolutely centred over the SVG on all screen sizes */}
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: f.heading, fontSize: size >= 80 ? 22 : 18, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{value}</div>
        </div>
      </div>
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', textAlign: 'center', maxWidth: size + 8 }}>{label}</div>
    </div>
  )
}

/** Accordion wrapper — toggle button is hidden on desktop; visible on mobile so sections can be collapsed. */
function MobileSection({ title, icon, defaultOpen = false, children }: {
  title: string; icon: IconName; defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="jl-mob-acc">
      <button className="jl-mob-acc-btn" onClick={() => setOpen(o => !o)}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><SvgIcon name={icon} size={14} color="currentColor" /><span>{title}</span></span>
        <span style={{ fontSize: 10, transform: open ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>▼</span>
      </button>
      <div className={open ? 'jl-mob-acc-body' : 'jl-mob-acc-body jl-mob-acc-closed'}>
        {children}
      </div>
    </div>
  )
}

export default function CareerScanPage() {
  const router = useRouter()
  const { lang, t } = useLanguage()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [cvText, setCvText] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileLoading, setFileLoading] = useState(false)
  const [role, setRole] = useState('')
  const [phase, setPhase] = useState<'upload' | 'loading' | 'results' | 'error'>('upload')
  const [step, setStep] = useState(0)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [drag, setDrag] = useState(false)
  const [mobOpen, setMobOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('insights')
  const [toastMsg, setToastMsg] = useState('')
  const [showJobSearchBanner, setShowJobSearchBanner] = useState(false)
  const { credits, setCredits, needsCrossMarket, crossMarketAmount } = useCredits()
  const SCAN_COST = CREDIT_COST.careerScan
  const [crossWarnPending, setCrossWarnPending] = useState<(() => void) | null>(null)

  useEffect(() => {
    if (phase === 'results' && result) {
      sessionStorage.setItem(SS.scanResult, JSON.stringify(result))
      sessionStorage.setItem(SS.scanRole, role)
      sessionStorage.setItem(SS.scanPhase, 'results')
    }
  }, [phase, result])

  useEffect(() => {
    const savedPhase = sessionStorage.getItem(SS.scanPhase)
    if (savedPhase === 'results') {
      const savedResult = sessionStorage.getItem(SS.scanResult)
      const savedRole = sessionStorage.getItem(SS.scanRole)
      if (savedResult) {
        try {
          setResult(JSON.parse(savedResult))
          setPhase('results')
          setShowJobSearchBanner(false)
          if (savedRole) setRole(savedRole)
        } catch { }
      }
    }
  }, [])

  async function handleFile(file: File) {
    setFileName(file.name)
    setCvText('')
    setFileLoading(true)
    if (file.name.endsWith('.txt') || file.type === 'text/plain') {
      const r = new FileReader()
      r.onload = e => { setCvText((e.target?.result as string) ?? ''); setFileLoading(false) }
      r.readAsText(file)
    } else {
      const form = new FormData()
      form.append('file', file)
      try {
        const res = await fetch(API.extractPdf, { method: 'POST', body: form })
        const data = await res.json()
        if (data.text) { setCvText(data.text) } else { alert(data.error || 'Could not read PDF. Please paste your CV text below.'); setFileName('') }
      } catch { alert('Failed to read PDF. Please paste your CV text below.'); setFileName('') }
      setFileLoading(false)
    }
  }

  function clearCvFile() { setFileName(''); setCvText(''); if (fileInputRef.current) fileInputRef.current.value = '' }

  function resetAll() {
    setPhase('upload'); setFileName(''); setCvText('')
    setShowJobSearchBanner(false); setResult(null); setRole('')
    sessionStorage.removeItem(SS.scanResult); sessionStorage.removeItem(SS.scanPhase)
    sessionStorage.removeItem(SS.scanRole)
    sessionStorage.removeItem(SS.cvText); sessionStorage.removeItem(SS.targetRole)
  }

  async function runScan() {
    if (!cvText.trim()) { alert('Please upload your CV or paste your CV text first.'); return }
    setPhase('loading'); setMobOpen(false); setStep(0); setMode('insights'); setShowJobSearchBanner(false)
    const loadingSteps = t.careerScan.loadingSteps
    const timer = setInterval(() => setStep(p => Math.min(p + 1, loadingSteps.length - 1)), 1800)
    try {
      const res = await fetch(API.careerScan, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, role, market: 'Germany', lang }),
      })
      const data = await res.json()
      clearInterval(timer)
      if (res.status === 402) {
        setPhase('error')
        setToastMsg('Not enough credits. Please top up to continue.')
        if (typeof data.credits === 'number') setCredits(data.credits)
      } else if (data.error || !data.score) {
        setPhase('error')
      } else {
        if (typeof data.creditsRemaining === 'number') setCredits(data.creditsRemaining)
        setResult(data)
        setPhase('results')
        setShowJobSearchBanner(true)
      }
    } catch { clearInterval(timer); setPhase('error') }
  }

  function handleRunScan() {
    if (needsCrossMarket(SCAN_COST, MARKET.eu)) {
      setCrossWarnPending(() => runScan)
    } else {
      runScan()
    }
  }

  function goToJobSearch() {
    router.push('/app/jobs')
  }

  function showToast(msg: string) { setToastMsg(msg); setTimeout(() => setToastMsg(''), 2500) }

  const scoreColor = (s: number) => s >= 80 ? c.success : s >= 60 ? '#F59E0B' : c.danger
  const fmt = (n: number) => new Intl.NumberFormat('de-DE').format(Math.round(n))

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.2)', fontSize: 13,
    fontFamily: f.body, color: '#fff',
    background: 'rgba(255,255,255,0.1)', outline: 'none', boxSizing: 'border-box',
  }

  const secLabel = (text: string) => (
    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.8, textTransform: 'uppercase' as const, marginBottom: 6 }}>
      {text}
    </div>
  )

  function UploadBox({ label, sublabel, fileName, inputRef, onFile, onClear, accept }: {
    label: string; sublabel: string; fileName: string
    inputRef: { current: HTMLInputElement | null }
    onFile: (f: File) => void; onClear: () => void; accept: string
  }) {
    return (
      <div>
        {secLabel(label)}
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => !fileName && inputRef.current?.click()}
            style={{
              border: `1.5px ${fileName ? `solid ${c.success}` : 'dashed rgba(255,255,255,0.25)'}`,
              borderRadius: 10, padding: '12px 14px',
              cursor: fileName ? 'default' : 'pointer',
              background: fileName ? 'rgba(29,158,117,0.12)' : 'rgba(255,255,255,0.05)',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
            <div style={{ width: 20, height: 20, borderRadius: 4, background: fileName ? 'rgba(29,158,117,0.3)' : 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: fileName ? c.success : '#fff', marginBottom: 2 }}>
                {fileName || sublabel}
              </div>
              <div style={{ fontSize: 11, color: fileName ? c.success : 'rgba(255,255,255,0.5)' }}>
                {fileName ? t.careerScan.sidebar.uploaded : t.careerScan.sidebar.clickToUpload}
              </div>
            </div>
          </div>
          {fileName && (
            <button onClick={onClear} style={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: '50%', background: c.danger, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              &times;
            </button>
          )}
        </div>
      </div>
    )
  }

  const extracting = fileLoading
  const hasEnoughCredits = credits === null || credits >= SCAN_COST
  const canScan = cvText.trim().length > 0 && role.trim() && phase !== 'loading' && !extracting && hasEnoughCredits

  const cs = t.careerScan

  const SB = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ textAlign: 'center', paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: f.heading }}>{cs.sidebar.title}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
          {cs.sidebar.subtitle}
          <span style={{ fontSize: 10, fontWeight: 700, color: '#378ADD', background: 'rgba(55,138,221,0.18)', padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap' as const }}>
            {CREDIT_COST.careerScan} credits
          </span>
        </div>
      </div>

      <UploadBox label={cs.sidebar.cvLabel} sublabel={cs.sidebar.cvSub} fileName={fileName} inputRef={fileInputRef} onFile={handleFile} onClear={clearCvFile} accept=".pdf,.txt,.doc,.docx" />

      <div style={{ height: 1, background: 'rgba(255,255,255,0.1)' }} />

      <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.6, textTransform: 'uppercase' as const, marginBottom: 6 }}>{cs.sidebar.cvTextLabel}</div>

      {extracting ? (
        <div style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${c.accentLight}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: c.accentLight, fontWeight: 600 }}>
              {cs.sidebar.readingCv}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: c.accentLight, borderRadius: 2, animation: `shimmer 1.4s ease-in-out ${i * 0.18}s infinite`, transformOrigin: 'left' }} />
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{cs.sidebar.extracting}</div>
        </div>
      ) : cvText ? (
        <div style={{ position: 'relative' }}>
          <textarea
            value={cvText}
            onChange={e => setCvText(e.target.value)}
            rows={4}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${c.success}`, fontSize: 11, fontFamily: f.body, color: '#fff', background: 'rgba(29,158,117,0.07)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' as const, lineHeight: 1.5 }}
          />
          <div style={{ fontSize: 10, color: c.success, marginTop: 3 }}>{cs.sidebar.extracted}</div>
        </div>
      ) : (
        <textarea
          value={cvText}
          onChange={e => setCvText(e.target.value)}
          placeholder={cs.sidebar.pastePlaceholder}
          rows={4}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', fontSize: 11, fontFamily: f.body, color: '#fff', background: 'rgba(255,255,255,0.05)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' as const, lineHeight: 1.5 }}
        />
      )}

      <div style={{ height: 1, background: 'rgba(255,255,255,0.1)' }} />

      <div>
        {secLabel(cs.sidebar.targetRoleLabel)}
        <input value={role} onChange={e => setRole(e.target.value)} placeholder={cs.sidebar.targetRolePlaceholder} style={inp} />
      </div>



      {(cvText || fileName || phase === 'results') && (
        <button onClick={resetAll} style={{ width: '100%', padding: 9, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontFamily: f.heading, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          {cs.sidebar.resetBtn}
        </button>
      )}

      {credits !== null && credits <= LOW_CREDIT_WARN && (
        <div style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#fcd34d', lineHeight: 1.5 }}>
          {credits === 0
            ? cs.sidebar.noCredits
            : cs.sidebar.lowCredits(credits)}
        </div>
      )}

      <button
        disabled={!canScan}
        onClick={handleRunScan}
        style={{
          width: '100%', padding: 12, borderRadius: 10, border: 'none',
          background: canScan ? g.button : 'rgba(255,255,255,0.1)',
          color: canScan ? '#fff' : 'rgba(255,255,255,0.4)',
          fontFamily: f.heading, fontSize: 14, fontWeight: 700,
          cursor: canScan ? 'pointer' : 'not-allowed',
          boxShadow: canScan ? theme.shadow.glow : 'none',
          transition: 'all 0.2s',
        }}
      >
        {extracting
          ? cs.sidebar.btnReading
          : phase === 'loading'
          ? cs.sidebar.btnAnalysing
          : !cvText.trim()
          ? cs.sidebar.btnNeedCv
          : !role.trim()
          ? cs.sidebar.btnNeedRole
          : !hasEnoughCredits
          ? cs.sidebar.btnNeedCredits(SCAN_COST, credits ?? 0)
          : cs.sidebar.btnAnalyse(SCAN_COST)}
      </button>
    </div>
  )

  const ResultsView = result && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Smart Job Search banner */}
      {showJobSearchBanner && (
        <div style={{ background: g.successBtn, borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', boxShadow: '0 4px 20px rgba(29,158,117,0.3)' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: f.heading, marginBottom: 3 }}>
              {cs.results.jobBannerTitle}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
              {cs.results.jobBannerSub}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={goToJobSearch} style={{ fontSize: 12, padding: '8px 18px', borderRadius: 8, background: '#fff', color: c.success, border: 'none', cursor: 'pointer', fontFamily: f.heading, fontWeight: 700 }}>
              {cs.results.jobBannerBtn}
            </button>
            <button onClick={() => setShowJobSearchBanner(false)} style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', cursor: 'pointer' }}>
              {cs.results.jobBannerLater}
            </button>
          </div>
        </div>
      )}

      {/* Domain mismatch — replaces all analysis panels */}
      {result.domain_mismatch && (
        <div style={{ borderRadius: 14, border: `2px solid ${c.danger}`, boxShadow: '0 2px 16px rgba(226,75,74,0.12)', overflow: 'hidden' }}>
          <div style={{ background: c.danger, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <SvgIcon name="megaphone" size={28} color="#fff" />
            <div>
              <div style={{ fontFamily: f.heading, fontSize: 16, fontWeight: 800, color: '#fff' }}>
                {lang === 'DE' ? 'Falsches Berufsfeld — dieser Lebenslauf passt nicht zur Stelle' : 'Wrong domain — this CV doesn\'t match this role'}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
                {lang === 'DE' ? `Profil-Score: ${result.score} / 100` : `Profile score: ${result.score} / 100`}
              </div>
            </div>
          </div>
          <div style={{ padding: '20px 24px', background: '#fff' }}>
            <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, margin: 0 }}>{result.mismatch_message}</p>
          </div>
        </div>
      )}

      {/* Header + mode toggle — hidden when domain mismatch */}
      {!result.domain_mismatch && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontFamily: f.heading, fontSize: 18, fontWeight: 700, color: c.primary }}>{cs.results.title}</div>
          <div style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>{result.headline}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <CareerCard data={{
            score: result.score,
            readiness: result.readiness,
            headline: result.headline,
            strengths: result.strengths,
            salaryMin: result.salary_min,
            salaryMax: result.salary_max,
            salaryCurrency: result.salary_currency,
            market: 'eu',
          }} />
        </div>
        <div style={{ display: 'flex', background: c.bg, borderRadius: 10, padding: 3, gap: 2 }}>
          {(['insights', 'roast', 'upgrade'] as Mode[]).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ padding: '6px 14px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 8, background: mode === m ? c.primary : 'transparent', color: mode === m ? c.primaryLight : c.textMuted, cursor: 'pointer', fontFamily: f.body, transition: 'all 0.15s' }}>
              {m === 'insights' ? cs.results.modeInsights : m === 'roast' ? cs.results.modeRoast : cs.results.modeUpgrade}
            </button>
          ))}
        </div>
      </div>}

      {!result.domain_mismatch && (<>
      {/* INSIGHTS */}
      {mode === 'insights' && (
        <>
          {/* Score rings */}
          <div className="jl-score-rings" style={{ background: `linear-gradient(135deg, ${c.primary} 0%, #073d6e 60%, #0a4d8a 100%)`, borderRadius: 16, padding: '24px 20px' }}>
            <ScoreRing value={result.score} color={scoreColor(result.score)} label={cs.results.profileStrength} size={90} />
            {result.market_fit_score !== null && result.market_fit_score !== undefined
              ? <ScoreRing value={result.market_fit_score} color="#F59E0B" label={cs.results.marketFit} size={90} />
              : null}
            {result.keyword_score !== null && result.keyword_score !== undefined
              ? <ScoreRing value={result.keyword_score} color={c.success} label={cs.results.keywordMatch} size={90} />
              : null}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: f.heading, fontSize: 22, fontWeight: 700, color: '#fff' }}>{result.readiness}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{cs.results.readiness}</div>
              {result.salary_min && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontFamily: f.heading, fontSize: 13, fontWeight: 700, color: '#4ade80' }}>
                    {result.salary_currency} {fmt(result.salary_min)}&ndash;{fmt(result.salary_max)}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{cs.results.salaryRange}</div>
                </div>
              )}
            </div>
          </div>

          {/* Strengths + Gaps */}
          <MobileSection title={cs.results.strengths + ' & ' + cs.results.gaps} icon="sparkle" defaultOpen={true}>
            <div className="jl-cs-grid">
              <div style={{ background: c.successLight, border: `1px solid ${c.successBorder}`, borderRadius: 14, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: c.success, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff' }}>&#10003;</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0F6E56' }}>{cs.results.strengths}</div>
                </div>
                {result.strengths.map((s, i) => (
                  <div key={i} style={{ fontSize: 11, color: c.text, padding: '6px 10px', background: 'rgba(29,158,117,0.08)', borderRadius: 8, marginBottom: 5, lineHeight: 1.5, borderLeft: `3px solid ${c.success}` }}>
                    {s}
                  </div>
                ))}
              </div>
              <div style={{ background: c.warningLight, border: `1px solid ${c.warningBorder}`, borderRadius: 14, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', fontWeight: 700 }}>!</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>{cs.results.gaps}</div>
                </div>
                {result.gaps.map((gap, i) => (
                  <div key={i} style={{ fontSize: 11, color: c.text, padding: '6px 10px', background: 'rgba(245,158,11,0.08)', borderRadius: 8, marginBottom: 5, lineHeight: 1.5, borderLeft: '3px solid #F59E0B' }}>
                    {gap}
                  </div>
                ))}
              </div>
            </div>
          </MobileSection>

          {/* Best-fit roles */}
          <MobileSection title={cs.results.bestFitRoles} icon="target" defaultOpen={true}>
            <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, padding: 16 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {result.role_suggestions.map(r => (
                  <Link key={r} href={`/app/jobs?q=${encodeURIComponent(r)}`} style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, padding: '6px 14px', borderRadius: 20, background: c.primaryLight, color: c.navy, border: `1px solid ${c.accentLight}`, textDecoration: 'none', fontWeight: 600, transition: 'all 0.15s' }}>
                    {r} &rarr;
                  </Link>
                ))}
              </div>
            </div>
          </MobileSection>

          {/* Quick wins */}
          <MobileSection title={cs.results.quickWins} icon="lightning" defaultOpen={true}>
            <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, padding: 16 }}>
              {result.quick_wins.map((w, i) => (
                <div key={i} style={{ fontSize: 11, color: c.text, padding: '7px 10px', background: c.bgSubtle, borderRadius: 8, marginBottom: 6, lineHeight: 1.55, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ color: c.accent, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                  {w}
                </div>
              ))}
              {result.top_keyword && (
                <div style={{ fontSize: 11, color: c.textMuted, borderTop: `1px solid ${c.border}`, paddingTop: 10, marginTop: 6 }}>
                  {cs.results.keywordHint(result.top_keyword)}
                </div>
              )}
            </div>
          </MobileSection>

          {/* AI Era Vulnerability */}
          {result.ai_vulnerability_reason && (
            <MobileSection title={cs.results.aiEraRisk} icon="bot" defaultOpen={false}>
              <div style={{ background: '#1a0a2e', border: '1px solid rgba(109,40,217,0.4)', borderRadius: 14, padding: 16, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(109,40,217,0.15)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(109,40,217,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><SvgIcon name="lightning" size={14} color="#c4b5fd" /></div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#c4b5fd' }}>{cs.results.aiEraRisk}</div>
                    <div style={{ fontSize: 10, color: 'rgba(196,181,253,0.6)' }}>{cs.results.aiEraRiskSub}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontFamily: f.heading, fontSize: 20, fontWeight: 700, color: result.ai_vulnerability >= 70 ? '#f87171' : result.ai_vulnerability >= 40 ? '#fbbf24' : '#4ade80' }}>
                      {result.ai_vulnerability}%
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: result.ai_vulnerability >= 70 ? '#f87171' : result.ai_vulnerability >= 40 ? '#fbbf24' : '#4ade80' }}>
                      {result.ai_vulnerability_label}
                    </div>
                  </div>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, marginBottom: 12, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${result.ai_vulnerability}%`, background: result.ai_vulnerability >= 70 ? 'linear-gradient(90deg, #f87171, #ef4444)' : result.ai_vulnerability >= 40 ? 'linear-gradient(90deg, #fbbf24, #f59e0b)' : 'linear-gradient(90deg, #4ade80, #22c55e)', borderRadius: 3, transition: 'width 1s ease' }} />
                </div>
                <div style={{ fontSize: 12, color: 'rgba(196,181,253,0.85)', lineHeight: 1.65 }}>{result.ai_vulnerability_reason}</div>
              </div>
            </MobileSection>
          )}

          {/* Market insight */}
          {result.market_insight && (
            <MobileSection title={cs.results.marketInsight} icon="trending-up" defaultOpen={false}>
              <div style={{ background: `linear-gradient(135deg, ${c.primary}, #073d6e)`, borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 13, color: c.primaryLight, lineHeight: 1.65 }}>{result.market_insight}</div>
              </div>
            </MobileSection>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={resetAll} style={{ padding: '9px 18px', borderRadius: 8, background: c.bg, color: c.textMuted, border: `1px solid ${c.border}`, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              {cs.results.scanAgain}
            </button>
            <button onClick={goToJobSearch} style={{ padding: '9px 20px', borderRadius: 8, background: g.primaryBtn, color: c.primaryLight, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: f.heading }}>
              {cs.results.findJobs}
            </button>
          </div>
        </>
      )}

      {/* ROAST MODE */}
      {mode === 'roast' && (
        <div style={{ background: 'linear-gradient(135deg, #1a0505, #2d0a0a)', border: `1.5px solid ${c.danger}`, borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: `rgba(226,75,74,0.1)` }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{ fontFamily: f.heading, fontSize: 56, fontWeight: 700, color: c.danger, lineHeight: 1 }}>
              {Math.round(result.score / 10 * 3.2 / 8.2 * 10) / 10}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#F09595', fontFamily: f.heading }}>{cs.results.roastScore}</div>
              <div style={{ fontSize: 12, color: '#F09595', marginTop: 4, lineHeight: 1.5, maxWidth: 280 }}>{result.summary}</div>
            </div>
          </div>
          {(result.roast_lines && result.roast_lines.length > 0
            ? result.roast_lines
            : result.gaps.filter(Boolean)
          ).map((text, i) => (
            <div key={i} style={{ fontSize: 12, color: '#fca5a5', padding: '8px 12px', background: 'rgba(226,75,74,0.12)', borderRadius: 8, marginBottom: 6, borderLeft: `3px solid ${c.danger}`, lineHeight: 1.6 }}>
              {text}
            </div>
          ))}
          {toastMsg && (
            <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', background: c.primary, color: c.primaryLight, fontSize: 11, padding: '6px 14px', borderRadius: 8, whiteSpace: 'nowrap' }}>
              {toastMsg}
            </div>
          )}
        </div>
      )}

      {/* UPGRADE PATH */}
      {mode === 'upgrade' && (
        <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ background: `linear-gradient(135deg, ${c.primary}, #073d6e)`, padding: '16px 20px' }}>
            <div style={{ fontFamily: f.heading, fontSize: 15, fontWeight: 700, color: '#fff' }}>
              {cs.results.upgradePath(role)}
            </div>
            <div style={{ fontSize: 12, color: c.accentLight, marginTop: 4 }}>
              {cs.results.upgradeSubtitle}
            </div>
          </div>
          <div style={{ padding: 20 }}>
            {result.career_path_steps && result.career_path_steps.length > 0 ? (
              result.career_path_steps.map((step, idx, arr) => (
                <div key={idx} style={{ display: 'flex', gap: 14, paddingBottom: idx < arr.length - 1 ? 20 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: idx === 0 ? c.primary : c.bg, color: idx === 0 ? c.primaryLight : c.textMuted, border: idx === 0 ? `2px solid ${c.accent}` : `2px solid ${c.border}` }}>
                      {idx + 1}
                    </div>
                    {idx < arr.length - 1 && <div style={{ width: 2, flex: 1, background: `linear-gradient(to bottom, ${c.primary}, ${c.border})`, marginTop: 4 }} />}
                  </div>
                  <div style={{ flex: 1, paddingTop: 4 }}>
                    <div style={{ fontSize: 10, color: c.accent, fontWeight: 600, marginBottom: 2, textTransform: 'uppercase' as const, letterSpacing: 0.4 }}>{step.timeframe}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: c.primary, marginBottom: 8 }}>{step.focus}</div>
                    {step.actions.map((action, ai) => (
                      <div key={ai} style={{ fontSize: 11, padding: '6px 10px', borderRadius: 7, marginBottom: 5, color: c.text, background: c.bgSubtle, borderLeft: `3px solid ${c.border}`, lineHeight: 1.5 }}>
                        {action}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              /* Fallback if no career_path_steps from AI */
              [
                { period: 'Now — 2 weeks', title: 'CV & profile overhaul', tasks: result.quick_wins },
                { period: 'Month 1', title: 'Skills & visibility', tasks: [`Enroll in a ${role} certification`, 'Publish 2 LinkedIn articles', `Apply to 5-8 high-match ${role} roles`] },
                { period: 'Month 2–3', title: 'Active search & offers', tasks: [`Negotiate ${result.salary_currency} ${fmt(result.salary_min)}–${fmt(result.salary_max)}`, 'Run mock interviews', 'Network at DACH industry events'] },
              ].map((s, idx, arr) => (
                <div key={idx} style={{ display: 'flex', gap: 14, paddingBottom: idx < arr.length - 1 ? 20 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: idx === 0 ? c.primary : c.bg, color: idx === 0 ? c.primaryLight : c.textMuted, border: idx === 0 ? `2px solid ${c.accent}` : `2px solid ${c.border}` }}>{idx + 1}</div>
                    {idx < arr.length - 1 && <div style={{ width: 2, flex: 1, background: `linear-gradient(to bottom, ${c.primary}, ${c.border})`, marginTop: 4 }} />}
                  </div>
                  <div style={{ flex: 1, paddingTop: 4 }}>
                    <div style={{ fontSize: 10, color: c.accent, fontWeight: 600, marginBottom: 2, textTransform: 'uppercase' as const, letterSpacing: 0.4 }}>{s.period}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: c.primary, marginBottom: 8 }}>{s.title}</div>
                    {s.tasks.map((t, ti) => (
                      <div key={ti} style={{ fontSize: 11, padding: '6px 10px', borderRadius: 7, marginBottom: 5, color: c.text, background: c.bgSubtle, borderLeft: `3px solid ${c.border}`, lineHeight: 1.5 }}>{t}</div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      </>)}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: c.bg, fontFamily: f.body }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes shimmer { 0%,100% { transform: scaleX(0.3); opacity:0.4 } 50% { transform: scaleX(1); opacity:1 } }
        .jl-dsb { display: flex !important; }
        .jl-mob { display: none !important; }
        .jl-mbtn { display: none !important; }
        @media (max-width: 768px) {
          .jl-dsb { display: none !important; }
          .jl-mob { display: flex !important; }
          .jl-mbtn { display: block !important; }
        }
        textarea::placeholder { color: rgba(255,255,255,0.35); }
        input::placeholder { color: rgba(255,255,255,0.35); }
        select option { background: ${c.primary}; color: #fff; }
        .jl-cs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 600px) { .jl-cs-grid { grid-template-columns: 1fr !important; } }
        .jl-score-rings { display: flex; justify-content: space-around; align-items: center; flex-wrap: wrap; gap: 16px; }
        @media (max-width: 480px) { .jl-score-rings { gap: 8px; } }

        /* Mobile accordion — toggle button hidden on desktop, visible on mobile */
        .jl-mob-acc-btn { display: none !important; }
        .jl-mob-acc-body { display: block; }
        @media (max-width: 768px) {
          .jl-mob-acc { margin-bottom: 0; }
          .jl-mob-acc-btn {
            display: flex !important;
            width: 100%; align-items: center; justify-content: space-between;
            padding: 11px 14px; border: none; border-radius: 10px;
            background: rgba(255,255,255,0.07); cursor: pointer;
            font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.9);
            font-family: 'Outfit',sans-serif; text-align: left; margin-bottom: 6px;
          }
          .jl-mob-acc-body.jl-mob-acc-closed { display: none !important; }
        }
      `}</style>
      <Navbar />

      {crossWarnPending && (
        <CrossMarketModal
          cost={SCAN_COST}
          market="eu"
          crossAmount={crossMarketAmount(SCAN_COST, MARKET.eu)}
          onConfirm={() => { const fn = crossWarnPending; setCrossWarnPending(null); fn() }}
          onCancel={() => setCrossWarnPending(null)}
        />
      )}

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 52px)' }}>
        {/* Sidebar */}
        <div className="jl-dsb" style={{ width: 290, flexShrink: 0, background: 'linear-gradient(180deg, #152233 0%, #0e1a28 100%)', padding: '20px 16px', flexDirection: 'column', overflowY: 'auto' }}>
          {SB}
        </div>
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
          <div className="jl-mbtn" style={{ padding: '10px 16px', background: c.bgCard, borderBottom: `1px solid ${c.border}` }}>
            <button onClick={() => setMobOpen(o => !o)} style={{ background: c.primary, color: c.primaryLight, border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
              {mobOpen ? cs.mobCloseBtn : cs.mobOpenBtn}
            </button>
          </div>
          {mobOpen && (
            <div className="jl-mob" style={{ background: 'linear-gradient(180deg, #152233 0%, #0e1a28 100%)', borderBottom: `1px solid ${c.border}`, padding: 16, flexDirection: 'column', gap: 14 }}>
              {SB}
            </div>
          )}
          <div style={{ padding: 20 }}>
            {phase === 'upload' && (
              <div style={{ maxWidth: 480, margin: '48px auto 0', padding: '0 20px' }}>
                <div style={{ fontFamily: f.heading, fontSize: 20, fontWeight: 700, color: c.primary, marginBottom: 6 }}>
                  {cs.upload.title}
                </div>
                <div style={{ fontSize: 13, color: c.textMuted, marginBottom: 28 }}>
                  {cs.upload.subtitle}
                </div>

                {(() => {
                  const hasCV = cvText.trim().length > 0
                  const hasRole = role.trim().length > 0
                  const steps = [
                    {
                      done: hasCV || extracting,
                      loading: extracting,
                      num: 1,
                      title: extracting ? cs.upload.step1Loading : hasCV ? cs.upload.step1Done : cs.upload.step1Empty,
                      desc: extracting
                        ? cs.upload.step1DescLoading
                        : hasCV
                        ? cs.upload.step1DescDone(Math.round(cvText.length / 5))
                        : cs.upload.step1DescEmpty,
                    },
                    {
                      done: hasRole,
                      loading: false,
                      num: 2,
                      title: hasRole ? cs.upload.step2Done(role) : cs.upload.step2Empty,
                      desc: hasRole ? cs.upload.step2DescDone : cs.upload.step2DescEmpty,
                    },
                    {
                      done: false,
                      loading: false,
                      num: 3,
                      title: cs.upload.step3Title,
                      desc: cs.upload.step3Desc,
                    },
                  ]
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {steps.map((s, i) => (
                        <div key={i} style={{ display: 'flex', gap: 16, padding: '14px 18px', borderRadius: 12, background: s.done ? c.successLight : c.bgCard, border: `1px solid ${s.done ? c.successBorder : c.border}`, transition: 'all 0.3s', alignItems: 'flex-start' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, background: s.loading ? c.primaryLight : s.done ? c.success : c.bg, color: s.loading ? c.accent : s.done ? '#fff' : c.textFaint, border: `2px solid ${s.loading ? c.accent : s.done ? c.success : c.border}`, transition: 'all 0.3s' }}>
                            {s.loading
                              ? <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${c.accent}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                              : s.done ? '✓' : s.num}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: s.done ? '#0F6E56' : c.primary, fontFamily: f.heading, marginBottom: 3 }}>{s.title}</div>
                            <div style={{ fontSize: 12, color: s.done ? c.success : c.textMuted, lineHeight: 1.5 }}>{s.desc}</div>
                          </div>
                        </div>
                      ))}

                      {canScan && (
                        <div style={{ marginTop: 4, padding: '12px 18px', borderRadius: 12, background: `linear-gradient(135deg, ${c.primaryLight}, #dbeafe)`, border: `1px solid ${c.accentLight}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ fontSize: 20 }}>&#127919;</div>
                          <div style={{ fontSize: 13, color: c.navy, fontWeight: 600 }}>
                            {cs.upload.allSet}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}
            {phase === 'loading' && (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ position: 'relative', width: 60, height: 60, margin: '0 auto 20px' }}>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', border: `4px solid ${c.border}`, borderTopColor: c.accent, animation: 'spin 0.8s linear infinite' }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: c.primary, fontFamily: f.heading, marginBottom: 8 }}>{cs.loading}</div>
                <div style={{ fontSize: 13, color: c.textMuted }}>{cs.loadingSteps[step]}</div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 16 }}>
                  {cs.loadingSteps.map((_, i) => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i <= step ? c.accent : c.border, transition: 'background 0.3s' }} />
                  ))}
                </div>
              </div>
            )}
            {phase === 'error' && (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: c.errorLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px', color: c.error, fontWeight: 700 }}>!</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: c.error, marginBottom: 8 }}>{cs.errorTitle}</div>
                <div style={{ fontSize: 13, color: c.textMuted, marginBottom: 20 }}>{cs.errorSub}</div>
                <button onClick={() => { setPhase('upload'); setFileName(''); setCvText('') }} style={{ padding: '10px 24px', borderRadius: 10, background: g.primaryBtn, color: c.primaryLight, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: f.heading }}>
                  {cs.tryAgain}
                </button>
              </div>
            )}
            {phase === 'results' && ResultsView}
          </div>
        </div>
      </div>
    </div>
  )
}
