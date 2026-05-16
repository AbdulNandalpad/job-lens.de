'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCredits } from '@/lib/useCredits'
import CrossMarketModal from '@/components/CrossMarketModal'
import { CREDIT_COST, MARKET, SS, API } from '@/lib/constants'

const orange = '#ff9933'
const navy   = '#042C53'
const blue   = '#378ADD'
const green  = '#1D9E75'
const red    = '#E24B4A'
const purple = '#7c3aed'

// ── ATS Scan types ────────────────────────────────────────
interface ATSResult {
  ats_score: number
  keyword_score: number
  format_score: number
  section_score: number
  impact_score: number
  readiness: string
  headline: string
  matched_keywords: string[]
  missing_keywords: string[]
  format_issues: string[]
  section_gaps: string[]
  quick_fixes: string[]
  rewrite_suggestions: { original: string; improved: string }[]
  ats_verdict: string
  top_missing_keyword: string
  creditsRemaining: number
}
type ATSTab = 'overview' | 'keywords' | 'fixes'

// ── Career Scan types ─────────────────────────────────────
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
type CareerTab = 'insights' | 'roast' | 'upgrade'

type Mode = 'ats' | 'career'

// ── Shared helpers ────────────────────────────────────────
function scoreColor(s: number) { return s >= 75 ? green : s >= 50 ? orange : red }

function ScoreRing({ score, size = 100, label, color }: { score: number; size?: number; label: string; color: string }) {
  const r = (size / 2) - 9
  const circ = 2 * Math.PI * r
  const fill = circ * (1 - score / 100)
  return (
    <div style={{ textAlign:'center' }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(4,44,83,0.08)" strokeWidth={7}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
          strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round" style={{ transition:'stroke-dashoffset 0.8s ease' }}/>
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
          fill={navy} fontSize={size * 0.22} fontWeight="700"
          style={{ transform:'rotate(90deg)', transformOrigin:'50% 50%', fontFamily:"'Outfit',sans-serif" }}>
          {score}
        </text>
      </svg>
      <div style={{ fontSize:11, color:'#6b7c93', marginTop:4, fontFamily:"'DM Sans',sans-serif" }}>{label}</div>
    </div>
  )
}

function readinessBadge(r: string) {
  const map: Record<string, { bg: string; color: string }> = {
    'ATS Ready': { bg:'rgba(29,158,117,0.12)', color:green },
    'Needs Work': { bg:'rgba(255,153,51,0.12)', color:orange },
    'High Risk': { bg:'rgba(226,75,74,0.12)', color:red },
    'Ready':      { bg:'rgba(29,158,117,0.12)', color:green },
    'Strong':     { bg:'rgba(55,138,221,0.12)', color:blue },
    'Developing': { bg:'rgba(255,153,51,0.12)', color:orange },
    'Entry':      { bg:'rgba(226,75,74,0.12)', color:red },
  }
  return map[r] || map['Needs Work']
}

export default function IndiaCareerScanPage() {
  const router = useRouter()
  const COST = CREDIT_COST.careerScan
  const { credits, setCredits, needsCrossMarket, crossMarketAmount } = useCredits()

  // ── Mode ─────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(SS.inCareerScanMode)
      return (saved === 'career' || saved === 'ats') ? saved as Mode : 'ats'
    }
    return 'ats'
  })

  function switchMode(m: Mode) {
    setMode(m)
    sessionStorage.setItem(SS.inCareerScanMode, m)
  }

  // ── Shared CV state ───────────────────────────────────────
  const [cvText,      setCvText]      = useState('')
  const [fileLoading, setFileLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = sessionStorage.getItem(SS.cvText) || ''
    if (saved) setCvText(saved)
  }, [])

  async function handleFile(file: File) {
    setFileLoading(true)
    if (file.name.endsWith('.txt') || file.type === 'text/plain') {
      const r = new FileReader()
      r.onload = e => { const txt = (e.target?.result as string) ?? ''; setCvText(txt); sessionStorage.setItem(SS.cvText, txt); setFileLoading(false) }
      r.readAsText(file)
    } else {
      const form = new FormData()
      form.append('file', file)
      try {
        const res = await fetch(API.extractPdf, { method:'POST', body:form })
        const data = await res.json()
        if (data.text) { setCvText(data.text); sessionStorage.setItem(SS.cvText, data.text) }
        else alert(data.error || 'Could not read file.')
      } catch { alert('Failed to read file.') }
      setFileLoading(false)
    }
  }

  // ── ATS Scan state ────────────────────────────────────────
  const [jdText,      setJdText]      = useState('')
  const [atsResult,   setAtsResult]   = useState<ATSResult | null>(null)
  const [atsLoading,  setAtsLoading]  = useState(false)
  const [atsTab,      setAtsTab]      = useState<ATSTab>('overview')
  const [showInputs,  setShowInputs]  = useState(true)
  const [prevScore,   setPrevScore]   = useState<number | null>(null)
  const [crossWarnAts, setCrossWarnAts] = useState<(() => void) | null>(null)

  async function runATS() {
    if (!cvText.trim()) { alert('Please add your CV text.'); return }
    if (!jdText.trim()) { alert('Please paste the job description.'); return }
    if (credits !== null && credits < COST) { alert(`You need ${COST} credits. Top up on the Account page.`); return }
    setAtsLoading(true); setAtsResult(null)
    try {
      const res = await fetch(API.indiaCareerScan, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ cvText, jdText }),
      })
      if (res.status === 402) { const d = await res.json(); if (typeof d.credits === 'number') setCredits(d.credits); alert('Not enough credits.'); setAtsLoading(false); return }
      const data = await res.json()
      if (data.error) { alert(data.error); setAtsLoading(false); return }
      if (typeof data.creditsRemaining === 'number') setCredits(data.creditsRemaining)
      setPrevScore(atsResult?.ats_score ?? null)
      setAtsResult(data); setAtsTab('overview'); setShowInputs(false)
      try {
        sessionStorage.setItem(SS.atsSuggestions, JSON.stringify({
          missing_keywords: data.missing_keywords || [],
          quick_fixes: data.quick_fixes || [],
          format_issues: data.format_issues || [],
          section_gaps: data.section_gaps || [],
        }))
      } catch {}
    } catch { alert('Analysis failed. Please try again.') }
    setAtsLoading(false)
  }

  function handleRunATS() {
    if (needsCrossMarket(COST, MARKET.in)) setCrossWarnAts(() => runATS)
    else runATS()
  }

  // ── Career Scan state ─────────────────────────────────────
  const [role,          setRole]          = useState('')
  const [careerResult,  setCareerResult]  = useState<CareerResult | null>(null)
  const [careerLoading, setCareerLoading] = useState(false)
  const [careerPhase,   setCareerPhase]   = useState<'idle'|'loading'|'done'>('idle')
  const [careerTab,     setCareerTab]     = useState<CareerTab>('insights')
  const [crossWarnCareer, setCrossWarnCareer] = useState<(() => void) | null>(null)

  useEffect(() => {
    const savedRole = sessionStorage.getItem(SS.inCareerScanRole)
    if (savedRole) setRole(savedRole)
  }, [])

  async function runCareerScan() {
    if (!cvText.trim()) { alert('Please add your CV text.'); return }
    if (!role.trim()) { alert('Please enter a target role.'); return }
    if (credits !== null && credits < COST) { alert(`You need ${COST} credits. Top up on the Account page.`); return }
    setCareerLoading(true); setCareerPhase('loading'); setCareerResult(null)
    sessionStorage.setItem(SS.inCareerScanRole, role)
    try {
      const res = await fetch(API.indiaCareerScanPro, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ cvText, role }),
      })
      if (res.status === 402) { const d = await res.json(); if (typeof d.credits === 'number') setCredits(d.credits); alert('Not enough credits.'); setCareerLoading(false); setCareerPhase('idle'); return }
      const data = await res.json()
      if (data.error) { alert(data.error); setCareerLoading(false); setCareerPhase('idle'); return }
      if (typeof data.creditsRemaining === 'number') setCredits(data.creditsRemaining)
      setCareerResult(data); setCareerPhase('done'); setCareerTab('insights')
    } catch { alert('Analysis failed. Please try again.'); setCareerPhase('idle') }
    setCareerLoading(false)
  }

  function handleRunCareer() {
    if (needsCrossMarket(COST, MARKET.in)) setCrossWarnCareer(() => runCareerScan)
    else runCareerScan()
  }

  // ── Loading steps ─────────────────────────────────────────
  const LOADING_STEPS = [
    'Extracting skills and experience…',
    'Matching against India market data…',
    'Calculating AI vulnerability score…',
    'Generating your career roadmap…',
  ]
  const [loadStep, setLoadStep] = useState(0)
  useEffect(() => {
    if (!careerLoading) { setLoadStep(0); return }
    const iv = setInterval(() => setLoadStep(s => (s + 1) % LOADING_STEPS.length), 1800)
    return () => clearInterval(iv)
  }, [careerLoading])

  // ── Common CV upload panel ────────────────────────────────
  const CVPanel = () => (
    <div style={{ background:'#fff', borderRadius:14, padding:20, boxShadow:'0 2px 12px rgba(4,44,83,0.06)', border:'1px solid #edf1f6' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <label style={{ fontSize:13, fontWeight:700, color:navy, fontFamily:"'Outfit',sans-serif" }}>Your CV</label>
        <button onClick={() => fileRef.current?.click()}
          style={{ fontSize:11, padding:'4px 12px', borderRadius:8, border:`1px solid ${blue}`, background:'transparent', color:blue, cursor:'pointer', fontWeight:600 }}>
          {fileLoading ? 'Reading…' : 'Upload PDF / DOCX'}
        </button>
        <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" style={{ display:'none' }}
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>
      <textarea
        value={cvText}
        onChange={e => { setCvText(e.target.value); sessionStorage.setItem(SS.cvText, e.target.value) }}
        placeholder="Paste your CV text here, or upload a file above…"
        rows={8}
        style={{ width:'100%', resize:'vertical', padding:'10px 12px', borderRadius:8, border:'1px solid #dce4ef', fontSize:12, color:'#374151', fontFamily:"'DM Sans',sans-serif", lineHeight:1.6, outline:'none', boxSizing:'border-box' }}
      />
      {cvText && <div style={{ fontSize:11, color:'#9aafbc', marginTop:4 }}>{cvText.length.toLocaleString()} characters</div>}
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        @keyframes spin  { to { transform:rotate(360deg); } }
        @keyframes fadeUp{ from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none} }
        .scan-grid { display:grid; grid-template-columns:420px 1fr; gap:24px; }
        @media(max-width:900px){ .scan-grid { grid-template-columns:1fr; } }
        .career-scan-grid { display:grid; grid-template-columns:300px 1fr; gap:0; min-height:calc(100vh - 52px - 80px); }
        @media(max-width:900px){ .career-scan-grid { grid-template-columns:1fr; } }
      `}</style>

      {/* Cross market modals */}
      {crossWarnAts && (
        <CrossMarketModal cost={COST} market={MARKET.in} crossAmount={crossMarketAmount(COST, MARKET.in)}
          onConfirm={() => { const fn = crossWarnAts; setCrossWarnAts(null); fn() }}
          onCancel={() => setCrossWarnAts(null)} />
      )}
      {crossWarnCareer && (
        <CrossMarketModal cost={COST} market={MARKET.in} crossAmount={crossMarketAmount(COST, MARKET.in)}
          onConfirm={() => { const fn = crossWarnCareer; setCrossWarnCareer(null); fn() }}
          onCancel={() => setCrossWarnCareer(null)} />
      )}

      <div style={{ background:'#f0f4f8', minHeight:'calc(100vh - 52px)' }}>

        {/* ── Mode selector header ── */}
        <div style={{ background:'#fff', borderBottom:'1px solid #edf1f6', padding:'20px 24px' }}>
          <div style={{ maxWidth:1100, margin:'0 auto' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
              <div style={{ paddingLeft:14, borderLeft:`3px solid ${orange}` }}>
                <h1 style={{ fontFamily:"'Outfit',sans-serif", fontSize:20, fontWeight:700, color:navy, margin:0 }}>Career Scan</h1>
                <p style={{ fontSize:13, color:'#6b7c93', margin:'3px 0 0' }}>
                  {mode==='ats' ? 'Compare your CV against any job description' : 'Get a full profile analysis for the India market'}
                </p>
              </div>
              {/* Mode toggle */}
              <div style={{ display:'flex', gap:0, background:'#f0f4f8', borderRadius:12, padding:4, border:'1px solid #dce4ef' }}>
                {([
                  { id:'ats',    label:'🎯 ATS Scan',     desc:'CV vs Job Description' },
                  { id:'career', label:'🚀 Career Scan',  desc:'Full profile analysis'  },
                ] as { id:Mode; label:string; desc:string }[]).map(m => (
                  <button key={m.id} onClick={() => switchMode(m.id)}
                    style={{ padding:'9px 20px', borderRadius:10, border:'none', cursor:'pointer', transition:'all .15s', fontFamily:"'DM Sans',sans-serif",
                      background: mode===m.id ? '#fff' : 'transparent',
                      boxShadow: mode===m.id ? '0 1px 6px rgba(4,44,83,0.1)' : 'none',
                      color: mode===m.id ? navy : '#9aafbc',
                    }}>
                    <div style={{ fontSize:13, fontWeight:mode===m.id?700:400 }}>{m.label}</div>
                    <div style={{ fontSize:10, color: mode===m.id?'#6b7c93':'#c0cfe0', marginTop:1 }}>{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════ ATS SCAN MODE ══════════════════════ */}
        {mode === 'ats' && (
          <div style={{ maxWidth:1100, margin:'0 auto', padding:'28px 24px' }}>
            <div className="scan-grid">

              {/* Left — inputs */}
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                {atsResult && (
                  <div style={{ background:'#fff', borderRadius:14, padding:'14px 20px', boxShadow:'0 2px 12px rgba(4,44,83,0.06)', border:'1px solid #edf1f6' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
                      <div style={{ fontSize:12, color:'#6b7c93', overflow:'hidden' }}>
                        <span style={{ color:navy, fontWeight:600 }}>JD: </span>
                        {jdText.slice(0,100)}{jdText.length>100?'…':''}
                      </div>
                      <button onClick={() => setShowInputs(s => !s)}
                        style={{ fontSize:11, padding:'5px 12px', borderRadius:8, border:`1px solid ${blue}`, background:'transparent', color:blue, cursor:'pointer', fontWeight:600, whiteSpace:'nowrap', flexShrink:0 }}>
                        {showInputs ? 'Hide' : 'Edit Inputs'}
                      </button>
                    </div>
                  </div>
                )}

                {(!atsResult || showInputs) && (
                  <>
                    <CVPanel />
                    <div style={{ background:'#fff', borderRadius:14, padding:20, boxShadow:'0 2px 12px rgba(4,44,83,0.06)', border:'1px solid #edf1f6' }}>
                      <label style={{ fontSize:13, fontWeight:700, color:navy, fontFamily:"'Outfit',sans-serif", display:'block', marginBottom:10 }}>
                        Job Description
                        <span style={{ fontSize:11, color:'#9aafbc', fontWeight:400, marginLeft:8 }}>From Naukri, LinkedIn, or any portal</span>
                      </label>
                      <textarea value={jdText} onChange={e => setJdText(e.target.value)}
                        placeholder="Paste the job description here…"
                        rows={8}
                        style={{ width:'100%', resize:'vertical', padding:'10px 12px', borderRadius:8, border:'1px solid #dce4ef', fontSize:12, color:'#374151', fontFamily:"'DM Sans',sans-serif", lineHeight:1.6, outline:'none', boxSizing:'border-box' }}
                      />
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:12, color:'#9aafbc' }}>
                        {credits !== null ? `${credits} credits` : ''} — costs {COST}
                      </span>
                      <button onClick={handleRunATS} disabled={atsLoading}
                        style={{ padding:'12px 28px', borderRadius:10, background:atsLoading?'#ccc':`linear-gradient(135deg,${orange},#e67300)`, color:'#fff', fontWeight:700, fontSize:14, border:'none', cursor:atsLoading?'not-allowed':'pointer', boxShadow:atsLoading?'none':'0 4px 16px rgba(255,153,51,0.4)', transition:'all .2s' }}>
                        {atsLoading ? 'Analyzing…' : atsResult ? 'Re-scan' : 'Scan ATS Score'}
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Right — results */}
              <div>
                {!atsResult && !atsLoading && (
                  <div style={{ background:'#fff', borderRadius:14, padding:40, textAlign:'center', border:'1px solid #edf1f6', boxShadow:'0 2px 12px rgba(4,44,83,0.06)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, minHeight:300 }}>
                    <div style={{ fontSize:48, opacity:.3 }}>87</div>
                    <p style={{ fontSize:14, color:'#9aafbc', maxWidth:280, lineHeight:1.6 }}>Add your CV and a job description, then click <strong>Scan ATS Score</strong>.</p>
                  </div>
                )}
                {atsLoading && (
                  <div style={{ background:'#fff', borderRadius:14, padding:40, textAlign:'center', border:'1px solid #edf1f6', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:20, minHeight:300 }}>
                    <div style={{ width:48, height:48, borderRadius:'50%', border:`3px solid ${orange}`, borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }}/>
                    <p style={{ fontSize:13, color:'#6b7c93' }}>Scanning your CV against ATS criteria…</p>
                  </div>
                )}
                {atsResult && (
                  <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                    <div style={{ background:'#fff', borderRadius:14, padding:24, border:'1px solid #edf1f6', boxShadow:'0 2px 12px rgba(4,44,83,0.06)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:12 }}>
                        <div>
                          <div style={{ fontSize:12, color:'#9aafbc', marginBottom:4 }}>Overall ATS Score</div>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <span style={{ fontFamily:"'Outfit',sans-serif", fontSize:40, fontWeight:800, color:scoreColor(atsResult.ats_score) }}>{atsResult.ats_score}</span>
                            <span style={{ fontFamily:"'Outfit',sans-serif", fontSize:18, color:'#9aafbc' }}>/100</span>
                            {prevScore !== null && (
                              <span style={{ fontSize:13, fontWeight:700, color:atsResult.ats_score>prevScore?green:atsResult.ats_score<prevScore?red:'#9aafbc', padding:'3px 10px', borderRadius:12, background:atsResult.ats_score>prevScore?'rgba(29,158,117,0.1)':'rgba(226,75,74,0.1)' }}>
                                {atsResult.ats_score>prevScore?`+${atsResult.ats_score-prevScore}`:atsResult.ats_score<prevScore?`-${prevScore-atsResult.ats_score}`:'='} from last
                              </span>
                            )}
                          </div>
                          {(() => { const b = readinessBadge(atsResult.readiness); return (
                            <div style={{ display:'inline-block', padding:'4px 12px', borderRadius:20, background:b.bg, color:b.color, fontSize:12, fontWeight:700, marginTop:6 }}>{atsResult.readiness}</div>
                          )})()}
                        </div>
                        <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                          <ScoreRing score={atsResult.keyword_score} size={80} label="Keywords" color={scoreColor(atsResult.keyword_score)}/>
                          <ScoreRing score={atsResult.format_score}  size={80} label="Format"   color={scoreColor(atsResult.format_score)}/>
                          <ScoreRing score={atsResult.section_score} size={80} label="Sections"  color={scoreColor(atsResult.section_score)}/>
                          <ScoreRing score={atsResult.impact_score}  size={80} label="Impact"   color={scoreColor(atsResult.impact_score)}/>
                        </div>
                      </div>
                      <div style={{ padding:'12px 16px', background:'#fafbfd', borderRadius:8, fontSize:13, color:'#374151', lineHeight:1.5 }}>{atsResult.headline}</div>
                      {atsResult.top_missing_keyword && (
                        <div style={{ marginTop:10, padding:'8px 14px', background:'rgba(226,75,74,0.08)', borderRadius:8, fontSize:12, color:red }}>
                          <strong>Top priority:</strong> Add "{atsResult.top_missing_keyword}" — most impactful missing keyword.
                        </div>
                      )}
                      <div style={{ marginTop:16, display:'flex', justifyContent:'flex-end' }}>
                        <button onClick={() => { try { sessionStorage.setItem(SS.cvText, cvText); sessionStorage.setItem(SS.atsSuggestions, JSON.stringify({ missing_keywords:atsResult.missing_keywords, quick_fixes:atsResult.quick_fixes })) } catch {}; router.push('/in/cv-builder') }}
                          style={{ padding:'10px 20px', borderRadius:9, background:`linear-gradient(135deg,${orange},#e67300)`, color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor:'pointer', boxShadow:'0 3px 12px rgba(255,153,51,0.35)', fontFamily:"'Outfit',sans-serif" }}>
                          Fix my CV based on these suggestions →
                        </button>
                      </div>
                    </div>

                    {/* ATS Tabs */}
                    <div style={{ display:'flex', gap:8 }}>
                      {(['overview','keywords','fixes'] as ATSTab[]).map(t => (
                        <button key={t} onClick={() => setAtsTab(t)}
                          style={{ padding:'7px 18px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:atsTab===t?orange:'#fff', color:atsTab===t?'#fff':'#6b7c93', boxShadow:atsTab===t?'0 2px 8px rgba(255,153,51,0.3)':'0 1px 4px rgba(4,44,83,0.06)' }}>
                          {t==='overview'?'Overview':t==='keywords'?'Keywords':'Quick Fixes'}
                        </button>
                      ))}
                    </div>

                    <div style={{ background:'#fff', borderRadius:14, padding:24, border:'1px solid #edf1f6', boxShadow:'0 2px 12px rgba(4,44,83,0.06)' }}>
                      {atsTab==='overview' && (
                        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                          {atsResult.format_issues.length>0 && (
                            <div>
                              <div style={{ fontSize:13, fontWeight:700, color:navy, marginBottom:10, fontFamily:"'Outfit',sans-serif" }}>Format Issues</div>
                              {atsResult.format_issues.map((issue,i) => (
                                <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:8 }}>
                                  <span style={{ color:red, fontSize:14, flexShrink:0, marginTop:1 }}>!</span>
                                  <span style={{ fontSize:13, color:'#374151' }}>{issue}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {atsResult.section_gaps.length>0 && (
                            <div>
                              <div style={{ fontSize:13, fontWeight:700, color:navy, marginBottom:10, fontFamily:"'Outfit',sans-serif" }}>Section Gaps</div>
                              {atsResult.section_gaps.map((gap,i) => (
                                <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:8 }}>
                                  <span style={{ color:orange, fontSize:14, flexShrink:0, marginTop:1 }}>~</span>
                                  <span style={{ fontSize:13, color:'#374151' }}>{gap}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {atsResult.ats_verdict && (
                            <div style={{ padding:'14px 16px', background:'rgba(4,44,83,0.04)', borderRadius:10, border:'1px solid #edf1f6' }}>
                              <div style={{ fontSize:12, fontWeight:700, color:navy, marginBottom:6, fontFamily:"'Outfit',sans-serif" }}>ATS Verdict</div>
                              <p style={{ fontSize:13, color:'#374151', lineHeight:1.6, margin:0 }}>{atsResult.ats_verdict}</p>
                            </div>
                          )}
                          {atsResult.rewrite_suggestions.length>0 && (
                            <div>
                              <div style={{ fontSize:13, fontWeight:700, color:navy, marginBottom:10, fontFamily:"'Outfit',sans-serif" }}>Bullet Rewrites</div>
                              {atsResult.rewrite_suggestions.map((s,i) => (
                                <div key={i} style={{ marginBottom:14, padding:14, borderRadius:10, background:'#fafbfd', border:'1px solid #edf1f6' }}>
                                  <div style={{ fontSize:11, color:red, fontWeight:700, marginBottom:4 }}>BEFORE</div>
                                  <div style={{ fontSize:12, color:'#6b7c93', marginBottom:10, fontStyle:'italic' }}>{s.original}</div>
                                  <div style={{ fontSize:11, color:green, fontWeight:700, marginBottom:4 }}>AFTER</div>
                                  <div style={{ fontSize:12, color:'#1a2332' }}>{s.improved}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {atsTab==='keywords' && (
                        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                          {atsResult.missing_keywords.length>0 && (
                            <div>
                              <div style={{ fontSize:13, fontWeight:700, color:navy, marginBottom:10, fontFamily:"'Outfit',sans-serif" }}>
                                Missing Keywords <span style={{ fontSize:11, color:red, fontWeight:400 }}>({atsResult.missing_keywords.length} — add these)</span>
                              </div>
                              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                                {atsResult.missing_keywords.map((kw,i) => (
                                  <span key={i} style={{ padding:'5px 12px', borderRadius:20, background:'rgba(226,75,74,0.1)', border:'1px solid rgba(226,75,74,0.25)', fontSize:12, color:red, fontWeight:500 }}>{kw}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {atsResult.matched_keywords.length>0 && (
                            <div>
                              <div style={{ fontSize:13, fontWeight:700, color:navy, marginBottom:10, fontFamily:"'Outfit',sans-serif" }}>
                                Matched Keywords <span style={{ fontSize:11, color:green, fontWeight:400 }}>({atsResult.matched_keywords.length} found ✓)</span>
                              </div>
                              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                                {atsResult.matched_keywords.map((kw,i) => (
                                  <span key={i} style={{ padding:'5px 12px', borderRadius:20, background:'rgba(29,158,117,0.1)', border:'1px solid rgba(29,158,117,0.25)', fontSize:12, color:green, fontWeight:500 }}>{kw}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {atsTab==='fixes' && (
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, color:navy, marginBottom:14, fontFamily:"'Outfit',sans-serif" }}>
                            Top 5 Quick Fixes <span style={{ fontSize:11, color:'#9aafbc', fontWeight:400, marginLeft:8 }}>Do these before applying</span>
                          </div>
                          {atsResult.quick_fixes.map((fix,i) => (
                            <div key={i} style={{ display:'flex', gap:14, alignItems:'flex-start', marginBottom:14, padding:'12px 14px', borderRadius:10, background:i===0?'rgba(255,153,51,0.06)':'#fafbfd', border:`1px solid ${i===0?'rgba(255,153,51,0.2)':'#edf1f6'}` }}>
                              <div style={{ width:24, height:24, borderRadius:'50%', background:i===0?orange:'#edf1f6', color:i===0?'#fff':'#6b7c93', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, flexShrink:0 }}>{i+1}</div>
                              <span style={{ fontSize:13, color:'#374151', lineHeight:1.5 }}>{fix}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════ CAREER SCAN MODE ══════════════════════ */}
        {mode === 'career' && (
          <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', minHeight:'calc(100vh - 130px)' }}>

            {/* ── Sidebar ── */}
            <div style={{ background:'linear-gradient(180deg,#152233 0%,#0e1a28 100%)', padding:'24px 18px', borderRight:'1px solid rgba(255,255,255,0.1)', display:'flex', flexDirection:'column', gap:18, overflowY:'auto' }}>
              <div style={{ textAlign:'center', paddingBottom:14, borderBottom:'1px solid rgba(255,255,255,0.12)' }}>
                <div style={{ fontSize:15, fontWeight:700, color:'#fff', fontFamily:"'Outfit',sans-serif" }}>Career Scan</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:3 }}>India market · powered by AI</div>
              </div>

              {/* CV upload */}
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.5)', letterSpacing:.6, textTransform:'uppercase', marginBottom:7 }}>Your CV</div>
                <div onClick={() => !cvText && fileRef.current?.click()} style={{ border:`1.5px ${cvText?'solid #4ade80':'dashed rgba(255,255,255,0.25)'}`, borderRadius:10, padding:'11px 14px', cursor:cvText?'default':'pointer', background:cvText?'rgba(74,222,128,0.1)':'rgba(255,255,255,0.05)', display:'flex', alignItems:'center', gap:10 }}>
                  <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" style={{ display:'none' }}
                    onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                  <div style={{ width:20, height:20, borderRadius:4, background:cvText?'rgba(74,222,128,0.3)':'rgba(255,255,255,0.15)', flexShrink:0 }}/>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:cvText?'#4ade80':'#fff', marginBottom:1 }}>
                      {fileLoading ? 'Reading…' : cvText ? `${(cvText.length/1000).toFixed(1)}k chars` : 'Upload or paste CV'}
                    </div>
                    <div style={{ fontSize:11, color:cvText?'#4ade80':'rgba(255,255,255,0.5)' }}>
                      {cvText ? 'CV loaded · or paste below' : 'PDF · DOCX · TXT'}
                    </div>
                  </div>
                </div>
                {!cvText && (
                  <textarea value={cvText} onChange={e => { setCvText(e.target.value); sessionStorage.setItem(SS.cvText, e.target.value) }}
                    placeholder="…or paste CV text here"
                    rows={4}
                    style={{ width:'100%', marginTop:8, padding:'9px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.18)', background:'rgba(255,255,255,0.07)', fontSize:12, color:'#fff', fontFamily:"'DM Sans',sans-serif", lineHeight:1.5, outline:'none', resize:'vertical', boxSizing:'border-box' }}
                  />
                )}
                {cvText && (
                  <div style={{ marginTop:6, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ fontSize:11, color:'#4ade80' }}>✓ CV ready</div>
                    <button onClick={() => { setCvText(''); sessionStorage.removeItem(SS.cvText) }} style={{ fontSize:10, color:'rgba(255,255,255,0.4)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>Clear</button>
                  </div>
                )}
              </div>

              {/* Target role */}
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.5)', letterSpacing:.6, textTransform:'uppercase', marginBottom:7 }}>Target Role</div>
                <input value={role} onChange={e => setRole(e.target.value)}
                  placeholder="e.g. Senior Data Scientist"
                  style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.18)', background:'rgba(255,255,255,0.07)', fontSize:13, color:'#fff', fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box' }}
                />
              </div>

              {/* Credits info */}
              <div style={{ padding:'10px 12px', background:'rgba(255,153,51,0.08)', border:'1px solid rgba(255,153,51,0.2)', borderRadius:10 }}>
                <div style={{ fontSize:11, color:'rgba(255,153,51,0.8)' }}>
                  {credits !== null ? `${credits} credits remaining` : 'Checking credits…'} · costs {COST}
                </div>
              </div>

              {/* Scan button */}
              <button onClick={handleRunCareer} disabled={careerLoading || !cvText.trim() || !role.trim()}
                style={{ padding:'12px 0', borderRadius:10, border:'none', cursor:careerLoading||!cvText.trim()||!role.trim()?'not-allowed':'pointer', background:careerLoading||!cvText.trim()||!role.trim()?'rgba(255,255,255,0.08)':`linear-gradient(135deg,${orange},#e67300)`, color:careerLoading||!cvText.trim()||!role.trim()?'rgba(255,255,255,0.25)':'#042C53', fontFamily:"'Outfit',sans-serif", fontSize:14, fontWeight:700, transition:'all .15s' }}>
                {careerLoading ? 'Analyzing…' : careerResult ? 'Re-scan' : `Scan Profile (${COST} credits)`}
              </button>

              {/* Role suggestions (after scan) */}
              {(careerResult?.role_suggestions?.length ?? 0) > 0 && (
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.4)', letterSpacing:.6, textTransform:'uppercase', marginBottom:8 }}>Best-fit roles</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                    {careerResult?.role_suggestions?.map((r,i) => (
                      <div key={i} onClick={() => router.push(`/in/jobs?q=${encodeURIComponent(r)}`)}
                        style={{ padding:'7px 11px', borderRadius:7, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', fontSize:12, color:'rgba(255,255,255,0.75)', cursor:'pointer', transition:'all .15s' }}
                        onMouseOver={e => { e.currentTarget.style.background='rgba(255,153,51,0.15)'; e.currentTarget.style.borderColor='rgba(255,153,51,0.3)'; e.currentTarget.style.color='#fff' }}
                        onMouseOut={e => { e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.12)'; e.currentTarget.style.color='rgba(255,255,255,0.75)' }}>
                        {r} <span style={{ color:'rgba(255,153,51,0.6)', fontSize:11 }}>→</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right panel ── */}
            <div style={{ background:'#f0f4f8', padding:'28px 28px', overflowY:'auto' }}>

              {/* Idle */}
              {careerPhase==='idle' && (
                <div style={{ background:'#fff', borderRadius:14, padding:40, textAlign:'center', border:'1px solid #edf1f6', boxShadow:'0 2px 12px rgba(4,44,83,0.06)', display:'flex', flexDirection:'column', alignItems:'center', gap:20, minHeight:340, justifyContent:'center' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, width:'100%', maxWidth:400 }}>
                    {[['Profile Strength','Scores your CV 0-100 vs target role'],['Market Fit','How aligned you are with India job market'],['AI Vulnerability','How safe your role is from automation']].map(([t,d]) => (
                      <div key={t} style={{ padding:16, background:'#f8fafc', borderRadius:10, border:'1px solid #edf1f6' }}>
                        <div style={{ fontSize:12, fontWeight:700, color:navy, marginBottom:5, fontFamily:"'Outfit',sans-serif" }}>{t}</div>
                        <div style={{ fontSize:11, color:'#9aafbc', lineHeight:1.5 }}>{d}</div>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize:13, color:'#9aafbc', maxWidth:320, lineHeight:1.7 }}>
                    Upload your CV and enter a target role. We'll give you a full India market analysis — strengths, gaps, salary, roadmap, and your AI risk score.
                  </p>
                </div>
              )}

              {/* Loading */}
              {careerPhase==='loading' && (
                <div style={{ background:'#fff', borderRadius:14, padding:40, textAlign:'center', border:'1px solid #edf1f6', display:'flex', flexDirection:'column', alignItems:'center', gap:20, minHeight:340, justifyContent:'center' }}>
                  <div style={{ width:52, height:52, borderRadius:'50%', border:`3px solid ${orange}`, borderTopColor:'transparent', animation:'spin .8s linear infinite' }}/>
                  <p style={{ fontSize:13, color:'#6b7c93', animation:'fadeUp .4s ease' }}>{LOADING_STEPS[loadStep]}</p>
                </div>
              )}

              {/* Results */}
              {careerPhase==='done' && careerResult && (
                <div style={{ display:'flex', flexDirection:'column', gap:16, animation:'fadeUp .3s ease' }}>

                  {/* Score header */}
                  <div style={{ background:'#fff', borderRadius:14, padding:24, border:'1px solid #edf1f6', boxShadow:'0 2px 12px rgba(4,44,83,0.06)' }}>
                    <div style={{ display:'flex', gap:24, alignItems:'flex-start', flexWrap:'wrap' }}>
                      <div>
                        <div style={{ fontSize:11, color:'#9aafbc', marginBottom:4 }}>Profile Strength</div>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <span style={{ fontFamily:"'Outfit',sans-serif", fontSize:44, fontWeight:800, color:scoreColor(careerResult.score) }}>{careerResult.score}</span>
                          <span style={{ fontSize:18, color:'#9aafbc' }}>/100</span>
                        </div>
                        {(() => { const b = readinessBadge(careerResult.readiness); return (
                          <div style={{ display:'inline-block', padding:'4px 12px', borderRadius:20, background:b.bg, color:b.color, fontSize:12, fontWeight:700, marginTop:6 }}>{careerResult.readiness}</div>
                        )})()}
                      </div>
                      {careerResult.market_fit_score !== null && (
                        <ScoreRing score={careerResult.market_fit_score} size={90} label="Market Fit" color={scoreColor(careerResult.market_fit_score)}/>
                      )}
                      {careerResult.keyword_score !== null && (
                        <ScoreRing score={careerResult.keyword_score} size={90} label="Keywords" color={scoreColor(careerResult.keyword_score)}/>
                      )}
                      <div style={{ flex:1, minWidth:200 }}>
                        <div style={{ fontSize:13, color:navy, fontWeight:600, marginBottom:4, fontFamily:"'Outfit',sans-serif" }}>{careerResult.headline}</div>
                        <div style={{ fontSize:12, color:'#6b7c93', lineHeight:1.5 }}>{careerResult.summary}</div>
                        {careerResult.salary_currency === 'INR' ? (
                          <div style={{ marginTop:10, fontSize:13, fontWeight:700, color:green }}>
                            ₹{careerResult.salary_min}–{careerResult.salary_max} LPA <span style={{ fontSize:11, fontWeight:400, color:'#9aafbc' }}>estimated range</span>
                          </div>
                        ) : (
                          <div style={{ marginTop:10, fontSize:13, fontWeight:700, color:green }}>
                            {careerResult.salary_currency} {careerResult.salary_min.toLocaleString()}–{careerResult.salary_max.toLocaleString()} <span style={{ fontSize:11, fontWeight:400, color:'#9aafbc' }}>estimated</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tab nav */}
                  <div style={{ display:'flex', gap:8 }}>
                    {([
                      { id:'insights', label:'💡 Insights' },
                      { id:'roast',    label:'🔥 Roast'    },
                      { id:'upgrade',  label:'📈 Upgrade'  },
                    ] as { id:CareerTab; label:string }[]).map(t => (
                      <button key={t.id} onClick={() => setCareerTab(t.id)}
                        style={{ padding:'7px 18px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:careerTab===t.id?orange:'#fff', color:careerTab===t.id?'#fff':'#6b7c93', boxShadow:careerTab===t.id?'0 2px 8px rgba(255,153,51,0.3)':'0 1px 4px rgba(4,44,83,0.06)' }}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Insights tab */}
                  {careerTab==='insights' && (
                    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                        <div style={{ background:'#fff', borderRadius:14, padding:20, border:'1px solid #edf1f6', boxShadow:'0 2px 8px rgba(4,44,83,0.05)' }}>
                          <div style={{ fontSize:13, fontWeight:700, color:green, marginBottom:12, fontFamily:"'Outfit',sans-serif", display:'flex', alignItems:'center', gap:6 }}>
                            ✅ Strengths
                          </div>
                          {careerResult.strengths.map((s,i) => (
                            <div key={i} style={{ fontSize:12, color:'#374151', lineHeight:1.5, marginBottom:8, display:'flex', gap:8 }}>
                              <span style={{ color:green, flexShrink:0 }}>•</span>{s}
                            </div>
                          ))}
                        </div>
                        <div style={{ background:'#fff', borderRadius:14, padding:20, border:'1px solid #edf1f6', boxShadow:'0 2px 8px rgba(4,44,83,0.05)' }}>
                          <div style={{ fontSize:13, fontWeight:700, color:orange, marginBottom:12, fontFamily:"'Outfit',sans-serif", display:'flex', alignItems:'center', gap:6 }}>
                            ⚡ Gaps to close
                          </div>
                          {careerResult.gaps.map((g,i) => (
                            <div key={i} style={{ fontSize:12, color:'#374151', lineHeight:1.5, marginBottom:8, display:'flex', gap:8 }}>
                              <span style={{ color:orange, flexShrink:0 }}>•</span>{g}
                            </div>
                          ))}
                        </div>
                      </div>

                      {careerResult.market_insight && (
                        <div style={{ background:'rgba(55,138,221,0.06)', borderRadius:12, padding:'16px 18px', border:`1px solid ${blue}20` }}>
                          <div style={{ fontSize:12, fontWeight:700, color:blue, marginBottom:5 }}>🇮🇳 India Market Insight</div>
                          <p style={{ fontSize:13, color:'#374151', lineHeight:1.5, margin:0 }}>{careerResult.market_insight}</p>
                        </div>
                      )}

                      {/* AI vulnerability */}
                      <div style={{ background:'rgba(124,58,237,0.06)', borderRadius:12, padding:'16px 18px', border:`1px solid ${purple}20` }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:purple }}>🤖 AI Vulnerability</div>
                          <span style={{ fontSize:12, fontWeight:700, color:purple, background:`${purple}15`, padding:'3px 10px', borderRadius:20 }}>{careerResult.ai_vulnerability_label}</span>
                        </div>
                        <div style={{ height:6, background:'rgba(124,58,237,0.15)', borderRadius:4, overflow:'hidden', marginBottom:8 }}>
                          <div style={{ width:`${careerResult.ai_vulnerability}%`, height:'100%', background:`linear-gradient(90deg,${purple}80,${purple})`, borderRadius:4 }}/>
                        </div>
                        <p style={{ fontSize:12, color:'#374151', lineHeight:1.5, margin:0 }}>{careerResult.ai_vulnerability_reason}</p>
                      </div>

                      {/* Quick wins */}
                      {careerResult.quick_wins.length > 0 && (
                        <div style={{ background:'#fff', borderRadius:14, padding:20, border:'1px solid #edf1f6', boxShadow:'0 2px 8px rgba(4,44,83,0.05)' }}>
                          <div style={{ fontSize:13, fontWeight:700, color:navy, marginBottom:12, fontFamily:"'Outfit',sans-serif" }}>⚡ Quick Wins</div>
                          {careerResult.quick_wins.map((w,i) => (
                            <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:10, padding:'10px 12px', borderRadius:9, background:i===0?'rgba(255,153,51,0.06)':'#fafbfd', border:`1px solid ${i===0?'rgba(255,153,51,0.2)':'#edf1f6'}` }}>
                              <div style={{ width:22, height:22, borderRadius:'50%', background:i===0?orange:'#edf1f6', color:i===0?'#fff':'#6b7c93', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, flexShrink:0 }}>{i+1}</div>
                              <span style={{ fontSize:12, color:'#374151', lineHeight:1.5 }}>{w}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Roast tab */}
                  {careerTab==='roast' && (
                    <div style={{ background:'linear-gradient(135deg,#3d0000,#1a0000)', borderRadius:14, padding:28, border:'1px solid rgba(226,75,74,0.3)', boxShadow:'0 4px 24px rgba(226,75,74,0.12)' }}>
                      <div style={{ marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:28, fontWeight:800, color:red }}>{Math.max(1,Math.round((100-careerResult.score)/12))}.{Math.round(Math.random()*9)}/10</div>
                        <div style={{ fontSize:13, color:'rgba(255,255,255,0.7)' }}>Roast score</div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                        {careerResult.roast_lines.map((line,i) => (
                          <div key={i} style={{ padding:'12px 16px', background:'rgba(0,0,0,0.3)', borderRadius:10, border:'1px solid rgba(226,75,74,0.2)' }}>
                            <div style={{ fontSize:13, color:'rgba(255,255,255,0.85)', lineHeight:1.6 }}>
                              <span style={{ color:red, marginRight:6 }}>{i+1}.</span>{line}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upgrade tab */}
                  {careerTab==='upgrade' && (
                    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                      {(careerResult.career_path_steps.length > 0 ? careerResult.career_path_steps : [
                        { timeframe:'Now — 2 weeks', focus:'Profile overhaul', actions:careerResult.quick_wins },
                        { timeframe:'Month 1', focus:'Skills & visibility', actions:careerResult.gaps.map(g => `Address: ${g}`) },
                        { timeframe:'Month 2–3', focus:'Active search', actions:['Apply to 5–10 matched roles daily', 'Prep for technical interviews', 'Grow LinkedIn network in target domain'] },
                      ]).map((step, i) => (
                        <div key={i} style={{ background:'#fff', borderRadius:14, padding:20, border:'1px solid #edf1f6', boxShadow:'0 2px 8px rgba(4,44,83,0.05)', display:'flex', gap:16 }}>
                          <div style={{ width:36, height:36, borderRadius:'50%', background:`${orange}15`, border:`2px solid ${orange}30`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Outfit',sans-serif", fontSize:14, fontWeight:800, color:orange, flexShrink:0 }}>{i+1}</div>
                          <div>
                            <div style={{ fontSize:11, color:'#9aafbc', marginBottom:3 }}>{step.timeframe}</div>
                            <div style={{ fontSize:13, fontWeight:700, color:navy, marginBottom:10, fontFamily:"'Outfit',sans-serif" }}>{step.focus}</div>
                            <ul style={{ margin:0, paddingLeft:16 }}>
                              {(step.actions || []).filter(Boolean).map((action,j) => (
                                <li key={j} style={{ fontSize:12, color:'#374151', lineHeight:1.6, marginBottom:4 }}>{action}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
