'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'
import { theme } from '@/lib/theme'

const { colors: c, gradients: g, fonts: f } = theme

interface ScanResult {
  score: number
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
}

const STEPS = [
  'Extracting skills and experience...',
  'Benchmarking against market data...',
  'Scoring role fit and readiness...',
  'Generating salary estimate...',
  'Composing recommendations...',
]

type Mode = 'insights' | 'roast' | 'upgrade'

function ScoreRing({ value, color, label, size = 80 }: { value: number; color: string; label: string; size?: number }) {
  const r = (size / 2) - 8
  const circ = 2 * Math.PI * r
  const dash = (value / 100) * circ
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }} />
      </svg>
      <div style={{ marginTop: -size - 4, height: size, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        <div style={{ fontFamily: f.heading, fontSize: size === 80 ? 22 : 18, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', marginTop: 2, textAlign: 'center', maxWidth: size - 16 }}>{label}</div>
      </div>
    </div>
  )
}

export default function CareerScanPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const linkedinInputRef = useRef<HTMLInputElement>(null)

  const [linkedinFileName, setLinkedinFileName] = useState('')
  const [cvText, setCvText] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileLoading, setFileLoading] = useState(false)
  const [linkedinLoading, setLinkedinLoading] = useState(false)
  const [role, setRole] = useState('')
  const [market, setMarket] = useState('Germany')
  const [phase, setPhase] = useState<'upload' | 'loading' | 'results' | 'error'>('upload')
  const [step, setStep] = useState(0)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [drag, setDrag] = useState(false)
  const [mobOpen, setMobOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('insights')
  const [toastMsg, setToastMsg] = useState('')
  const [showJobSearchBanner, setShowJobSearchBanner] = useState(false)

  useEffect(() => {
    if (phase === 'results' && result) {
      sessionStorage.setItem('jl_scan_result', JSON.stringify(result))
      sessionStorage.setItem('jl_scan_role', role)
      sessionStorage.setItem('jl_scan_market', market)
      sessionStorage.setItem('jl_scan_phase', 'results')
    }
  }, [phase, result])

  useEffect(() => {
    const savedPhase = sessionStorage.getItem('jl_scan_phase')
    if (savedPhase === 'results') {
      const savedResult = sessionStorage.getItem('jl_scan_result')
      const savedRole = sessionStorage.getItem('jl_scan_role')
      const savedMarket = sessionStorage.getItem('jl_scan_market')
      if (savedResult) {
        try {
          setResult(JSON.parse(savedResult))
          setPhase('results')
          setShowJobSearchBanner(false)
          if (savedRole) setRole(savedRole)
          if (savedMarket) setMarket(savedMarket)
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
        const res = await fetch('/api/extract-pdf', { method: 'POST', body: form })
        const data = await res.json()
        if (data.text) { setCvText(data.text) } else { alert(data.error || 'Could not read PDF. Please paste your CV text below.'); setFileName('') }
      } catch { alert('Failed to read PDF. Please paste your CV text below.'); setFileName('') }
      setFileLoading(false)
    }
  }

  function clearCvFile() { setFileName(''); setCvText(''); if (fileInputRef.current) fileInputRef.current.value = '' }

  async function handleLinkedinFile(file: File) {
    setLinkedinFileName(file.name)
    setLinkedinLoading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/extract-pdf', { method: 'POST', body: form })
      const data = await res.json()
      if (data.text && !cvText) setCvText(data.text)
    } catch { }
    setLinkedinLoading(false)
  }

  function clearLinkedinFile() { setLinkedinFileName(''); if (linkedinInputRef.current) linkedinInputRef.current.value = '' }

  function resetAll() {
    setPhase('upload'); setFileName(''); setCvText(''); setLinkedinFileName('')
    setShowJobSearchBanner(false); setResult(null); setRole('')
    sessionStorage.removeItem('jl_scan_result'); sessionStorage.removeItem('jl_scan_phase')
    sessionStorage.removeItem('jl_scan_role'); sessionStorage.removeItem('jl_scan_market')
    sessionStorage.removeItem('jl_cv_text'); sessionStorage.removeItem('jl_target_role')
  }

  async function runScan() {
    if (!cvText.trim()) { alert('Please upload your CV or paste your CV text first.'); return }
    setPhase('loading'); setMobOpen(false); setStep(0); setMode('insights'); setShowJobSearchBanner(false)
    const t = setInterval(() => setStep(p => Math.min(p + 1, STEPS.length - 1)), 1800)
    try {
      const res = await fetch('/api/career-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `You are a senior career coach for ${market}. Analyse this CV for "${role}" in ${market}.\nCV:\n---\n${cvText.slice(0, 6000)}\n---\nReturn ONLY valid JSON no markdown:\n{"score":<0-100>,"readiness":"<Ready|Strong|Developing|Entry>","headline":"<10-15 words>","summary":"<2 sentences>","strengths":["s1","s2","s3","s4"],"gaps":["g1","g2","g3"],"quick_wins":["w1","w2","w3"],"role_suggestions":["r1","r2","r3","r4"],"salary_min":<int>,"salary_max":<int>,"salary_currency":"<EUR|CHF>","top_keyword":"<word>","market_insight":"<1-2 sentences>"}`,
        }),
      })
      const data = await res.json()
      clearInterval(t)
      if (data.error || !data.score) { setPhase('error') } else { setResult(data); setPhase('results'); setShowJobSearchBanner(true) }
    } catch { clearInterval(t); setPhase('error') }
  }

  function goToJobSearch() {
    sessionStorage.setItem('jl_cv_text', cvText)
    sessionStorage.setItem('jl_target_role', role)
    router.push('/app/smart-apply?from=career-scan')
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
                {fileName ? 'Uploaded successfully' : 'Click to upload'}
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

  const extracting = fileLoading || linkedinLoading
  const canScan = cvText.trim().length > 0 && role.trim() && phase !== 'loading' && !extracting

  const SB = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ textAlign: 'center', paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: f.heading }}>Career Scan</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 3 }}>AI-powered profile analysis</div>
      </div>

      <UploadBox label="LinkedIn PDF" sublabel="Export from LinkedIn, Save to PDF" fileName={linkedinFileName} inputRef={linkedinInputRef} onFile={handleLinkedinFile} onClear={clearLinkedinFile} accept=".pdf" />
      <UploadBox label="CV / Resume" sublabel="PDF, DOCX or TXT" fileName={fileName} inputRef={fileInputRef} onFile={handleFile} onClear={clearCvFile} accept=".pdf,.txt,.doc,.docx" />

      <div style={{ height: 1, background: 'rgba(255,255,255,0.1)' }} />

      <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.6, textTransform: 'uppercase' as const, marginBottom: 6 }}>CV text</div>

      {extracting ? (
        <div style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${c.accentLight}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: c.accentLight, fontWeight: 600 }}>
              {linkedinLoading ? 'Reading LinkedIn PDF…' : 'Reading CV PDF…'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: c.accentLight, borderRadius: 2, animation: `shimmer 1.4s ease-in-out ${i * 0.18}s infinite`, transformOrigin: 'left' }} />
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Extracting text — takes a few seconds</div>
        </div>
      ) : cvText ? (
        <div style={{ position: 'relative' }}>
          <textarea
            value={cvText}
            onChange={e => setCvText(e.target.value)}
            rows={4}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${c.success}`, fontSize: 11, fontFamily: f.body, color: '#fff', background: 'rgba(29,158,117,0.07)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' as const, lineHeight: 1.5 }}
          />
          <div style={{ fontSize: 10, color: c.success, marginTop: 3 }}>&#10003; Text extracted — you can edit if needed</div>
        </div>
      ) : (
        <textarea
          value={cvText}
          onChange={e => setCvText(e.target.value)}
          placeholder="Or paste your CV content here..."
          rows={4}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', fontSize: 11, fontFamily: f.body, color: '#fff', background: 'rgba(255,255,255,0.05)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' as const, lineHeight: 1.5 }}
        />
      )}

      <div style={{ height: 1, background: 'rgba(255,255,255,0.1)' }} />

      <div>
        {secLabel('Target Role')}
        <input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. SAP CX Lead, Product Owner" style={inp} />
      </div>

      <div>
        {secLabel('Target Market')}
        <select value={market} onChange={e => setMarket(e.target.value)} style={inp}>
          <option>Germany</option>
          <option>Switzerland</option>
          <option>Austria</option>
          <option>DACH</option>
          <option>EU</option>
        </select>
      </div>

      {(cvText || fileName || linkedinFileName || phase === 'results') && (
        <button onClick={resetAll} style={{ width: '100%', padding: 9, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontFamily: f.heading, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Reset Everything
        </button>
      )}

      <button
        disabled={!canScan}
        onClick={runScan}
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
        {extracting ? 'Reading PDF…' : phase === 'loading' ? 'Analysing…' : 'Analyse My Profile'}
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
              Ready to find matching jobs?
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
              Your profile is ready &mdash; take it to Smart Job Search
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={goToJobSearch} style={{ fontSize: 12, padding: '8px 18px', borderRadius: 8, background: '#fff', color: c.success, border: 'none', cursor: 'pointer', fontFamily: f.heading, fontWeight: 700 }}>
              Find Matching Jobs &rarr;
            </button>
            <button onClick={() => setShowJobSearchBanner(false)} style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', cursor: 'pointer' }}>
              Later
            </button>
          </div>
        </div>
      )}

      {/* Header + mode toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: f.heading, fontSize: 18, fontWeight: 700, color: c.primary }}>Career Scan Results</div>
          <div style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>{result.headline}</div>
        </div>
        <div style={{ display: 'flex', background: c.bg, borderRadius: 10, padding: 3, gap: 2 }}>
          {(['insights', 'roast', 'upgrade'] as Mode[]).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ padding: '6px 14px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 8, background: mode === m ? c.primary : 'transparent', color: mode === m ? c.primaryLight : c.textMuted, cursor: 'pointer', fontFamily: f.body, transition: 'all 0.15s' }}>
              {m === 'insights' ? 'Insights' : m === 'roast' ? 'Roast' : 'Upgrade'}
            </button>
          ))}
        </div>
      </div>

      {/* INSIGHTS */}
      {mode === 'insights' && (
        <>
          {/* Score rings */}
          <div style={{ background: `linear-gradient(135deg, ${c.primary} 0%, #073d6e 60%, #0a4d8a 100%)`, borderRadius: 16, padding: '24px 20px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <ScoreRing value={result.score} color={scoreColor(result.score)} label="Profile Strength" size={90} />
            <ScoreRing value={Math.round(result.score * 0.9)} color="#F59E0B" label="Market Fit" size={90} />
            <ScoreRing value={Math.min(100, Math.round(result.score * 1.1))} color={c.success} label="Keyword Match" size={90} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: f.heading, fontSize: 22, fontWeight: 700, color: '#fff' }}>{result.readiness}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>Readiness</div>
              {result.salary_min && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontFamily: f.heading, fontSize: 13, fontWeight: 700, color: '#4ade80' }}>
                    {result.salary_currency} {fmt(result.salary_min)}&ndash;{fmt(result.salary_max)}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Salary range</div>
                </div>
              )}
            </div>
          </div>

          {/* Strengths + Gaps */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: c.successLight, border: `1px solid ${c.successBorder}`, borderRadius: 14, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: c.success, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff' }}>&#10003;</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0F6E56' }}>Strengths</div>
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
                <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>Gaps to address</div>
              </div>
              {result.gaps.map((gap, i) => (
                <div key={i} style={{ fontSize: 11, color: c.text, padding: '6px 10px', background: 'rgba(245,158,11,0.08)', borderRadius: 8, marginBottom: 5, lineHeight: 1.5, borderLeft: '3px solid #F59E0B' }}>
                  {gap}
                </div>
              ))}
            </div>
          </div>

          {/* Best-fit roles */}
          <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: c.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>&#127919;</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: c.primary }}>Best-fit roles &mdash; click to search</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {result.role_suggestions.map(r => (
                <Link key={r} href={`/app/smart-apply?q=${encodeURIComponent(r)}`} style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, padding: '6px 14px', borderRadius: 20, background: c.primaryLight, color: c.navy, border: `1px solid ${c.accentLight}`, textDecoration: 'none', fontWeight: 600, transition: 'all 0.15s' }}>
                  {r} &rarr;
                </Link>
              ))}
            </div>
          </div>

          {/* Quick wins */}
          <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: c.warningLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>&#9889;</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: c.primary }}>Quick wins &mdash; do these before applying</div>
            </div>
            {result.quick_wins.map((w, i) => (
              <div key={i} style={{ fontSize: 11, color: c.text, padding: '7px 10px', background: c.bgSubtle, borderRadius: 8, marginBottom: 6, lineHeight: 1.55, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: c.accent, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                {w}
              </div>
            ))}
            {result.top_keyword && (
              <div style={{ fontSize: 11, color: c.textMuted, borderTop: `1px solid ${c.border}`, paddingTop: 10, marginTop: 6 }}>
                Add <strong style={{ color: c.navy }}>&ldquo;{result.top_keyword}&rdquo;</strong> to your headline for better ATS matching.
              </div>
            )}
          </div>

          {/* Market insight */}
          {result.market_insight && (
            <div style={{ background: `linear-gradient(135deg, ${c.primary}, #073d6e)`, borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: c.accentLight, letterSpacing: 0.5, textTransform: 'uppercase' as const, marginBottom: 8 }}>Market Insight</div>
              <div style={{ fontSize: 13, color: c.primaryLight, lineHeight: 1.65 }}>{result.market_insight}</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={resetAll} style={{ padding: '9px 18px', borderRadius: 8, background: c.bg, color: c.textMuted, border: `1px solid ${c.border}`, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              Scan again
            </button>
            <button onClick={goToJobSearch} style={{ padding: '9px 20px', borderRadius: 8, background: g.primaryBtn, color: c.primaryLight, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: f.heading }}>
              Find matching jobs &rarr;
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
              <div style={{ fontSize: 15, fontWeight: 700, color: '#F09595', fontFamily: f.heading }}>Roast Score / 10</div>
              <div style={{ fontSize: 12, color: '#F09595', marginTop: 4, lineHeight: 1.5, maxWidth: 280 }}>{result.summary}</div>
            </div>
          </div>
          {[
            result.gaps[0] && `Your CV says "${result.readiness}" but recruiters see zero quantified results. That is not a profile — that is a blank canvas.`,
            result.gaps[1] && `${result.gaps[1]} Fix it before you send a single application.`,
            result.gaps[2] && `${result.gaps[2]} You are invisible to ATS filters right now.`,
            `The good news: ${result.strengths[0]}. That is genuinely rare. You just buried it under terrible presentation.`,
            result.market_insight,
          ].filter(Boolean).map((text, i) => (
            <div key={i} style={{ fontSize: 12, color: '#fca5a5', padding: '8px 12px', background: 'rgba(226,75,74,0.12)', borderRadius: 8, marginBottom: 6, borderLeft: `3px solid ${c.danger}`, lineHeight: 1.6 }}>
              {text}
            </div>
          ))}
          <button onClick={() => showToast('Roast card copied!')} style={{ width: '100%', marginTop: 12, padding: 10, borderRadius: 10, background: `linear-gradient(135deg, ${c.danger}, #dc2626)`, color: '#fff', fontFamily: f.heading, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
            Share my roast score on LinkedIn
          </button>
          {toastMsg && (
            <div style={{ position: 'absolute', bottom: -36, left: '50%', transform: 'translateX(-50%)', background: c.primary, color: c.primaryLight, fontSize: 11, padding: '6px 14px', borderRadius: 8, whiteSpace: 'nowrap' }}>
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
              Your upgrade path &mdash; to Senior {role}
            </div>
            <div style={{ fontSize: 12, color: c.accentLight, marginTop: 4 }}>
              Estimated: 3&ndash;4 months to {result.salary_currency} {fmt(result.salary_max)}+ roles
            </div>
          </div>
          <div style={{ padding: 20 }}>
            {[
              { status: 'done', period: 'Completed', title: 'Foundation - credentials and experience', tasks: result.strengths.map(s => ({ text: s, done: true })) },
              { status: 'now', period: 'Now - Week 1-2', title: 'CV and profile overhaul', tasks: result.quick_wins.map(w => ({ text: w, done: false })) },
              { status: 'next', period: 'Month 1', step: 3, title: 'Certification and visibility', tasks: [
                { text: `Enroll in a formal ${role} certification`, done: false },
                { text: 'Publish 2 LinkedIn articles demonstrating expertise', done: false },
                { text: `Apply to 5-8 high-match ${role} roles`, done: false },
              ]},
              { status: 'next', period: 'Month 2-3', step: 4, title: 'Interview readiness and offers', tasks: [
                { text: 'Complete certification', done: false },
                { text: 'Run 3-5 mock interviews (behavioural + technical)', done: false },
                { text: `Negotiate ${result.salary_currency} ${fmt(result.salary_min)}–${fmt(result.salary_max)} salary`, done: false },
              ]},
            ].map((s, idx, arr) => (
              <div key={idx} style={{ display: 'flex', gap: 14, paddingBottom: idx < arr.length - 1 ? 20 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: s.status === 'done' ? c.success : s.status === 'now' ? c.primary : c.bg, color: s.status === 'done' ? '#fff' : s.status === 'now' ? c.primaryLight : c.textMuted, border: s.status === 'done' ? `2px solid ${c.success}` : s.status === 'now' ? `2px solid ${c.accent}` : `2px solid ${c.border}` }}>
                    {s.status === 'done' ? '✓' : s.status === 'now' ? '›' : s.step}
                  </div>
                  {idx < arr.length - 1 && <div style={{ width: 2, flex: 1, background: `linear-gradient(to bottom, ${c.primary}, ${c.border})`, marginTop: 4 }} />}
                </div>
                <div style={{ flex: 1, paddingTop: 4 }}>
                  <div style={{ fontSize: 10, color: c.accent, fontWeight: 600, marginBottom: 3, textTransform: 'uppercase' as const, letterSpacing: 0.4 }}>{s.period}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: c.primary, marginBottom: 8 }}>{s.title}</div>
                  {s.tasks.map((t, ti) => (
                    <div key={ti} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 7, marginBottom: 4, color: t.done ? c.success : c.textMuted, background: t.done ? c.successLight : c.bgSubtle, textDecoration: t.done ? 'line-through' : 'none', borderLeft: t.done ? `3px solid ${c.success}` : `3px solid ${c.border}` }}>
                      {t.text}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
      `}</style>
      <Navbar />
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 52px)' }}>
        {/* Sidebar */}
        <div className="jl-dsb" style={{ width: 290, flexShrink: 0, background: `linear-gradient(180deg, ${c.primary} 0%, #073d6e 100%)`, padding: '20px 16px', flexDirection: 'column', overflowY: 'auto' }}>
          {SB}
        </div>
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
          <div className="jl-mbtn" style={{ padding: '10px 16px', background: c.bgCard, borderBottom: `1px solid ${c.border}` }}>
            <button onClick={() => setMobOpen(o => !o)} style={{ background: c.primary, color: c.primaryLight, border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
              {mobOpen ? 'Close' : 'Upload CV & Settings'}
            </button>
          </div>
          {mobOpen && (
            <div className="jl-mob" style={{ background: `linear-gradient(180deg, ${c.primary} 0%, #073d6e 100%)`, borderBottom: `1px solid ${c.border}`, padding: 16, flexDirection: 'column', gap: 14 }}>
              {SB}
            </div>
          )}
          <div style={{ padding: 20 }}>
            {phase === 'upload' && (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: c.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 20px' }}>&#128203;</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: c.primary, fontFamily: f.heading, marginBottom: 10 }}>Upload your CV and run the scan</div>
                <div style={{ fontSize: 14, color: c.textMuted, lineHeight: 1.7, maxWidth: 380, margin: '0 auto' }}>
                  Add your CV in the sidebar, enter your target role, then click Analyse My Profile.
                </div>
              </div>
            )}
            {phase === 'loading' && (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ position: 'relative', width: 60, height: 60, margin: '0 auto 20px' }}>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', border: `4px solid ${c.border}`, borderTopColor: c.accent, animation: 'spin 0.8s linear infinite' }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: c.primary, fontFamily: f.heading, marginBottom: 8 }}>Analysing your CV...</div>
                <div style={{ fontSize: 13, color: c.textMuted }}>{STEPS[step]}</div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 16 }}>
                  {STEPS.map((_, i) => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i <= step ? c.accent : c.border, transition: 'background 0.3s' }} />
                  ))}
                </div>
              </div>
            )}
            {phase === 'error' && (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: c.errorLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px', color: c.error, fontWeight: 700 }}>!</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: c.error, marginBottom: 8 }}>Analysis failed</div>
                <div style={{ fontSize: 13, color: c.textMuted, marginBottom: 20 }}>Please try again or paste your CV text manually.</div>
                <button onClick={() => { setPhase('upload'); setFileName(''); setCvText('') }} style={{ padding: '10px 24px', borderRadius: 10, background: g.primaryBtn, color: c.primaryLight, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: f.heading }}>
                  Try again
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
