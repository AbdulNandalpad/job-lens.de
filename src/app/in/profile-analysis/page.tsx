'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCredits } from '@/lib/useCredits'
import CrossMarketModal from '@/components/CrossMarketModal'
import { CREDIT_COST, MARKET, SS, API } from '@/lib/constants'

const orange = '#ff9933'
const navy  = '#042C53'
const blue  = '#378ADD'
const green = '#1D9E75'
const red   = '#E24B4A'
const purple = '#7c3aed'

const COST = CREDIT_COST.careerScan

interface CareerResult {
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
  creditsRemaining: number
}

type ResTab = 'insights' | 'market' | 'career' | 'roast'

const LOAD_MSGS = [
  'Reading your CV in detail…',
  'Analysing India market fit…',
  'Calculating AI risk exposure…',
  'Building your career roadmap…',
]

function ScoreArc({ score, size = 120, color }: { score: number; size?: number; color: string }) {
  const r = (size / 2) - 10
  const circ = 2 * Math.PI * r
  const fill = circ * (1 - score / 100)
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(4,44,83,0.08)" strokeWidth={8}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }}/>
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
        fill={navy} fontSize={size * 0.22} fontWeight="800"
        style={{ transform: 'rotate(90deg)', transformOrigin: '50% 50%', fontFamily: "'Outfit',sans-serif" }}>
        {score}
      </text>
    </svg>
  )
}

function scoreColor(s: number) { return s >= 75 ? green : s >= 50 ? orange : red }
function readinessStyle(r: string) {
  const m: Record<string, { bg: string; color: string }> = {
    Ready:      { bg: 'rgba(29,158,117,0.12)',  color: green  },
    Strong:     { bg: 'rgba(29,158,117,0.12)',  color: green  },
    Developing: { bg: 'rgba(255,153,51,0.12)',  color: orange },
    Entry:      { bg: 'rgba(226,75,74,0.12)',   color: red    },
  }
  return m[r] ?? m['Developing']
}

export default function ProfileAnalysisPage() {
  const router = useRouter()
  const { credits, setCredits, needsCrossMarket, crossMarketAmount } = useCredits()
  const [cvText,      setCvText]      = useState('')
  const [role,        setRole]        = useState('')
  const [result,      setResult]      = useState<CareerResult | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [loadMsgIdx,  setLoadMsgIdx]  = useState(0)
  const [fileLoading, setFileLoading] = useState(false)
  const [resTab,      setResTab]      = useState<ResTab>('insights')
  const [crossWarn,   setCrossWarn]   = useState<(() => void) | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const loadTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const saved = sessionStorage.getItem(SS.cvText) || ''
    if (saved) setCvText(saved)
    const savedResult = sessionStorage.getItem(SS.inCareerScanResult)
    const savedRole   = sessionStorage.getItem(SS.inCareerScanRole)
    if (savedResult) { try { setResult(JSON.parse(savedResult)); setResTab('insights') } catch {} }
    if (savedRole)   setRole(savedRole)
  }, [])

  function startLoadTimer() {
    setLoadMsgIdx(0)
    loadTimer.current = setInterval(() => {
      setLoadMsgIdx(i => (i + 1) % LOAD_MSGS.length)
    }, 1800)
  }
  function stopLoadTimer() {
    if (loadTimer.current) { clearInterval(loadTimer.current); loadTimer.current = null }
  }

  async function handleFile(file: File) {
    setFileLoading(true)
    if (file.name.endsWith('.txt') || file.type === 'text/plain') {
      const fr = new FileReader()
      fr.onload = e => { const t = (e.target?.result as string) ?? ''; setCvText(t); sessionStorage.setItem(SS.cvText, t); setFileLoading(false) }
      fr.readAsText(file)
    } else {
      const form = new FormData(); form.append('file', file)
      try {
        const res = await fetch(API.extractPdf, { method: 'POST', body: form })
        const d   = await res.json()
        if (d.text) { setCvText(d.text); sessionStorage.setItem(SS.cvText, d.text) }
        else alert(d.error || 'Could not read file.')
      } catch { alert('Failed to read file.') }
      setFileLoading(false)
    }
  }

  async function runScan() {
    if (!cvText.trim()) { alert('Please add your CV text first.'); return }
    if (!role.trim())   { alert('Please enter a target role.'); return }
    setLoading(true); setResult(null); startLoadTimer()
    try {
      const res = await fetch(API.indiaCareerScanPro, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, role }),
      })
      if (res.status === 402) {
        const d = await res.json()
        if (typeof d.credits === 'number') setCredits(d.credits)
        alert('Not enough credits. Please top up on the Account page.')
        stopLoadTimer(); setLoading(false); return
      }
      const data: CareerResult = await res.json()
      if ('error' in data) { alert((data as { error: string }).error); stopLoadTimer(); setLoading(false); return }
      if (typeof data.creditsRemaining === 'number') setCredits(data.creditsRemaining)
      setResult(data); setResTab('insights')
      try {
        sessionStorage.setItem(SS.inCareerScanResult, JSON.stringify(data))
        sessionStorage.setItem(SS.inCareerScanRole, role)
      } catch {}
    } catch { alert('Analysis failed. Please try again.') }
    stopLoadTimer(); setLoading(false)
  }

  function handleRun() {
    if (needsCrossMarket(COST, MARKET.in)) setCrossWarn(() => runScan)
    else runScan()
  }

  const rs = result ? readinessStyle(result.readiness) : null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        .pa-grid { display: grid; grid-template-columns: 320px 1fr; gap: 24px; align-items: start; }
        @media (max-width: 900px) { .pa-grid { grid-template-columns: 1fr; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadein { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .pa-card { animation: fadein 0.3s ease; }
      `}</style>

      {crossWarn && (
        <CrossMarketModal
          cost={COST}
          market={MARKET.in}
          crossAmount={crossMarketAmount(COST, MARKET.in)}
          onConfirm={() => { const fn = crossWarn; setCrossWarn(null); fn() }}
          onCancel={() => setCrossWarn(null)}
        />
      )}

      <div style={{ background: '#f0f4f8', minHeight: 'calc(100vh - 52px)', padding: '28px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: 24, paddingLeft: 14, borderLeft: `3px solid ${orange}` }}>
            <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 700, color: navy, margin: 0 }}>Profile Analysis</h1>
            <p style={{ fontSize: 13, color: '#6b7c93', margin: '4px 0 0' }}>
              Upload your CV, pick a target role — get salary benchmarks, AI risk exposure, and a 3-month career roadmap.
            </p>
          </div>

          <div className="pa-grid">

            {/* ── Left sidebar ─────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* CV Upload */}
              <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 2px 12px rgba(4,44,83,0.06)', border: '1px solid #edf1f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: navy, fontFamily: "'Outfit',sans-serif" }}>Your CV</label>
                  <button onClick={() => fileRef.current?.click()}
                    style={{ fontSize: 11, padding: '4px 12px', borderRadius: 8, border: `1px solid ${blue}`, background: 'transparent', color: blue, cursor: 'pointer', fontWeight: 600 }}>
                    {fileLoading ? 'Reading…' : 'Upload PDF / DOCX'}
                  </button>
                  <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }}
                    onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                </div>
                <textarea
                  value={cvText}
                  onChange={e => setCvText(e.target.value)}
                  placeholder="Paste your CV text or upload a file…"
                  rows={9}
                  style={{ width: '100%', resize: 'vertical', padding: '10px 12px', borderRadius: 8, border: '1px solid #dce4ef', fontSize: 12, color: '#374151', fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6, outline: 'none', boxSizing: 'border-box' }}
                />
                {cvText && <div style={{ fontSize: 11, color: '#9aafbc', marginTop: 4 }}>{cvText.length.toLocaleString()} chars</div>}
              </div>

              {/* Target role */}
              <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 2px 12px rgba(4,44,83,0.06)', border: '1px solid #edf1f6' }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: navy, fontFamily: "'Outfit',sans-serif", display: 'block', marginBottom: 8 }}>Target Role</label>
                <input
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRun()}
                  placeholder="e.g. Senior Product Manager"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #dce4ef', fontSize: 13, color: '#374151', fontFamily: "'DM Sans',sans-serif", outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Credits + scan button */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {credits !== null && (
                  <div style={{ fontSize: 12, color: '#9aafbc', textAlign: 'center' }}>
                    {credits} credits remaining &mdash; costs {COST}
                  </div>
                )}
                <button onClick={handleRun} disabled={loading || !cvText.trim() || !role.trim()}
                  style={{ padding: '13px 0', borderRadius: 10, border: 'none', cursor: loading || !cvText.trim() || !role.trim() ? 'not-allowed' : 'pointer', background: loading || !cvText.trim() || !role.trim() ? '#d1d9e4' : `linear-gradient(135deg,${orange},#e67300)`, color: loading || !cvText.trim() || !role.trim() ? '#94a3b8' : '#042C53', fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, transition: 'all .15s', boxShadow: loading || !cvText.trim() || !role.trim() ? 'none' : '0 4px 16px rgba(255,153,51,0.35)' }}>
                  {loading ? 'Analysing…' : result ? 'Re-scan' : `Analyse Profile (${COST} credits)`}
                </button>
              </div>

              {/* Role suggestions (after scan) */}
              {(result?.role_suggestions?.length ?? 0) > 0 && (
                <div style={{ background: '#fff', borderRadius: 14, padding: 16, boxShadow: '0 2px 12px rgba(4,44,83,0.06)', border: '1px solid #edf1f6' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9aafbc', letterSpacing: .6, textTransform: 'uppercase', marginBottom: 8 }}>Best-fit roles</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {result?.role_suggestions?.map((r, i) => (
                      <div key={i} onClick={() => router.push(`/in/jobs?q=${encodeURIComponent(r)}`)}
                        style={{ padding: '8px 12px', borderRadius: 8, background: '#f8fafc', border: '1px solid #edf1f6', fontSize: 12, color: '#374151', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        onMouseOver={e => { e.currentTarget.style.borderColor = orange + '50'; e.currentTarget.style.background = orange + '08' }}
                        onMouseOut={e => { e.currentTarget.style.borderColor = '#edf1f6'; e.currentTarget.style.background = '#f8fafc' }}>
                        {r} <span style={{ color: orange, fontSize: 11 }}>→</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right: results ───────────────────────────── */}
            <div>
              {/* Empty state */}
              {!result && !loading && (
                <div style={{ background: '#fff', borderRadius: 14, padding: 60, textAlign: 'center', border: '1px solid #edf1f6', boxShadow: '0 2px 12px rgba(4,44,83,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <div style={{ fontSize: 52, opacity: .15, fontFamily: "'Outfit',sans-serif", fontWeight: 800, color: navy }}>75</div>
                  <p style={{ fontSize: 14, color: '#9aafbc', maxWidth: 280, lineHeight: 1.6 }}>
                    Upload your CV and enter a target role, then click <strong>Analyse Profile</strong>.
                  </p>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {['🎯 Salary benchmark', '🤖 AI risk score', '🗺 Career roadmap', '🔥 Honest roast'].map(f => (
                      <span key={f} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 20, background: orange + '10', color: orange, fontWeight: 600 }}>{f}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Loading */}
              {loading && (
                <div style={{ background: '#fff', borderRadius: 14, padding: 60, textAlign: 'center', border: '1px solid #edf1f6', boxShadow: '0 2px 12px rgba(4,44,83,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', border: `3px solid ${orange}`, borderTopColor: 'transparent', animation: 'spin .8s linear infinite' }}/>
                  <p style={{ fontSize: 14, color: '#6b7c93' }}>{LOAD_MSGS[loadMsgIdx]}</p>
                </div>
              )}

              {/* Results */}
              {result && !loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="pa-card">

                  {/* Score hero */}
                  <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #edf1f6', boxShadow: '0 2px 12px rgba(4,44,83,0.06)' }}>
                    <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                      <ScoreArc score={result.score} size={110} color={scoreColor(result.score)} />
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: 11, color: '#9aafbc', marginBottom: 4 }}>Overall Profile Score</div>
                        {rs && <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 20, background: rs.bg, color: rs.color, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{result.readiness}</span>}
                        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, color: navy, marginBottom: 6 }}>{result.headline}</div>
                        <p style={{ fontSize: 13, color: '#6b7c93', lineHeight: 1.6, margin: 0 }}>{result.summary}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                        {result.market_fit_score !== null && (
                          <div style={{ textAlign: 'center' }}>
                            <ScoreArc score={result.market_fit_score} size={72} color={blue}/>
                            <div style={{ fontSize: 10, color: '#9aafbc', marginTop: 2 }}>Market Fit</div>
                          </div>
                        )}
                        {result.keyword_score !== null && (
                          <div style={{ textAlign: 'center' }}>
                            <ScoreArc score={result.keyword_score} size={72} color={green}/>
                            <div style={{ fontSize: 10, color: '#9aafbc', marginTop: 2 }}>Keywords</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(['insights', 'market', 'career', 'roast'] as ResTab[]).map(t => (
                      <button key={t} onClick={() => setResTab(t)}
                        style={{ padding: '7px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: resTab === t ? orange : '#fff', color: resTab === t ? '#fff' : '#6b7c93', boxShadow: resTab === t ? '0 2px 8px rgba(255,153,51,0.3)' : '0 1px 4px rgba(4,44,83,0.06)', transition: 'all .15s' }}>
                        {t === 'insights' ? 'Insights' : t === 'market' ? 'Market & Salary' : t === 'career' ? 'Career Path' : '🔥 Roast'}
                      </button>
                    ))}
                  </div>

                  {/* Tab: Insights */}
                  {resTab === 'insights' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="pa-card">
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #edf1f6', boxShadow: '0 2px 12px rgba(4,44,83,0.06)' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: green, marginBottom: 12, letterSpacing: .5, textTransform: 'uppercase' }}>Strengths</div>
                          {result.strengths.map((s, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 10, fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                              <span style={{ color: green, flexShrink: 0, marginTop: 1 }}>✓</span>{s}
                            </div>
                          ))}
                        </div>
                        <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #edf1f6', boxShadow: '0 2px 12px rgba(4,44,83,0.06)' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: red, marginBottom: 12, letterSpacing: .5, textTransform: 'uppercase' }}>Gaps</div>
                          {result.gaps.map((g, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 10, fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                              <span style={{ color: red, flexShrink: 0, marginTop: 1 }}>!</span>{g}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Quick wins */}
                      <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #edf1f6', boxShadow: '0 2px 12px rgba(4,44,83,0.06)' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: orange, marginBottom: 12, letterSpacing: .5, textTransform: 'uppercase' }}>Quick Wins</div>
                        {result.quick_wins.map((w, i) => (
                          <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: orange, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{i+1}</div>
                            <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{w}</span>
                          </div>
                        ))}
                      </div>

                      {/* AI vulnerability */}
                      <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #edf1f6', boxShadow: '0 2px 12px rgba(4,44,83,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: purple, letterSpacing: .5, textTransform: 'uppercase' }}>AI Risk Exposure</div>
                          <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 12, background: 'rgba(124,58,237,0.1)', color: purple, fontWeight: 700 }}>{result.ai_vulnerability_label}</span>
                        </div>
                        <div style={{ height: 8, borderRadius: 4, background: '#edf1f6', marginBottom: 8, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${result.ai_vulnerability}%`, background: `linear-gradient(90deg,${purple},#a855f7)`, borderRadius: 4, transition: 'width 1s ease' }}/>
                        </div>
                        <div style={{ fontSize: 11, color: '#9aafbc', marginBottom: 8 }}>{result.ai_vulnerability}/100 — higher = more at risk</div>
                        <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0 }}>{result.ai_vulnerability_reason}</p>
                      </div>
                    </div>
                  )}

                  {/* Tab: Market & Salary */}
                  {resTab === 'market' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="pa-card">
                      <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #edf1f6', boxShadow: '0 2px 12px rgba(4,44,83,0.06)' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#9aafbc', marginBottom: 16, letterSpacing: .5, textTransform: 'uppercase' }}>Estimated Salary Range — India</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 32, fontWeight: 800, color: navy }}>₹{result.salary_min}–{result.salary_max}</span>
                          <span style={{ fontSize: 14, color: '#9aafbc' }}>LPA</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#9aafbc', marginBottom: 20 }}>Annual CTC in INR lakhs per annum</div>
                        <div style={{ height: 10, borderRadius: 5, background: '#edf1f6', position: 'relative', marginBottom: 24 }}>
                          <div style={{ position: 'absolute', left: `${Math.min((result.salary_min / 80) * 100, 80)}%`, right: `${Math.max(100 - (result.salary_max / 80) * 100, 5)}%`, height: '100%', background: `linear-gradient(90deg,${green},${blue})`, borderRadius: 5 }}/>
                        </div>
                        {result.top_keyword && (
                          <div style={{ padding: '10px 14px', background: 'rgba(226,75,74,0.06)', borderRadius: 10, border: '1px solid rgba(226,75,74,0.15)', fontSize: 13, color: red, marginBottom: 16 }}>
                            <strong>Top missing keyword:</strong> &ldquo;{result.top_keyword}&rdquo; — adding this to your CV can meaningfully boost your market rate.
                          </div>
                        )}
                        <div style={{ fontSize: 13, fontWeight: 700, color: navy, marginBottom: 8, fontFamily: "'Outfit',sans-serif" }}>India Market Insight</div>
                        <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0 }}>{result.market_insight}</p>
                      </div>
                    </div>
                  )}

                  {/* Tab: Career Path */}
                  {resTab === 'career' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} className="pa-card">
                      {result.career_path_steps.map((step, i) => (
                        <div key={i} style={{ background: '#fff', borderRadius: 14, padding: 20, border: `1px solid ${i === 0 ? orange + '30' : '#edf1f6'}`, boxShadow: '0 2px 12px rgba(4,44,83,0.06)', borderLeft: `4px solid ${i === 0 ? orange : i === 1 ? blue : green}` }}>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? orange : i === 1 ? blue : green, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{i+1}</div>
                            <div>
                              <div style={{ fontSize: 11, color: '#9aafbc', marginBottom: 2 }}>{step.timeframe}</div>
                              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, color: navy }}>{step.focus}</div>
                            </div>
                          </div>
                          {step.actions.map((a, j) => (
                            <div key={j} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 13, color: '#374151', lineHeight: 1.5, paddingLeft: 40 }}>
                              <span style={{ color: i === 0 ? orange : i === 1 ? blue : green, flexShrink: 0 }}>→</span>{a}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tab: Roast */}
                  {resTab === 'roast' && (
                    <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #edf1f6', boxShadow: '0 2px 12px rgba(4,44,83,0.06)' }} className="pa-card">
                      <div style={{ fontSize: 12, fontWeight: 700, color: red, marginBottom: 4, letterSpacing: .5, textTransform: 'uppercase' }}>Honest Feedback</div>
                      <p style={{ fontSize: 13, color: '#9aafbc', margin: '0 0 20px' }}>Real talk about your profile — no sugar-coating.</p>
                      {result.roast_lines.map((line, i) => (
                        <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16, padding: '14px 16px', borderRadius: 12, background: i === 0 ? 'rgba(226,75,74,0.05)' : '#fafbfd', border: `1px solid ${i === 0 ? 'rgba(226,75,74,0.2)' : '#edf1f6'}` }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: i === 0 ? red : '#edf1f6', color: i === 0 ? '#fff' : '#9aafbc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                            {i === 0 ? '🔥' : i + 1}
                          </div>
                          <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{line}</span>
                        </div>
                      ))}
                      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => router.push('/in/cv-builder')}
                          style={{ padding: '10px 20px', borderRadius: 9, background: `linear-gradient(135deg,${orange},#e67300)`, color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', boxShadow: '0 3px 12px rgba(255,153,51,0.35)', fontFamily: "'Outfit',sans-serif" }}>
                          Fix my CV now →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
