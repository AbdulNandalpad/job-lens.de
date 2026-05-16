'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCredits } from '@/lib/useCredits'
import CrossMarketModal from '@/components/CrossMarketModal'
import { CREDIT_COST, LOW_CREDIT_WARN, MARKET, SS, API } from '@/lib/constants'

const orange = '#ff9933'
const navy = '#042C53'
const blue = '#378ADD'
const green = '#1D9E75'
const red = '#E24B4A'

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

type Tab = 'overview' | 'keywords' | 'fixes'

function ScoreRing({ score, size = 100, label, color }: { score: number; size?: number; label: string; color: string }) {
  const r = (size / 2) - 9
  const circ = 2 * Math.PI * r
  const fill = circ * (1 - score / 100)
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(4,44,83,0.08)" strokeWidth={7}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
          strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }}/>
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
          fill={navy} fontSize={size * 0.22} fontWeight="700"
          style={{ transform: 'rotate(90deg)', transformOrigin: '50% 50%', fontFamily: "'Outfit',sans-serif" }}>
          {score}
        </text>
      </svg>
      <div style={{ fontSize: 11, color: '#6b7c93', marginTop: 4, fontFamily: "'DM Sans',sans-serif" }}>{label}</div>
    </div>
  )
}

function scoreColor(s: number) {
  return s >= 75 ? green : s >= 50 ? orange : red
}

function readinessBadge(r: string) {
  const map: Record<string, { bg: string; color: string }> = {
    'ATS Ready': { bg: 'rgba(29,158,117,0.12)', color: green },
    'Needs Work': { bg: 'rgba(255,153,51,0.12)', color: orange },
    'High Risk': { bg: 'rgba(226,75,74,0.12)', color: red },
  }
  return map[r] || map['Needs Work']
}

export default function IndiaCareerScanPage() {
  const router = useRouter()
  const [cvText, setCvText] = useState('')
  const [jdText, setJdText] = useState('')
  const [result, setResult] = useState<ATSResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<Tab>('overview')
  const [fileLoading, setFileLoading] = useState(false)
  const [showInputs, setShowInputs] = useState(true)
  const [prevScore, setPrevScore] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { credits, setCredits, needsCrossMarket, crossMarketAmount } = useCredits()
  const COST = CREDIT_COST.careerScan
  const [crossWarnPending, setCrossWarnPending] = useState<(() => void) | null>(null)

  useEffect(() => {
    const savedCv = sessionStorage.getItem(SS.cvText) || ''
    if (savedCv) setCvText(savedCv)
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
        const res = await fetch(API.extractPdf, { method: 'POST', body: form })
        const data = await res.json()
        if (data.text) { setCvText(data.text); sessionStorage.setItem(SS.cvText, data.text) }
        else alert(data.error || 'Could not read file.')
      } catch { alert('Failed to read file.') }
      setFileLoading(false)
    }
  }

  async function analyze() {
    if (!cvText.trim()) { alert('Please add your CV text first.'); return }
    if (!jdText.trim()) { alert('Please paste the job description.'); return }
    if (credits !== null && credits < COST) {
      alert(`You need ${COST} credits for an ATS scan. Please top up on the Account page.`)
      return
    }
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch(API.indiaCareerScan, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, jdText }),
      })
      if (res.status === 402) {
        const d = await res.json()
        if (typeof d.credits === 'number') setCredits(d.credits)
        alert('Not enough credits. Please top up on the Account page.')
        setLoading(false)
        return
      }
      const data = await res.json()
      if (data.error) { alert(data.error); setLoading(false); return }
      if (typeof data.creditsRemaining === 'number') setCredits(data.creditsRemaining)
      setPrevScore(result?.ats_score ?? null)
      setResult(data)
      setTab('overview')
      setShowInputs(false)
      try {
        sessionStorage.removeItem(SS.atsSuggestions)
        sessionStorage.setItem(SS.atsSuggestions, JSON.stringify({
          missing_keywords: data.missing_keywords || [],
          quick_fixes: data.quick_fixes || [],
          format_issues: data.format_issues || [],
          section_gaps: data.section_gaps || [],
        }))
      } catch {}
    } catch { alert('Analysis failed. Please try again.') }
    setLoading(false)
  }

  function handleAnalyze() {
    if (needsCrossMarket(COST, MARKET.in)) {
      setCrossWarnPending(() => analyze)
    } else {
      analyze()
    }
  }

  const badge = result ? readinessBadge(result.readiness) : null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        .ats-grid { display: grid; grid-template-columns: 420px 1fr; gap: 24px; }
        @media (max-width: 900px) { .ats-grid { grid-template-columns: 1fr; } }
      `}</style>

      {crossWarnPending && (
        <CrossMarketModal
          cost={COST}
          market={MARKET.in}
          crossAmount={crossMarketAmount(COST, MARKET.in)}
          onConfirm={() => { const fn = crossWarnPending; setCrossWarnPending(null); fn() }}
          onCancel={() => setCrossWarnPending(null)}
        />
      )}

      <div style={{ background: '#f0f4f8', minHeight: 'calc(100vh - 52px)', padding: '28px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: 24, paddingLeft: 14, borderLeft: `3px solid ${orange}` }}>
            <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 700, color: navy, margin: 0 }}>ATS Score</h1>
            <p style={{ fontSize: 13, color: '#6b7c93', margin: '4px 0 0' }}>
              Paste your CV and any job description — get an instant ATS compatibility score.
            </p>
          </div>

          <div className="ats-grid">

            {/* Left panel — inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Collapsed inputs summary (shown after scan) */}
              {result && (
                <div style={{ background: '#fff', borderRadius: 14, padding: '14px 20px', boxShadow: '0 2px 12px rgba(4,44,83,0.06)', border: '1px solid #edf1f6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 12, color: '#6b7c93', overflow: 'hidden' }}>
                      <span style={{ color: navy, fontWeight: 600 }}>JD: </span>
                      {jdText.slice(0, 100)}{jdText.length > 100 ? '…' : ''}
                    </div>
                    <button onClick={() => setShowInputs(s => !s)}
                      style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8, border: `1px solid ${blue}`, background: 'transparent', color: blue, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
                      {showInputs ? 'Hide' : 'Edit Inputs'}
                    </button>
                  </div>
                </div>
              )}

              {/* Full inputs — always shown when no result yet, toggle when result exists */}
              {(!result || showInputs) && (
                <>
                  {/* CV input */}
                  <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 2px 12px rgba(4,44,83,0.06)', border: '1px solid #edf1f6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: navy, fontFamily: "'Outfit',sans-serif" }}>Your CV</label>
                      <button onClick={() => fileRef.current?.click()}
                        style={{ fontSize: 11, padding: '4px 12px', borderRadius: 8, border: `1px solid ${blue}`, background: 'transparent', color: blue, cursor: 'pointer', fontWeight: 600 }}>
                        {fileLoading ? 'Reading...' : 'Upload PDF / DOCX'}
                      </button>
                      <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }}
                        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                    </div>
                    <textarea
                      value={cvText}
                      onChange={e => setCvText(e.target.value)}
                      placeholder="Paste your CV text here, or upload a file above..."
                      rows={10}
                      style={{ width: '100%', resize: 'vertical', padding: '10px 12px', borderRadius: 8, border: '1px solid #dce4ef', fontSize: 12, color: '#374151', fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6, outline: 'none', boxSizing: 'border-box' }}
                    />
                    {cvText && <div style={{ fontSize: 11, color: '#9aafbc', marginTop: 6 }}>{cvText.length.toLocaleString()} characters</div>}
                  </div>

                  {/* JD input */}
                  <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 2px 12px rgba(4,44,83,0.06)', border: '1px solid #edf1f6' }}>
                    <label style={{ fontSize: 13, fontWeight: 700, color: navy, fontFamily: "'Outfit',sans-serif", display: 'block', marginBottom: 10 }}>
                      Job Description
                      <span style={{ fontSize: 11, color: '#9aafbc', fontWeight: 400, marginLeft: 8 }}>From Naukri, LinkedIn, or any portal</span>
                    </label>
                    <textarea
                      value={jdText}
                      onChange={e => setJdText(e.target.value)}
                      placeholder="Paste the job description here..."
                      rows={8}
                      style={{ width: '100%', resize: 'vertical', padding: '10px 12px', borderRadius: 8, border: '1px solid #dce4ef', fontSize: 12, color: '#374151', fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* Credits + Analyze */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#9aafbc' }}>
                      {credits !== null ? `${credits} credits remaining` : ''} &mdash; costs {COST} credits
                    </span>
                    <button onClick={handleAnalyze} disabled={loading}
                      style={{ padding: '12px 28px', borderRadius: 10, background: loading ? '#ccc' : `linear-gradient(135deg, ${orange}, #e67300)`, color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 16px rgba(255,153,51,0.4)', transition: 'all 0.2s' }}>
                      {loading ? 'Analyzing...' : result ? 'Re-scan' : 'Scan ATS Score'}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Right panel — results */}
            <div>
              {!result && !loading && (
                <div style={{ background: '#fff', borderRadius: 14, padding: 40, textAlign: 'center', border: '1px solid #edf1f6', boxShadow: '0 2px 12px rgba(4,44,83,0.06)', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  <div style={{ fontSize: 48, opacity: 0.3 }}>87</div>
                  <p style={{ fontSize: 14, color: '#9aafbc', maxWidth: 280, lineHeight: 1.6 }}>
                    Add your CV and a job description, then click <strong>Scan ATS Score</strong> to see your results.
                  </p>
                </div>
              )}

              {loading && (
                <div style={{ background: '#fff', borderRadius: 14, padding: 40, textAlign: 'center', border: '1px solid #edf1f6', boxShadow: '0 2px 12px rgba(4,44,83,0.06)', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', border: `3px solid ${orange}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  <p style={{ fontSize: 13, color: '#6b7c93' }}>Scanning your CV against ATS criteria...</p>
                </div>
              )}

              {result && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Score overview card */}
                  <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #edf1f6', boxShadow: '0 2px 12px rgba(4,44,83,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 12, color: '#9aafbc', marginBottom: 4 }}>Overall ATS Score</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 40, fontWeight: 800, color: scoreColor(result.ats_score) }}>{result.ats_score}</span>
                          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 18, color: '#9aafbc' }}>/100</span>
                          {prevScore !== null && (
                            <span style={{ fontSize: 13, fontWeight: 700, color: result.ats_score > prevScore ? green : result.ats_score < prevScore ? red : '#9aafbc', padding: '3px 10px', borderRadius: 12, background: result.ats_score > prevScore ? 'rgba(29,158,117,0.1)' : 'rgba(226,75,74,0.1)' }}>
                              {result.ats_score > prevScore ? `+${result.ats_score - prevScore}` : result.ats_score < prevScore ? `-${prevScore - result.ats_score}` : '='} from last scan
                            </span>
                          )}
                        </div>
                        {badge && (
                          <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, background: badge.bg, color: badge.color, fontSize: 12, fontWeight: 700, marginTop: 6 }}>
                            {result.readiness}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <ScoreRing score={result.keyword_score} size={80} label="Keywords" color={scoreColor(result.keyword_score)} />
                        <ScoreRing score={result.format_score} size={80} label="Format" color={scoreColor(result.format_score)} />
                        <ScoreRing score={result.section_score} size={80} label="Sections" color={scoreColor(result.section_score)} />
                        <ScoreRing score={result.impact_score} size={80} label="Impact" color={scoreColor(result.impact_score)} />
                      </div>
                    </div>
                    <div style={{ padding: '12px 16px', background: '#fafbfd', borderRadius: 8, fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                      {result.headline}
                    </div>
                    {result.top_missing_keyword && (
                      <div style={{ marginTop: 10, padding: '8px 14px', background: 'rgba(226,75,74,0.08)', borderRadius: 8, fontSize: 12, color: red }}>
                        <strong>Top priority:</strong> Add "{result.top_missing_keyword}" to your CV — this is the most impactful missing keyword.
                      </div>
                    )}

                    {/* Fix my CV CTA */}
                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => {
                          try {
                            sessionStorage.setItem(SS.cvText, cvText)
                            sessionStorage.setItem(SS.atsSuggestions, JSON.stringify({
                              missing_keywords: result.missing_keywords,
                              quick_fixes: result.quick_fixes,
                            }))
                          } catch {}
                          router.push('/in/cv-builder')
                        }}
                        style={{ padding: '10px 20px', borderRadius: 9, background: `linear-gradient(135deg, ${orange}, #e67300)`, color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', boxShadow: '0 3px 12px rgba(255,153,51,0.35)', fontFamily: "'Outfit',sans-serif" }}>
                        Fix my CV based on these suggestions →
                      </button>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['overview', 'keywords', 'fixes'] as Tab[]).map(t => (
                      <button key={t} onClick={() => setTab(t)}
                        style={{ padding: '7px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: tab === t ? orange : '#fff', color: tab === t ? '#fff' : '#6b7c93', boxShadow: tab === t ? '0 2px 8px rgba(255,153,51,0.3)' : '0 1px 4px rgba(4,44,83,0.06)' }}>
                        {t === 'overview' ? 'Overview' : t === 'keywords' ? 'Keywords' : 'Quick Fixes'}
                      </button>
                    ))}
                  </div>

                  {/* Tab content */}
                  <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #edf1f6', boxShadow: '0 2px 12px rgba(4,44,83,0.06)' }}>

                    {tab === 'overview' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {result.format_issues.length > 0 && (
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: navy, marginBottom: 10, fontFamily: "'Outfit',sans-serif" }}>Format Issues</div>
                            {result.format_issues.map((issue, i) => (
                              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                                <span style={{ color: red, fontSize: 14, flexShrink: 0, marginTop: 1 }}>!</span>
                                <span style={{ fontSize: 13, color: '#374151' }}>{issue}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {result.section_gaps.length > 0 && (
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: navy, marginBottom: 10, fontFamily: "'Outfit',sans-serif" }}>Section Gaps</div>
                            {result.section_gaps.map((gap, i) => (
                              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                                <span style={{ color: orange, fontSize: 14, flexShrink: 0, marginTop: 1 }}>~</span>
                                <span style={{ fontSize: 13, color: '#374151' }}>{gap}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {result.ats_verdict && (
                          <div style={{ padding: '14px 16px', background: 'rgba(4,44,83,0.04)', borderRadius: 10, border: '1px solid #edf1f6' }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: navy, marginBottom: 6, fontFamily: "'Outfit',sans-serif" }}>ATS Verdict</div>
                            <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0 }}>{result.ats_verdict}</p>
                          </div>
                        )}
                        {result.rewrite_suggestions.length > 0 && (
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: navy, marginBottom: 10, fontFamily: "'Outfit',sans-serif" }}>Bullet Rewrites</div>
                            {result.rewrite_suggestions.map((s, i) => (
                              <div key={i} style={{ marginBottom: 14, padding: 14, borderRadius: 10, background: '#fafbfd', border: '1px solid #edf1f6' }}>
                                <div style={{ fontSize: 11, color: red, fontWeight: 700, marginBottom: 4 }}>BEFORE</div>
                                <div style={{ fontSize: 12, color: '#6b7c93', marginBottom: 10, fontStyle: 'italic' }}>{s.original}</div>
                                <div style={{ fontSize: 11, color: green, fontWeight: 700, marginBottom: 4 }}>AFTER</div>
                                <div style={{ fontSize: 12, color: '#1a2332' }}>{s.improved}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {tab === 'keywords' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {result.missing_keywords.length > 0 && (
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: navy, marginBottom: 10, fontFamily: "'Outfit',sans-serif" }}>
                              Missing Keywords <span style={{ fontSize: 11, color: red, fontWeight: 400 }}>({result.missing_keywords.length} — add these to your CV)</span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              {result.missing_keywords.map((kw, i) => (
                                <span key={i} style={{ padding: '5px 12px', borderRadius: 20, background: 'rgba(226,75,74,0.1)', border: '1px solid rgba(226,75,74,0.25)', fontSize: 12, color: red, fontWeight: 500 }}>{kw}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {result.matched_keywords.length > 0 && (
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: navy, marginBottom: 10, fontFamily: "'Outfit',sans-serif" }}>
                              Matched Keywords <span style={{ fontSize: 11, color: green, fontWeight: 400 }}>({result.matched_keywords.length} found)</span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              {result.matched_keywords.map((kw, i) => (
                                <span key={i} style={{ padding: '5px 12px', borderRadius: 20, background: 'rgba(29,158,117,0.1)', border: '1px solid rgba(29,158,117,0.25)', fontSize: 12, color: green, fontWeight: 500 }}>{kw}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {tab === 'fixes' && (
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: navy, marginBottom: 14, fontFamily: "'Outfit',sans-serif" }}>
                          Top 5 Quick Fixes
                          <span style={{ fontSize: 11, color: '#9aafbc', fontWeight: 400, marginLeft: 8 }}>Do these before applying</span>
                        </div>
                        {result.quick_fixes.map((fix, i) => (
                          <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14, padding: '12px 14px', borderRadius: 10, background: i === 0 ? 'rgba(255,153,51,0.06)' : '#fafbfd', border: `1px solid ${i === 0 ? 'rgba(255,153,51,0.2)' : '#edf1f6'}` }}>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: i === 0 ? orange : '#edf1f6', color: i === 0 ? '#fff' : '#6b7c93', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                              {i + 1}
                            </div>
                            <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{fix}</span>
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
      </div>
    </>
  )
}
