'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCredits } from '@/lib/useCredits'
import { useCurrentCv } from '@/lib/useCurrentCv'
import { readJob } from '@/lib/job'
import { cvTextFromTailored } from '@/lib/cv'
import { readJsonOrError, toUserMessage } from '@/lib/apiError'
import CrossMarketModal from '@/components/CrossMarketModal'
import FlowError from '@/components/FlowError'
import { CREDIT_COST, MARKET, SS, API } from '@/lib/constants'
import SvgIcon from '@/components/SvgIcon'
import CareerCard from '@/components/CareerCard'

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
  domain_mismatch: boolean
  mismatch_message: string
  creditsRemaining: number
}

type Tab = 'overview' | 'keywords' | 'fixes'

function ScoreRing({ score, size = 100, label, color }: { score: number; size?: number; label: string; color: string }) {
  const r = (size / 2) - 9
  const circ = 2 * Math.PI * r
  const fill = circ * (1 - score / 100)
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(4,44,83,0.08)" strokeWidth={7}/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
            strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }}/>
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: Math.round(size * 0.22), fontWeight: 700, color: navy, fontFamily: "'Outfit',sans-serif", lineHeight: 1 }}>
          {score}
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#6b7c93', marginTop: 4, fontFamily: "'DM Sans',sans-serif" }}>{label}</div>
    </div>
  )
}

function scoreColor(s: number) {
  return s >= 75 ? green : s >= 50 ? orange : red
}

/** Collapsible section for mobile — invisible chrome on desktop */
function AtsSection({ title, defaultOpen = true, children }: {
  title: string; defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button className="ats-acc-btn" onClick={() => setOpen(o => !o)}>
        <span>{title}</span>
        <span style={{ fontSize: 10, display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
      </button>
      <div className={open ? 'ats-acc-body' : 'ats-acc-body ats-acc-closed'}>
        {children}
      </div>
    </div>
  )
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
  const { cvText, fileName, source: cvSource, rememberedConsent, setCv, clearCv, extractFile } = useCurrentCv()
  // Textarea buffer: setCv() trims, which would eat a trailing newline mid-edit — the hook's cvText stays the truth.
  const [cvDraft, setCvDraft] = useState('')
  const [saveConsent, setSaveConsent] = useState(false)
  const [cvNotice, setCvNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [scanError, setScanError] = useState<{ message: string; topUp?: boolean } | null>(null)
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
  const [jobFromSearch, setJobFromSearch] = useState<{ title: string; employer: string } | null>(null)
  // Set only when arriving from the CV Builder's "ATS Check": scan the generated CV without replacing the user's own CV.
  const [tailoredCv, setTailoredCv] = useState('')
  const scanCv = tailoredCv || cvText

  useEffect(() => { setCvDraft(d => (d.trim() === cvText.trim() ? d : cvText)) }, [cvText])
  useEffect(() => { setSaveConsent(rememberedConsent) }, [rememberedConsent])

  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get('cv') === 'tailored') {
        setTailoredCv(cvTextFromTailored(sessionStorage.getItem(SS.cvbTailored) || ''))
      }
    } catch {}
    // Pre-fill JD when coming from jobs page
    const job = readJob()
    if (job?.job_description) {
      setJdText(job.job_description)
      setJobFromSearch({ title: job.job_title, employer: job.employer_name })
    }
  }, [])

  function showSaveOutcome(out: { saved: boolean; error?: string }) {
    setCvNotice(out.saved ? { kind: 'ok', text: 'Saved to your account' } : { kind: 'error', text: `Could not save: ${out.error || 'unknown error'}` })
  }

  async function handleFile(file: File) {
    setCvNotice(null)
    setFileLoading(true)
    const extracted = await extractFile(file)
    if ('error' in extracted) {
      setCvNotice({ kind: 'error', text: extracted.error })
    } else if (extracted.text.trim().length < 50) {
      setCvNotice({ kind: 'error', text: 'That file has too little text to be a CV — try another file or paste the text.' })
    } else {
      const out = await setCv(extracted.text, file.name, { saveToAccount: saveConsent })
      if (saveConsent) showSaveOutcome(out)
    }
    setFileLoading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  function onCvTextChange(value: string) {
    setCvDraft(value)
    setCvNotice(null)
    void setCv(value, value.trim() ? fileName : '')
  }

  // Ticking the box after a paste/upload saves the CV that is already here — the tick is the consent.
  async function onConsentChange(checked: boolean) {
    setSaveConsent(checked)
    if (!checked || cvSource !== 'session' || !cvText.trim()) return
    showSaveOutcome(await setCv(cvText, fileName, { saveToAccount: true }))
  }

  // Session upload → clearCv() falls back to the account CV (if any). For the account CV itself,
  // clearCv() would re-adopt it at once, so "Remove" detaches it for this session via an empty session CV.
  function removeSessionCv() { clearCv(); setCvNotice(null); if (fileRef.current) fileRef.current.value = '' }
  function detachSavedCv() { void setCv('', ''); setCvNotice(null) }

  async function analyze() {
    if (!scanCv.trim()) { setScanError({ message: 'Please add your CV text first.' }); return }
    if (!jdText.trim()) { setScanError({ message: 'Please paste the job description.' }); return }
    if (credits !== null && credits < COST) {
      setScanError({ message: `You need ${COST} credits for an ATS scan.`, topUp: true })
      return
    }
    setScanError(null)
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch(API.indiaCareerScan, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText: scanCv, jdText }),
      })
      const out = await readJsonOrError<ATSResult & { error?: string }>(res)
      if (!out.ok) {
        if (typeof out.credits === 'number') setCredits(out.credits)
        setScanError({ message: out.message, topUp: out.status === 402 })
        setLoading(false)
        return
      }
      const data = out.data
      if (data.error) { setScanError({ message: data.error }); setLoading(false); return }
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
    } catch (err) { setScanError({ message: toUserMessage(err) }) }
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
        @keyframes spin { to { transform: rotate(360deg); } }
        .ats-grid { display: grid; grid-template-columns: 420px 1fr; gap: 24px; }
        @media (max-width: 900px) { .ats-grid { grid-template-columns: 1fr; } }

        /* Sub-score rings: 1 row on desktop, 2×2 grid on mobile */
        .ats-rings { display: flex; gap: 16px; flex-wrap: wrap; }
        @media (max-width: 600px) {
          .ats-rings { display: grid !important; grid-template-columns: 1fr 1fr; gap: 12px; justify-items: center; }
        }

        /* Mobile accordion for tab content sections */
        .ats-acc-btn { display: none !important; }
        .ats-acc-body { display: block; }
        @media (max-width: 900px) {
          .ats-acc-btn {
            display: flex !important; width: 100%;
            align-items: center; justify-content: space-between;
            padding: 11px 14px; border: none; border-radius: 10px;
            background: #f0f4f8; cursor: pointer;
            font-size: 13px; font-weight: 700; color: #042C53;
            font-family: 'Outfit',sans-serif; text-align: left;
            margin-bottom: 8px; border: 1px solid #dce4ef;
          }
          .ats-acc-body.ats-acc-closed { display: none !important; }
        }
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

              {(!result || showInputs) && (
                <>
                  {/* CV input */}
                  <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 2px 12px rgba(4,44,83,0.06)', border: '1px solid #edf1f6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: navy, fontFamily: "'Outfit',sans-serif" }}>Your CV</label>
                      {(cvSource !== 'saved' || fileLoading) && (
                        <button onClick={() => fileRef.current?.click()} disabled={fileLoading}
                          style={{ fontSize: 11, padding: '4px 12px', borderRadius: 8, border: `1px solid ${blue}`, background: 'transparent', color: blue, cursor: fileLoading ? 'wait' : 'pointer', fontWeight: 600 }}>
                          {fileLoading ? 'Reading your CV…' : 'Upload your CV'}
                        </button>
                      )}
                      <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }}
                        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                    </div>

                    {cvSource === 'saved' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${green}`, background: 'rgba(29,158,117,0.08)', marginBottom: 10 }}>
                        <SvgIcon name="document" size={18} color={green} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: green, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                            {fileName ? `CV on file: ${fileName}` : 'Using your saved CV'}
                          </div>
                          {fileName && <div style={{ fontSize: 11, color: green, marginTop: 2 }}>Using your saved CV</div>}
                        </div>
                        <button type="button" onClick={() => fileRef.current?.click()} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, border: `1px solid ${green}`, background: 'transparent', color: green, cursor: 'pointer', fontWeight: 600 }}>Replace</button>
                        <button type="button" onClick={detachSavedCv} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, border: '1px solid #dce4ef', background: 'transparent', color: '#6b7c93', cursor: 'pointer', fontWeight: 600 }}>Remove</button>
                      </div>
                    ) : (
                      <>
                        {fileName && cvText && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', borderRadius: 10, border: '1px solid #dce4ef', background: '#fafbfd', marginBottom: 10 }}>
                            <SvgIcon name="document" size={16} color={navy} />
                            <div style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, color: navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>CV on file: {fileName}</div>
                            <button type="button" onClick={removeSessionCv} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 8, border: '1px solid #dce4ef', background: 'transparent', color: '#6b7c93', cursor: 'pointer', fontWeight: 600 }}>Remove</button>
                          </div>
                        )}
                        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 11, color: '#6b7c93', lineHeight: 1.4, cursor: 'pointer', marginBottom: 10 }}>
                          <input type="checkbox" checked={saveConsent} onChange={e => onConsentChange(e.target.checked)} style={{ marginTop: 1, accentColor: orange, flexShrink: 0 }} />
                          <span>Save to my account for next time</span>
                        </label>
                      </>
                    )}

                    {cvNotice && (
                      <div style={{ marginBottom: 10 }}>
                        {cvNotice.kind === 'ok'
                          ? <div style={{ fontSize: 11, color: green, display: 'flex', alignItems: 'center', gap: 6 }}><SvgIcon name="check-circle" size={13} color={green} />{cvNotice.text}</div>
                          : <FlowError compact message={cvNotice.text} />}
                      </div>
                    )}

                    <textarea
                      value={cvDraft}
                      onChange={e => onCvTextChange(e.target.value)}
                      placeholder="Paste your CV text here, or upload a file above (PDF, DOCX or TXT)..."
                      rows={10}
                      style={{ width: '100%', resize: 'vertical', padding: '10px 12px', borderRadius: 8, border: '1px solid #dce4ef', fontSize: 12, color: '#374151', fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6, outline: 'none', boxSizing: 'border-box' }}
                    />
                    {cvText && <div style={{ fontSize: 11, color: '#9aafbc', marginTop: 6 }}>{cvText.length.toLocaleString()} characters</div>}
                    {tailoredCv && (
                      <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,153,51,0.1)', border: '1px solid rgba(255,153,51,0.35)', fontSize: 11, color: '#042C53', lineHeight: 1.5 }}>
                        Scanning your tailored CV from the CV Builder.{' '}
                        <button type="button" onClick={() => setTailoredCv('')} style={{ background: 'none', border: 'none', padding: 0, color: '#e67300', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>Scan my original CV instead</button>
                      </div>
                    )}
                  </div>

                  {/* JD input */}
                  <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 2px 12px rgba(4,44,83,0.06)', border: `1px solid ${jobFromSearch ? orange + '40' : '#edf1f6'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: navy, fontFamily: "'Outfit',sans-serif" }}>
                        Job Description
                      </label>
                      {jobFromSearch ? (
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 10, background: orange + '18', color: orange, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                          ✓ {jobFromSearch.employer} — {jobFromSearch.title}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: '#9aafbc' }}>From Naukri, LinkedIn, or any portal</span>
                      )}
                    </div>
                    <textarea
                      value={jdText}
                      onChange={e => { setJdText(e.target.value); if (jobFromSearch) setJobFromSearch(null) }}
                      placeholder="Paste the job description here..."
                      rows={8}
                      style={{ width: '100%', resize: 'vertical', padding: '10px 12px', borderRadius: 8, border: '1px solid #dce4ef', fontSize: 12, color: '#374151', fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  {scanError && (
                    <FlowError
                      message={scanError.message}
                      onRetry={scanError.topUp ? undefined : () => { setScanError(null); handleAnalyze() }}
                      secondary={scanError.topUp ? { label: 'Top up credits', href: '/in/account' } : undefined}
                    />
                  )}

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

                  {/* Domain mismatch — shown instead of normal results */}
                  {result.domain_mismatch && (
                    <div style={{ background: '#fff', borderRadius: 14, border: `2px solid ${red}`, boxShadow: '0 2px 12px rgba(226,75,74,0.12)', overflow: 'hidden' }}>
                      <div style={{ background: red, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <SvgIcon name="megaphone" size={28} color="#fff" />
                        <div>
                          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 800, color: '#fff' }}>Wrong domain — this CV doesn&apos;t match this role</div>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>ATS Score: {result.ats_score} / 100</div>
                        </div>
                      </div>
                      <div style={{ padding: '20px 24px' }}>
                        <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, margin: 0 }}>{result.mismatch_message}</p>
                      </div>
                    </div>
                  )}

                  {/* Score overview card — hidden when domain mismatch */}
                  {!result.domain_mismatch && (<>
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
                      <div className="ats-rings">
                        <ScoreRing score={result.keyword_score} size={76} label="Keywords" color={scoreColor(result.keyword_score)} />
                        <ScoreRing score={result.format_score} size={76} label="Format" color={scoreColor(result.format_score)} />
                        <ScoreRing score={result.section_score} size={76} label="Sections" color={scoreColor(result.section_score)} />
                        <ScoreRing score={result.impact_score} size={76} label="Impact" color={scoreColor(result.impact_score)} />
                      </div>
                    </div>
                    <div style={{ padding: '12px 16px', background: '#fafbfd', borderRadius: 8, fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                      {result.headline}
                    </div>
                    {result.top_missing_keyword && (
                      <div style={{ marginTop: 10, padding: '8px 14px', background: 'rgba(226,75,74,0.08)', borderRadius: 8, fontSize: 12, color: red }}>
                        <strong>Top priority:</strong> Add &ldquo;{result.top_missing_keyword}&rdquo; to your CV — this is the most impactful missing keyword.
                      </div>
                    )}

                    {/* Fix my CV CTA */}
                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => {
                          // The CV itself is already shared via useCurrentCv — only this page's output goes here
                          try {
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

                  {/* Career Card — share PNG + download PDF */}
                  <CareerCard data={{
                    score: result.ats_score,
                    readiness: result.readiness,
                    headline: result.headline,
                    strengths: result.matched_keywords.slice(0, 3),
                    market: 'in',
                    gaps: result.section_gaps,
                    quick_wins: result.quick_fixes,
                  }} />

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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {result.format_issues.length > 0 && (
                          <AtsSection title={`Format Issues (${result.format_issues.length})`} defaultOpen={true}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {result.format_issues.map((issue, i) => (
                                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', background: 'rgba(226,75,74,0.05)', borderRadius: 8, borderLeft: `3px solid ${red}` }}>
                                  <span style={{ color: red, fontSize: 14, flexShrink: 0 }}>!</span>
                                  <span style={{ fontSize: 13, color: '#374151' }}>{issue}</span>
                                </div>
                              ))}
                            </div>
                          </AtsSection>
                        )}
                        {result.section_gaps.length > 0 && (
                          <AtsSection title={`Section Gaps (${result.section_gaps.length})`} defaultOpen={true}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {result.section_gaps.map((gap, i) => (
                                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', background: 'rgba(255,153,51,0.06)', borderRadius: 8, borderLeft: `3px solid ${orange}` }}>
                                  <span style={{ color: orange, fontSize: 14, flexShrink: 0 }}>~</span>
                                  <span style={{ fontSize: 13, color: '#374151' }}>{gap}</span>
                                </div>
                              ))}
                            </div>
                          </AtsSection>
                        )}
                        {result.ats_verdict && (
                          <AtsSection title="ATS Verdict" defaultOpen={true}>
                            <div style={{ padding: '14px 16px', background: 'rgba(4,44,83,0.04)', borderRadius: 10, border: '1px solid #edf1f6' }}>
                              <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0 }}>{result.ats_verdict}</p>
                            </div>
                          </AtsSection>
                        )}
                        {result.rewrite_suggestions.length > 0 && (
                          <AtsSection title={`Bullet Rewrites (${result.rewrite_suggestions.length})`} defaultOpen={false}>
                            {result.rewrite_suggestions.map((s, i) => (
                              <div key={i} style={{ marginBottom: 14, padding: 14, borderRadius: 10, background: '#fafbfd', border: '1px solid #edf1f6' }}>
                                <div style={{ fontSize: 11, color: red, fontWeight: 700, marginBottom: 4 }}>BEFORE</div>
                                <div style={{ fontSize: 12, color: '#6b7c93', marginBottom: 10, fontStyle: 'italic' }}>{s.original}</div>
                                <div style={{ fontSize: 11, color: green, fontWeight: 700, marginBottom: 4 }}>AFTER</div>
                                <div style={{ fontSize: 12, color: '#1a2332' }}>{s.improved}</div>
                              </div>
                            ))}
                          </AtsSection>
                        )}
                      </div>
                    )}

                    {tab === 'keywords' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {result.missing_keywords.length > 0 && (
                          <AtsSection title={`Missing Keywords — ${result.missing_keywords.length} to add`} defaultOpen={true}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingBottom: 4 }}>
                              {result.missing_keywords.map((kw, i) => (
                                <span key={i} style={{ padding: '5px 12px', borderRadius: 20, background: 'rgba(226,75,74,0.1)', border: '1px solid rgba(226,75,74,0.25)', fontSize: 12, color: red, fontWeight: 500 }}>{kw}</span>
                              ))}
                            </div>
                          </AtsSection>
                        )}
                        {result.matched_keywords.length > 0 && (
                          <AtsSection title={`Matched Keywords — ${result.matched_keywords.length} found`} defaultOpen={true}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingBottom: 4 }}>
                              {result.matched_keywords.map((kw, i) => (
                                <span key={i} style={{ padding: '5px 12px', borderRadius: 20, background: 'rgba(29,158,117,0.1)', border: '1px solid rgba(29,158,117,0.25)', fontSize: 12, color: green, fontWeight: 500 }}>{kw}</span>
                              ))}
                            </div>
                          </AtsSection>
                        )}
                      </div>
                    )}

                    {tab === 'fixes' && (
                      <AtsSection title="Top Quick Fixes — do these before applying" defaultOpen={true}>
                        {result.quick_fixes.map((fix, i) => (
                          <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14, padding: '12px 14px', borderRadius: 10, background: i === 0 ? 'rgba(255,153,51,0.06)' : '#fafbfd', border: `1px solid ${i === 0 ? 'rgba(255,153,51,0.2)' : '#edf1f6'}` }}>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: i === 0 ? orange : '#edf1f6', color: i === 0 ? '#fff' : '#6b7c93', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                              {i + 1}
                            </div>
                            <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{fix}</span>
                          </div>
                        ))}
                      </AtsSection>
                    )}
                  </div>
                </>)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
