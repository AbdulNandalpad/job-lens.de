'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import NavbarIndia from '../components/NavbarIndia'
import type { FieldMapping, AnalyzeResult, ExecuteEvent } from '@/lib/auto-apply-engine'
import { theme } from '@/lib/theme'
import SvgIcon from '@/components/SvgIcon'
import AutoApplyDemoWidget from '@/components/AutoApplyDemoWidget'

const { colors: c, fonts: f } = theme
const ACCENT = '#FF9933'
const ACCENT_LIGHT = '#FF993318'
const ACCENT_BORDER = '#FF993340'

type Phase = 'idle' | 'analyzing' | 'review' | 'executing' | 'done'
type Mode  = 'demo' | 'active'

interface LogEntry {
  id: number
  type: ExecuteEvent['type']
  message: string
  b64?: string
  success?: boolean
}

function flattenCvJson(raw: string): string {
  if (!raw) return ''
  try {
    const d = JSON.parse(raw)
    if (typeof d !== 'object' || !d.name) return raw
    const lines: string[] = []
    if (d.name) lines.push(d.name)
    if (d.title) lines.push(d.title)
    if (d.email) lines.push(`Email: ${d.email}`)
    if (d.phone) lines.push(`Phone: ${d.phone}`)
    if (d.location) lines.push(`Location: ${d.location}`)
    if (Array.isArray(d.experience) && d.experience.length) {
      lines.push('\nExperience:')
      d.experience.forEach((e: { role?: string; company?: string; period?: string; bullets?: string[] }) => {
        lines.push(`${e.role} at ${e.company} (${e.period})`)
        if (Array.isArray(e.bullets)) e.bullets.forEach((b: string) => lines.push(`  - ${b}`))
      })
    }
    if (Array.isArray(d.skills) && d.skills.length)
      lines.push(`\nSkills: ${d.skills.map((s: { name?: string }) => s.name).join(', ')}`)
    return lines.join('\n')
  } catch {
    return raw
  }
}

export default function InAutoApplyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<Mode>('demo')

  const [jobUrl, setJobUrl] = useState('')
  const [cvText, setCvText] = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [useCoverLetter, setUseCoverLetter] = useState(false)

  const [cvUploading, setCvUploading] = useState(false)
  const [cvUploadError, setCvUploadError] = useState('')

  async function handleCvUpload(file: File) {
    setCvUploading(true)
    setCvUploadError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/extract-pdf', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setCvText(data.text || '')
    } catch (err) {
      setCvUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setCvUploading(false)
    }
  }

  const [phase, setPhase] = useState<Phase>('idle')
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null)
  const [mapping, setMapping] = useState<FieldMapping[]>([])
  const [log, setLog] = useState<LogEntry[]>([])
  const [liveShot, setLiveShot] = useState('')
  const [error, setError] = useState('')
  const logRef = useRef<HTMLDivElement>(null)
  const logCounter = useRef(0)

  useEffect(() => {
    const raw =
      sessionStorage.getItem('jl_cvb_tailored') ||
      sessionStorage.getItem('jl_sjs_cv_text') ||
      sessionStorage.getItem('jl_cv_text') || ''
    setCvText(flattenCvJson(raw))
    const cl = sessionStorage.getItem('jl_cl_letter') || ''
    setCoverLetter(cl)
    if (cl) setUseCoverLetter(true)
  }, [])

  useEffect(() => {
    if (searchParams.get('demo') === '1') {
      setJobUrl(`${window.location.origin}/in/auto-apply/demo-form`)
      setMode('active')
    }
  }, [searchParams])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [log])

  async function handleAnalyse() {
    if (!jobUrl.trim()) { setError('Please enter the application URL.'); return }
    if (!cvText.trim()) { setError('No CV found. Please complete the CV Builder first.'); return }
    setError('')
    setPhase('analyzing')
    setAnalyzeResult(null)
    setMapping([])

    try {
      const res = await fetch('/api/auto-apply/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobUrl: jobUrl.trim(),
          cvText,
          coverLetter: useCoverLetter ? coverLetter : '',
          market: 'in',
        }),
      })
      const data: AnalyzeResult = await res.json()
      if (!res.ok) throw new Error((data as unknown as { error: string }).error || 'Analysis failed')

      setAnalyzeResult(data)
      setMapping(data.mapping)
      setPhase(data.hasForm ? 'review' : 'idle')
      if (!data.hasForm) setError(data.error || 'No form detected.')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setPhase('idle')
    }
  }

  function updateValue(idx: number, value: string) {
    setMapping(prev => prev.map((m, i) => (i === idx ? { ...m, value } : m)))
  }

  async function handleExecute() {
    setPhase('executing')
    setLog([])
    setLiveShot('')

    const addLog = (entry: Omit<LogEntry, 'id'>) => {
      const id = ++logCounter.current
      setLog(prev => [...prev, { ...entry, id }])
    }

    try {
      const res = await fetch('/api/auto-apply/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobUrl: jobUrl.trim(), mapping, cvText, coverLetter: useCoverLetter ? coverLetter : '' }),
      })
      if (!res.ok) throw new Error('Stream request failed')
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''

        for (const part of parts) {
          const line = part.replace(/^data: /, '').trim()
          if (!line) continue
          try {
            const ev: ExecuteEvent = JSON.parse(line)
            switch (ev.type) {
              case 'log':        addLog({ type: 'log', message: ev.message }); break
              case 'screenshot': setLiveShot(ev.b64); addLog({ type: 'screenshot', message: ev.message, b64: ev.b64 }); break
              case 'filling':    addLog({ type: 'filling', message: `Filling "${ev.label}" → ${ev.value.slice(0, 40)}` }); break
              case 'filled':     addLog({ type: 'filled', message: `"${ev.label}" ${ev.success ? 'filled' : 'skipped'}`, success: ev.success }); break
              case 'submitting': addLog({ type: 'submitting', message: 'Clicking submit button...' }); break
              case 'done':       setLiveShot(ev.confirmB64); addLog({ type: 'done', message: ev.message }); setPhase('done'); break
              case 'error':      addLog({ type: 'error', message: ev.message }); if (ev.b64) setLiveShot(ev.b64); setPhase('review'); break
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      setLog(prev => [...prev, { id: ++logCounter.current, type: 'error', message: String(err) }])
      setPhase('review')
    }
  }

  function logToTracker() {
    const existing = JSON.parse(localStorage.getItem('jl_tracker') || '[]')
    const entry = {
      id: Date.now(),
      role: 'Applied via Auto Apply',
      company: new URL(jobUrl).hostname.replace('www.', ''),
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      notes: `Auto Apply — ${jobUrl.slice(0, 60)}`,
      source: 'Auto Apply',
    }
    localStorage.setItem('jl_tracker', JSON.stringify([entry, ...existing]))
    router.push('/in/tracker')
  }

  const card: React.CSSProperties = { background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden' }
  const cardHead: React.CSSProperties = {
    padding: '12px 16px', borderBottom: `1px solid ${c.border}`,
    fontSize: 13, fontWeight: 700, color: c.primary, fontFamily: f.heading,
    borderLeft: `3px solid ${ACCENT}`,
  }

  const confidenceBadge = (conf: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      high:   { bg: c.successLight, color: c.success },
      medium: { bg: c.warningLight, color: c.warning },
      low:    { bg: c.errorLight,   color: c.error },
    }
    const s = map[conf] || map.low
    return <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700, background: s.bg, color: s.color }}>{conf}</span>
  }

  const isUrlValid = jobUrl.trim().startsWith('http')
  const hasCv = cvText.trim().length > 50

  return (
    <div style={{ minHeight: '100vh', background: c.bg, fontFamily: f.body }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        .ina-input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1.5px solid ${c.borderLight}; font-size: 13px; font-family: inherit; outline: none; color: ${c.text}; box-sizing: border-box; transition: border-color 0.15s; background: transparent; }
        .ina-input:focus { border-color: ${ACCENT}; }
        .ina-btn-primary { padding: 11px 28px; border-radius: 9px; background: linear-gradient(135deg, ${ACCENT}, #e08020); color: #fff; border: none; cursor: pointer; font-family: ${f.heading}; font-size: 14px; font-weight: 700; transition: opacity 0.15s; }
        .ina-btn-primary:hover { opacity: 0.9; }
        .ina-btn-primary:disabled { background: ${c.border}; color: ${c.textFaint}; cursor: not-allowed; }
        .ina-btn-outline { padding: 10px 20px; border-radius: 9px; background: ${c.bgCard}; color: ${ACCENT}; border: 1.5px solid ${ACCENT}; cursor: pointer; font-family: ${f.heading}; font-size: 13px; font-weight: 700; }
        .ina-btn-success { padding: 11px 28px; border-radius: 9px; background: ${c.success}; color: #fff; border: none; cursor: pointer; font-family: ${f.heading}; font-size: 14px; font-weight: 700; }
        .ina-toggle { position: relative; display: inline-block; width: 36px; height: 20px; }
        .ina-toggle input { opacity: 0; width: 0; height: 0; }
        .ina-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: ${c.borderLight}; border-radius: 20px; transition: 0.2s; }
        .ina-slider:before { position: absolute; content: ''; height: 14px; width: 14px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.2s; }
        input:checked + .ina-slider { background: ${ACCENT}; }
        input:checked + .ina-slider:before { transform: translateX(16px); }
        .log-entry { display: flex; align-items: flex-start; gap: 8px; padding: 6px 0; border-bottom: 1px solid ${c.border}; font-size: 12px; color: ${c.text}; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <NavbarIndia />

      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 20px' }}>

        {/* Page header */}
        <div style={{ marginBottom: 24, paddingLeft: 14, borderLeft: `3px solid ${ACCENT}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.primary, fontFamily: f.heading }}>
              Auto Apply
            </div>
            <div style={{ fontSize: 13, color: c.textMuted, marginTop: 3 }}>
              {mode === 'demo'
                ? 'See how Kira fills a real job application — then try it yourself'
                : 'Paste an application URL and let Kira fill the form for you'}
            </div>
          </div>
          {mode === 'active' && (
            <button
              onClick={() => { setMode('demo'); setPhase('idle'); setAnalyzeResult(null); setMapping([]); setError('') }}
              style={{ fontSize: 12, color: c.textMuted, background: 'transparent', border: `1px solid ${c.border}`, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: f.body }}
            >
              ← Watch demo
            </button>
          )}
        </div>

        {/* ── DEMO MODE ── */}
        {mode === 'demo' && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0 40px' }}>
            <AutoApplyDemoWidget
              market="in"
              onTryItYourself={() => setMode('active')}
              onTryWithSample={() => {
                setJobUrl(`${window.location.origin}/in/auto-apply/demo-form`)
                setMode('active')
              }}
            />
          </div>
        )}

        {/* ── ACTIVE MODE ── */}
        {mode === 'active' && (
          <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20, alignItems: 'start' }}>

            {/* LEFT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <div style={card}>
                <div style={cardHead}>Job Application URL</div>
                <div style={{ padding: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, marginBottom: 6, display: 'block' }}>
                    Paste the direct application form URL
                  </label>
                  <input
                    className="ina-input"
                    value={jobUrl}
                    onChange={e => setJobUrl(e.target.value)}
                    placeholder="https://careers.tcs.com/apply/..."
                    disabled={phase === 'analyzing' || phase === 'executing'}
                  />
                  {jobUrl && !isUrlValid && (
                    <div style={{ fontSize: 11, color: c.danger, marginTop: 4 }}>Must start with http</div>
                  )}
                </div>
              </div>

              <div style={card}>
                <div style={cardHead}>Your Profile</div>
                <div style={{ padding: 16 }}>
                  {hasCv ? (
                    <>
                      <div style={{ fontSize: 12, color: c.success, fontWeight: 600, marginBottom: 6 }}>
                        ✓ CV loaded ({Math.round(cvText.length / 5)} words)
                      </div>
                      <div style={{ fontSize: 11, color: c.textMuted, lineHeight: 1.5, background: c.bgSubtle, borderRadius: 6, padding: '8px 10px', maxHeight: 60, overflow: 'hidden' }}>
                        {cvText.slice(0, 180)}…
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, cursor: 'pointer' }}>
                        <span style={{ fontSize: 11, color: c.textFaint }}>Replace with a different CV →</span>
                        <input type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }}
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleCvUpload(f) }}
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <label style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                        padding: '20px 16px', borderRadius: 10, cursor: 'pointer',
                        border: `2px dashed ${cvUploading ? ACCENT : c.borderLight}`,
                        background: cvUploading ? ACCENT_LIGHT : c.bgSubtle,
                        transition: 'all 0.15s', marginBottom: 10,
                      }}>
                        {cvUploading ? (
                          <>
                            <svg className="spin" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.5">
                              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                            </svg>
                            <span style={{ fontSize: 12, color: ACCENT, fontWeight: 600 }}>Extracting text…</span>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: 22 }}>📄</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: c.primary }}>Upload your Resume</span>
                            <span style={{ fontSize: 11, color: c.textMuted }}>PDF, DOC, DOCX or TXT · max 10 MB</span>
                          </>
                        )}
                        <input type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }}
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleCvUpload(f) }}
                        />
                      </label>
                      {cvUploadError && (
                        <div style={{ fontSize: 11, color: c.error, marginBottom: 8 }}>{cvUploadError}</div>
                      )}
                      <div style={{ fontSize: 11, color: c.textFaint }}>
                        Or build one in{' '}
                        <span onClick={() => router.push('/in/cv-builder')} style={{ textDecoration: 'underline', cursor: 'pointer', color: ACCENT }}>CV Builder</span>
                      </div>
                    </>
                  )}
                  <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: c.textMuted }}>Include cover letter</span>
                    <label className="ina-toggle">
                      <input type="checkbox" checked={useCoverLetter} onChange={e => setUseCoverLetter(e.target.checked)} disabled={!coverLetter} />
                      <span className="ina-slider" />
                    </label>
                  </div>
                  {!coverLetter && (
                    <div style={{ fontSize: 11, color: c.textFaint, marginTop: 4 }}>
                      Generate one in{' '}
                      <span onClick={() => router.push('/in/cover-letter')} style={{ textDecoration: 'underline', cursor: 'pointer', color: ACCENT }}>Cover Letter</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                {error && (
                  <div style={{ fontSize: 12, color: c.error, background: c.errorLight, border: `1px solid ${c.errorBorder}`, borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                    {error}
                  </div>
                )}
                <button
                  className="ina-btn-primary"
                  style={{ width: '100%' }}
                  disabled={!isUrlValid || !hasCv || phase === 'analyzing' || phase === 'executing'}
                  onClick={handleAnalyse}
                >
                  {phase === 'analyzing' ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                      </svg>
                      Analysing form…
                    </span>
                  ) : 'Analyse Form — 3 credits'}
                </button>

                {(phase === 'review' || phase === 'done') && (
                  <button
                    className="ina-btn-outline"
                    style={{ width: '100%', marginTop: 10 }}
                    onClick={() => { setPhase('idle'); setAnalyzeResult(null); setMapping([]); setError('') }}
                  >
                    &larr; Start over
                  </button>
                )}
              </div>

              <div style={{ background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: ACCENT, marginBottom: 4 }}>How it works</div>
                <ol style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: c.navy, lineHeight: 1.8 }}>
                  <li>Paste the direct application form URL</li>
                  <li>Kira reads the form fields (CTC, notice period, etc.)</li>
                  <li>Review &amp; edit the pre-filled values</li>
                  <li>Click Launch &mdash; browser fills &amp; submits</li>
                </ol>
                <div style={{ fontSize: 10, color: c.textMuted, marginTop: 8 }}>
                  Costs 3 credits per form analysis. India-specific fields (CTC, notice period) are auto-detected.
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {phase === 'idle' && !analyzeResult && (
                <div style={{ ...card, padding: '60px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🤖</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: c.primary, marginBottom: 6 }}>
                    Enter a job application URL to begin
                  </div>
                  <div style={{ fontSize: 13, color: c.textMuted }}>
                    Works with Taleo, Workday, iCIMS, and most direct application forms
                  </div>
                </div>
              )}

              {phase === 'analyzing' && (
                <div style={{ ...card, padding: '50px 20px', textAlign: 'center' }}>
                  <svg className="spin" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" style={{ margin: '0 auto 16px' }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  <div style={{ fontSize: 14, fontWeight: 600, color: c.primary }}>Opening page with browser automation…</div>
                  <div style={{ fontSize: 12, color: c.textMuted, marginTop: 6 }}>Reading form fields and mapping your profile</div>
                </div>
              )}

              {(phase === 'review' || phase === 'executing' || phase === 'done') && analyzeResult && (
                <>
                  <div style={card}>
                    <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: c.primary, fontFamily: f.heading }}>
                          {analyzeResult.pageTitle || new URL(jobUrl).hostname}
                        </div>
                        <div style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>{jobUrl.slice(0, 70)}{jobUrl.length > 70 ? '…' : ''}</div>
                      </div>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: ACCENT_LIGHT, color: ACCENT, fontWeight: 700 }}>
                          {analyzeResult.formType}
                        </span>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: c.bg, color: c.textMuted, fontWeight: 600 }}>
                          {analyzeResult.fields.length} fields
                        </span>
                      </div>
                    </div>
                    {analyzeResult.screenshotB64 && (
                      <div style={{ borderTop: `1px solid ${c.border}`, padding: '10px 16px', background: c.bgSubtle }}>
                        <img
                          src={`data:image/png;base64,${analyzeResult.screenshotB64}`}
                          alt="Form screenshot"
                          style={{ width: '100%', maxHeight: 220, objectFit: 'cover', objectPosition: 'top', borderRadius: 6, border: `1px solid ${c.border}` }}
                        />
                      </div>
                    )}
                  </div>

                  <div style={card}>
                    <div style={{ ...cardHead, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: 'none' }}>
                      <span>Field Mapping — review &amp; edit values</span>
                      <span style={{ fontSize: 11, fontWeight: 400, color: c.textMuted }}>
                        {mapping.filter(m => m.value && m.value !== '__SKIP_FILE__').length} / {mapping.length} filled
                      </span>
                    </div>
                    <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 70px', padding: '8px 16px', background: c.bgSubtle, borderBottom: `1px solid ${c.border}` }}>
                        {['Field', 'Value', 'Confidence'].map(h => (
                          <div key={h} style={{ fontSize: 10, fontWeight: 700, color: c.textFaint, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</div>
                        ))}
                      </div>
                      {mapping.map((m, idx) => (
                        <div key={`f-${idx}`} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 70px', padding: '8px 16px', borderBottom: `1px solid ${c.border}`, alignItems: 'center', background: m.field.required && !m.value ? c.warningLight : undefined }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: c.text }}>
                              {m.field.label}
                              {m.field.required && <span style={{ color: c.danger, marginLeft: 2 }}>*</span>}
                            </div>
                            <div style={{ fontSize: 10, color: c.textFaint, textTransform: 'uppercase' }}>{m.field.type}</div>
                          </div>
                          <div style={{ paddingRight: 12 }}>
                            {m.value === '__CV_FILE__' ? (
                              <span style={{ fontSize: 11, color: c.success, fontWeight: 600 }}>📎 Will attach resume</span>
                            ) : m.value === '__CL_FILE__' ? (
                              <span style={{ fontSize: 11, color: c.success, fontWeight: 600 }}>📎 Will attach cover letter</span>
                            ) : m.value === '__SKIP_FILE__' ? (
                              <span style={{ fontSize: 11, color: c.textMuted, fontStyle: 'italic' }}>File upload — upload manually</span>
                            ) : m.field.type === 'select' && m.field.options ? (
                              <select className="ina-input" style={{ fontSize: 12, padding: '6px 10px' }} value={m.value} onChange={e => updateValue(idx, e.target.value)} disabled={phase === 'executing'}>
                                <option value="">-- select --</option>
                                {m.field.options.map((o, oi) => <option key={`${oi}-${o}`} value={o}>{o}</option>)}
                              </select>
                            ) : m.field.type === 'textarea' ? (
                              <textarea className="ina-input" rows={3} style={{ fontSize: 12, resize: 'vertical', minHeight: 56 }} value={m.value} onChange={e => updateValue(idx, e.target.value)} disabled={phase === 'executing'} />
                            ) : (
                              <input className="ina-input" style={{ fontSize: 12, padding: '6px 10px' }} value={m.value} onChange={e => updateValue(idx, e.target.value)} disabled={phase === 'executing'} placeholder={m.field.placeholder || ''} />
                            )}
                          </div>
                          <div>{confidenceBadge(m.confidence)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {phase === 'review' && (
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button className="ina-btn-primary" style={{ flex: 1 }} onClick={handleExecute}>
                        Launch Auto Fill &amp; Submit →
                      </button>
                      <a href={jobUrl} target="_blank" rel="noopener noreferrer" style={{ flex: '0 0 auto', padding: '11px 20px', borderRadius: 9, background: c.bgCard, color: ACCENT, border: `1.5px solid ${ACCENT}`, textDecoration: 'none', fontFamily: f.heading, fontSize: 13, fontWeight: 700 }}>
                        Open manually
                      </a>
                    </div>
                  )}

                  {phase === 'done' && (
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button className="ina-btn-success" style={{ flex: 1 }} onClick={logToTracker}>
                        ✓ Log to Tracker →
                      </button>
                      <button className="ina-btn-outline" onClick={() => { setPhase('idle'); setAnalyzeResult(null); setMapping([]); setLog([]); setLiveShot('') }}>
                        Apply another
                      </button>
                    </div>
                  )}
                </>
              )}

              {(phase === 'executing' || (phase === 'done' && log.length > 0)) && (
                <div style={card}>
                  <div style={{ ...cardHead, display: 'flex', alignItems: 'center', gap: 8, borderLeft: 'none' }}>
                    {phase === 'executing' && <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>}
                    {phase === 'done' ? '✓ Completed' : 'Live Log'}
                  </div>
                  <div ref={logRef} style={{ maxHeight: 280, overflowY: 'auto', padding: '4px 16px' }}>
                    {log.map(entry => (
                      <div key={entry.id} className="log-entry">
                        <span style={{ flexShrink: 0, marginTop: 1 }}>
                          {entry.type === 'error' ? '✗' : entry.type === 'done' ? '✓' : entry.type === 'filled' ? (entry.success ? '✓' : '–') : entry.type === 'screenshot' ? <SvgIcon name="camera" size={12} color="currentColor" /> : entry.type === 'submitting' ? '⬆' : '·'}
                        </span>
                        <span style={{ color: entry.type === 'error' ? c.error : entry.type === 'done' ? c.success : entry.success === false ? c.textMuted : undefined }}>
                          {entry.message}
                        </span>
                      </div>
                    ))}
                  </div>
                  {liveShot && (
                    <div style={{ padding: '10px 16px', borderTop: `1px solid ${c.border}` }}>
                      <div style={{ fontSize: 11, color: c.textFaint, marginBottom: 6 }}>
                        {phase === 'done' ? 'Confirmation screenshot' : 'Current state'}
                      </div>
                      <img src={`data:image/png;base64,${liveShot}`} alt="Live browser state" style={{ width: '100%', borderRadius: 6, border: `1px solid ${c.border}` }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
