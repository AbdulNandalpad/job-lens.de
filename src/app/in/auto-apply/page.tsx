'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SS, API, AUTO_APPLY_MAINTENANCE } from '@/lib/constants'
import type { FieldMapping, AnalyzeResult, ExecuteEvent } from '@/lib/auto-apply-engine'
import { theme } from '@/lib/theme'
import { useCurrentCv } from '@/lib/useCurrentCv'
import { readJob, type JobRef } from '@/lib/job'
import { cvTextFromTailored } from '@/lib/cv'
import SvgIcon from '@/components/SvgIcon'
import FlowError from '@/components/FlowError'
import AutoApplyDemoWidget from '@/components/AutoApplyDemoWidget'

const { colors: c, fonts: f } = theme
const ACCENT = '#FF9933'
const ACCENT_LIGHT = '#FF993318'
const ACCENT_BORDER = '#FF993340'

type Phase = 'idle' | 'analyzing' | 'review' | 'executing' | 'confirming' | 'submitting' | 'done'
type Mode  = 'demo' | 'active'

interface LogEntry {
  id: number
  type: ExecuteEvent['type']
  message: string
  b64?: string
  success?: boolean
}

const MIN_CV_CHARS = 50

export default function InAutoApplyPage() {
  const router = useRouter()

  // Mirrors the DACH page: non-admins see the maintenance card while the
  // feature is gated (AUTO_APPLY_MAINTENANCE), never a working-looking form.
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminChecked, setAdminChecked] = useState(false)
  const [trackerError, setTrackerError] = useState('')

  useEffect(() => {
    fetch(API.userProfile).then(r => r.json()).then(d => {
      setIsAdmin(!!d.isAdmin)
      setAdminChecked(true)
    }).catch(() => setAdminChecked(true))
  }, [])

  const [mode, setMode] = useState<Mode>('demo')

  const [jobUrl, setJobUrl] = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [useCoverLetter, setUseCoverLetter] = useState(false)

  // The ONE CV source. The tailored CV from CV Builder (this session) is preferred for
  // form filling; otherwise the user's current CV (session → saved on account). A CV
  // uploaded on this page replaces the tailored one for this visit only — CV Builder's
  // own result is never wiped from here.
  const cv = useCurrentCv()
  const [tailoredCvText, setTailoredCvText] = useState('')
  const cvText = tailoredCvText || cv.cvText

  const [cvUploading, setCvUploading] = useState(false)
  const [cvUploadError, setCvUploadError] = useState('')
  const [saveToAccount, setSaveToAccount] = useState(false)
  const [cvSaveNotice, setCvSaveNotice] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    if (cv.rememberedConsent) setSaveToAccount(true)
  }, [cv.rememberedConsent])

  async function handleCvUpload(file: File) {
    setCvUploading(true)
    setCvUploadError('')
    setCvSaveNotice(null)
    const out = await cv.extractFile(file)
    if ('error' in out) {
      setCvUploadError(out.error)
      setCvUploading(false)
      return
    }
    if (out.text.trim().length < MIN_CV_CHARS) {
      setCvUploadError('That file has almost no text in it — try a different file or paste the text.')
      setCvUploading(false)
      return
    }
    setTailoredCvText('')
    const result = await cv.setCv(out.text, file.name, { saveToAccount })
    if (saveToAccount) {
      setCvSaveNotice(result.saved
        ? { ok: true, text: 'Saved to your account' }
        : { ok: false, text: `Saved for this session only — ${result.error || 'could not save'}` })
    }
    setCvUploading(false)
  }

  function handleCvRemove() {
    setTailoredCvText('')
    setCvUploadError('')
    setCvSaveNotice(null)
    cv.clearCv()
  }

  const [phase, setPhase] = useState<Phase>('idle')
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null)
  const [mapping, setMapping] = useState<FieldMapping[]>([])
  const [log, setLog] = useState<LogEntry[]>([])
  const [liveShot, setLiveShot] = useState('')
  const [previewShot, setPreviewShot] = useState('')
  const [sessionId, setSessionId] = useState('')
  // Populated live from the SSE stream but not rendered here yet — the DACH page
  // (src/app/app/auto-apply/page.tsx) has the field-by-field status panel this feeds.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [fieldStatuses, setFieldStatuses] = useState<Record<string, boolean | null>>({})
  const [error, setError] = useState('')
  const [requiresLogin, setRequiresLogin] = useState(false)
  const [portalUsername, setPortalUsername] = useState('')
  const [portalPassword, setPortalPassword] = useState('')
  const logRef = useRef<HTMLDivElement>(null)
  const logCounter = useRef(0)

  const [targetJob, setTargetJob] = useState<JobRef | null>(null)

  useEffect(() => {
    try {
      setTailoredCvText(cvTextFromTailored(sessionStorage.getItem(SS.cvbTailored) || ''))
      const cl = sessionStorage.getItem(SS.clLetter) || ''
      setCoverLetter(cl)
      if (cl) setUseCoverLetter(true)
    } catch {
      // storage unavailable — page still works with the account CV
    }
    setTargetJob(readJob())
  }, [])

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('demo') === '1') {
      setJobUrl(`${window.location.origin}/in/auto-apply/demo-form`)
      setMode('active')
    }
  }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [log])

  async function handleAnalyse(withCredentials = false) {
    if (!jobUrl.trim()) { setError('Please enter the application URL.'); return }
    if (!cvText.trim()) { setError('No CV found. Please complete the CV Builder first.'); return }
    setError('')
    setPhase('analyzing')
    setAnalyzeResult(null)
    setMapping([])

    const body: Record<string, unknown> = {
      jobUrl: jobUrl.trim(),
      cvText,
      coverLetter: useCoverLetter ? coverLetter : '',
      market: 'in',
    }
    if (withCredentials && portalUsername && portalPassword) {
      body.credentials = { username: portalUsername, password: portalPassword }
    }

    try {
      const res = await fetch(API.autoApplyAnalyze, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data: AnalyzeResult = await res.json()
      if (!res.ok) throw new Error((data as unknown as { error: string }).error || 'Analysis failed')

      if (data.requiresLogin) {
        setAnalyzeResult(data)
        setPhase('idle')
        setRequiresLogin(true)
        setError(data.error || '')
        return
      }

      setRequiresLogin(false)
      setPortalUsername('')
      setPortalPassword('')
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

  async function streamEvents(endpoint: string, body: object, onDone: () => void) {
    const addLog = (entry: Omit<LogEntry, 'id'>) =>
      setLog(prev => [...prev, { ...entry, id: ++logCounter.current }])

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
              case 'log':           addLog({ type: 'log', message: ev.message }); break
              case 'screenshot':    setLiveShot(ev.b64); addLog({ type: 'screenshot', message: ev.message, b64: ev.b64 }); break
              case 'filling':
                setFieldStatuses(prev => ({ ...prev, [ev.label]: null }))
                addLog({ type: 'filling', message: `Filling "${ev.label}" → ${ev.value.slice(0, 40)}` })
                break
              case 'filled':
                setFieldStatuses(prev => ({ ...prev, [ev.label]: ev.success }))
                addLog({ type: 'filled', message: `"${ev.label}" ${ev.success ? '✓ filled' : '⚠ skipped'}`, success: ev.success })
                break
              case 'filled_preview':
                setPreviewShot(ev.b64)
                setLiveShot(ev.b64)
                if ('sessionId' in ev) setSessionId((ev as { sessionId: string }).sessionId)
                addLog({ type: 'log', message: ev.message })
                setPhase('confirming')
                break
              case 'done':
                setLiveShot(ev.confirmB64)
                addLog({ type: 'done', message: ev.message })
                setPhase('done')
                onDone()
                break
              case 'error':
                addLog({ type: 'error', message: ev.message })
                if (ev.b64) setLiveShot(ev.b64)
                setPhase('review')
                break
            }
          } catch { /* ignore malformed SSE */ }
        }
      }
    } catch (err) {
      setLog(prev => [...prev, { id: ++logCounter.current, type: 'error', message: String(err) }])
      setPhase('review')
    }
  }

  async function handleExecute() {
    setPhase('executing')
    setLog([])
    setLiveShot('')
    setPreviewShot('')
    setSessionId('')
    setFieldStatuses({})
    await streamEvents(
      '/api/auto-apply/execute',
      { jobUrl: jobUrl.trim(), mapping, cvText, coverLetter: useCoverLetter ? coverLetter : '' },
      () => {},
    )
  }

  async function handleConfirmSubmit() {
    if (!sessionId) {
      setError('Session lost — please go back and re-fill the form.')
      setPhase('confirming')
      return
    }
    setPhase('submitting')
    setLog(prev => [...prev, { id: ++logCounter.current, type: 'log', message: 'User confirmed — submitting application…' }])
    await streamEvents('/api/auto-apply/submit', { sessionId }, logToTracker)
  }

  // Persist to the applications tracker (the same store /in/tracker reads)
  async function logToTracker() {
    const job = readJob() ?? targetJob
    let host = ''
    try { host = new URL(jobUrl).hostname.replace('www.', '') } catch { /* not a URL — company falls back below */ }
    const d = new Date()
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    setTrackerError('')
    try {
      const res = await fetch(API.applications, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company:    job?.employer_name || host || 'Unknown company',
          role:       job?.job_title || 'Applied via Auto Apply',
          status:     'applied',
          location:   job?.job_city || '',
          job_url:    job?.job_apply_link || jobUrl,
          notes:      'Applied via Job-Lens',
          applied_at: today,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setTrackerError(data.error || `Request failed (${res.status})`); return }
      router.push('/in/tracker')
    } catch {
      setTrackerError('Network error. Please try again.')
    }
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
  const hasCv = cvText.trim().length > MIN_CV_CHARS
  const usingTailored = !!tailoredCvText
  const cvChipLabel = usingTailored
    ? 'Tailored CV from CV Builder'
    : cv.source === 'saved'
      ? 'Using the CV saved on your account'
      : cv.fileName ? `CV: ${cv.fileName}` : 'CV on file for this session'

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

      {AUTO_APPLY_MAINTENANCE && adminChecked && !isAdmin && (
        <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style={{ margin: '0 auto 20px' }}>
              <circle cx="28" cy="28" r="27" fill={ACCENT_LIGHT} stroke={ACCENT_BORDER} strokeWidth="1.5"/>
              <path d="M28 18v12M28 34v2" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <div style={{ fontSize: 18, fontWeight: 700, color: c.primary, fontFamily: f.heading, marginBottom: 10 }}>
              Auto Apply is currently in maintenance mode
            </div>
            <div style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.7 }}>
              We&apos;re improving Auto Apply. It will be back soon — check back later.
            </div>
          </div>
        </div>
      )}

      {!(AUTO_APPLY_MAINTENANCE && adminChecked && !isAdmin) && (
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 20px' }}>

        {/* Page header */}
        <div style={{ marginBottom: 24, paddingLeft: 14, borderLeft: `3px solid ${ACCENT}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.primary, fontFamily: f.heading }}>
              Auto Apply
            </div>
            {targetJob ? (
              <div style={{ fontSize: 13, color: c.textMuted, marginTop: 3 }}>
                Applying for: <strong style={{ color: c.primary }}>{targetJob.job_title}</strong>
                {targetJob.employer_name && <> at <strong style={{ color: ACCENT }}>{targetJob.employer_name}</strong></>}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: c.textMuted, marginTop: 3 }}>
                {mode === 'demo'
                  ? 'See how Kira fills a real job application — then try it yourself'
                  : 'Paste an application URL and let Kira fill the form for you'}
              </div>
            )}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: c.success, fontWeight: 600, marginBottom: 6, minWidth: 0 }}>
                        <SvgIcon name="check-circle" size={14} color={c.success} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cvChipLabel}</span>
                        <span style={{ fontWeight: 400, color: c.textFaint, flexShrink: 0 }}>· {Math.round(cvText.length / 5)} words</span>
                      </div>
                      <div style={{ fontSize: 11, color: c.textMuted, lineHeight: 1.5, background: c.bgSubtle, borderRadius: 6, padding: '8px 10px', maxHeight: 60, overflow: 'hidden' }}>
                        {cvText.slice(0, 180)}…
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: cvUploading ? 'default' : 'pointer' }}>
                          <span style={{ fontSize: 11, color: cvUploading ? ACCENT : c.textFaint, textDecoration: cvUploading ? 'none' : 'underline' }}>
                            {cvUploading ? 'Reading your CV…' : 'Replace'}
                          </span>
                          <input type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }} disabled={cvUploading}
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleCvUpload(f); e.target.value = '' }}
                          />
                        </label>
                        <button type="button" onClick={handleCvRemove} disabled={cvUploading}
                          style={{ fontSize: 11, color: c.textFaint, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>
                          Remove
                        </button>
                      </div>
                    </>
                  ) : cv.loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: c.textMuted, padding: '12px 0' }}>
                      <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.5">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                      </svg>
                      Reading your CV…
                    </div>
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
                            <span style={{ fontSize: 12, color: ACCENT, fontWeight: 600 }}>Reading your CV…</span>
                          </>
                        ) : (
                          <>
                            <SvgIcon name="document" size={24} color={ACCENT} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: c.primary }}>Upload CV</span>
                            <span style={{ fontSize: 11, color: c.textMuted }}>PDF, DOCX or TXT · max 10 MB</span>
                          </>
                        )}
                        <input type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }} disabled={cvUploading}
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleCvUpload(f); e.target.value = '' }}
                        />
                      </label>
                      <div style={{ fontSize: 11, color: c.textFaint }}>
                        Or build one in{' '}
                        <span onClick={() => router.push('/in/cv-builder')} style={{ textDecoration: 'underline', cursor: 'pointer', color: ACCENT }}>CV Builder</span>
                      </div>
                    </>
                  )}
                  {cvUploadError && (
                    <div style={{ marginTop: 10 }}>
                      <FlowError compact message={cvUploadError} />
                    </div>
                  )}
                  {!cv.loading && (
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 12, cursor: 'pointer' }}>
                      <input type="checkbox" checked={saveToAccount} onChange={e => setSaveToAccount(e.target.checked)}
                        style={{ marginTop: 2, accentColor: ACCENT, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: c.textMuted, lineHeight: 1.5 }}>
                        Remember my CV for next time (stored encrypted, delete any time in Account)
                      </span>
                    </label>
                  )}
                  {cvSaveNotice && (
                    <div style={{ fontSize: 11, color: cvSaveNotice.ok ? c.success : c.warning, marginTop: 6, lineHeight: 1.5 }}>
                      {cvSaveNotice.text}
                    </div>
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
                {requiresLogin ? (
                  <div style={{ background: c.bgCard, border: `1px solid ${ACCENT}`, borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: c.primary, marginBottom: 8 }}>
                      🔐 Portal login required
                    </div>

                    {/* Best option */}
                    <div style={{ background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: ACCENT, marginBottom: 4 }}>✅ Recommended: paste the post-login URL</div>
                      <ol style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: c.navy, lineHeight: 1.9 }}>
                        <li>Open the URL in your browser and log in normally</li>
                        <li>Navigate to the actual job application form</li>
                        <li>Copy the URL from the address bar</li>
                        <li>Paste that URL above and click Analyse Form</li>
                      </ol>
                    </div>

                    <div style={{ fontSize: 11, fontWeight: 600, color: c.textMuted, marginBottom: 6 }}>
                      Or: try auto-login (may not work on Workday / major portals)
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: c.textMuted, marginBottom: 4 }}>Email / Username</div>
                    <input
                      className="ina-input"
                      type="email"
                      value={portalUsername}
                      onChange={e => setPortalUsername(e.target.value)}
                      placeholder="you@email.com"
                      style={{ marginBottom: 10 }}
                      autoComplete="off"
                    />
                    <div style={{ fontSize: 11, fontWeight: 600, color: c.textMuted, marginBottom: 4 }}>Password</div>
                    <input
                      className="ina-input"
                      type="password"
                      value={portalPassword}
                      onChange={e => setPortalPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{ marginBottom: 10 }}
                      autoComplete="off"
                    />
                    {error && (
                      <div style={{ fontSize: 11, color: c.error, background: c.errorLight, border: `1px solid ${c.errorBorder}`, borderRadius: 6, padding: '7px 10px', marginBottom: 10 }}>
                        {error}
                        {error.includes('failed') && (
                          <div style={{ marginTop: 4, color: c.textMuted }}>
                            Tip: Portals like Workday block automated logins. Use the recommended method above instead.
                          </div>
                        )}
                      </div>
                    )}
                    <button
                      className="ina-btn-outline"
                      style={{ width: '100%', marginBottom: 8 }}
                      disabled={!portalUsername || !portalPassword || phase === 'analyzing'}
                      onClick={() => handleAnalyse(true)}
                    >
                      {phase === 'analyzing' ? (
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                          Signing in…
                        </span>
                      ) : 'Try auto-login'}
                    </button>
                    <button
                      className="ina-btn-outline"
                      style={{ width: '100%', fontSize: 12 }}
                      onClick={() => { setRequiresLogin(false); setPortalUsername(''); setPortalPassword(''); setError('') }}
                    >
                      ← Use a different URL
                    </button>
                  </div>
                ) : (
                  <>
                    {error && (
                      <div style={{ fontSize: 12, color: c.error, background: c.errorLight, border: `1px solid ${c.errorBorder}`, borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                        {error}
                      </div>
                    )}
                    <button
                      className="ina-btn-primary"
                      style={{ width: '100%' }}
                      disabled={!isUrlValid || !hasCv || phase === 'analyzing' || phase === 'executing'}
                      onClick={() => handleAnalyse(false)}
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
                  </>
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
                  <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><SvgIcon name="bot" size={36} color={ACCENT} /></div>
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

              {(phase === 'review' || phase === 'executing' || phase === 'confirming' || phase === 'submitting' || phase === 'done') && analyzeResult && (
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
                              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: c.success, fontWeight: 600 }}><SvgIcon name="clipboard" size={13} color={c.success} /> Will attach resume</span>
                            ) : m.value === '__CL_FILE__' ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: c.success, fontWeight: 600 }}><SvgIcon name="clipboard" size={13} color={c.success} /> Will attach cover letter</span>
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
                    mapping.some(m => m.field.type === 'password') ? (
                      <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '14px 16px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#b91c1c', marginBottom: 6 }}>
                          🚫 This is not a job application form
                        </div>
                        <div style={{ fontSize: 12, color: '#7f1d1d', lineHeight: 1.6, marginBottom: 10 }}>
                          This page has password fields — it is a login or registration form, not a job application. Log into the company portal in your browser, navigate to the actual application form, then paste that URL here.
                        </div>
                        <button
                          className="ina-btn-outline"
                          style={{ width: '100%' }}
                          onClick={() => { setPhase('idle'); setAnalyzeResult(null); setMapping([]); setError('') }}
                        >
                          ← Enter a different URL
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button className="ina-btn-primary" style={{ flex: 1 }} onClick={handleExecute}>
                          Fill Form (Preview First) →
                        </button>
                        <a href={jobUrl} target="_blank" rel="noopener noreferrer" style={{ flex: '0 0 auto', padding: '11px 20px', borderRadius: 9, background: c.bgCard, color: ACCENT, border: `1.5px solid ${ACCENT}`, textDecoration: 'none', fontFamily: f.heading, fontSize: 13, fontWeight: 700 }}>
                          Open manually
                        </a>
                      </div>
                    )
                  )}

                  {phase === 'done' && (
                    <>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button className="ina-btn-success" style={{ flex: 1 }} onClick={logToTracker}>
                        ✓ Log to Tracker →
                      </button>
                      <button className="ina-btn-outline" onClick={() => { setPhase('idle'); setAnalyzeResult(null); setMapping([]); setLog([]); setLiveShot('') }}>
                        Apply another
                      </button>
                    </div>
                    {trackerError && (
                      <div style={{ marginTop: 10, fontSize: 12, color: c.error, background: c.errorLight, border: `1px solid ${c.errorBorder}`, borderRadius: 8, padding: '8px 12px' }}>
                        Could not save the application. {trackerError}
                      </div>
                    )}
                    </>
                  )}
                </>
              )}

              {phase === 'confirming' && previewShot && (
                <div style={{ ...card, overflow: 'hidden' }}>
                  {mapping.some(m => m.field.type === 'password') && (
                    <div style={{ padding: '12px 16px', background: '#fef2f2', borderBottom: '1px solid #fca5a5' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#b91c1c', marginBottom: 4 }}>
                        🚫 This is not a job application form!
                      </div>
                      <div style={{ fontSize: 12, color: '#7f1d1d', lineHeight: 1.6 }}>
                        This page contains password fields — it is a login or registration form, not a job application. Log into the company portal in your browser, navigate to the actual application form, then paste that URL here.
                      </div>
                      <button
                        style={{ marginTop: 10, fontSize: 12, fontWeight: 700, padding: '7px 16px', background: '#b91c1c', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
                        onClick={() => { setPhase('idle'); setAnalyzeResult(null); setMapping([]); setPreviewShot('') }}
                      >
                        ← Back to URL input
                      </button>
                    </div>
                  )}
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid ${c.border}`, background: c.warningLight }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: c.primary }}>
                      ⚠ Review filled form — confirm to submit
                    </div>
                    <div style={{ fontSize: 11, color: c.textMuted, marginTop: 3 }}>
                      Kira has filled all reachable fields. Carefully review the preview. File upload fields (resume, cover letter) must be manually uploaded on the live page before you click Submit.
                    </div>
                  </div>
                  <div style={{ padding: '12px 16px' }}>
                    <img src={`data:image/png;base64,${previewShot}`} alt="Filled form preview" style={{ width: '100%', borderRadius: 6, border: `1px solid ${c.border}`, marginBottom: 14 }} />
                    <div style={{ background: c.bgSubtle, borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 12, color: c.textMuted, lineHeight: 1.7 }}>
                      <strong style={{ color: c.primary }}>Before you submit:</strong>
                      <ul style={{ margin: '6px 0 0', paddingLeft: 16 }}>
                        <li>All required fields (*) filled correctly?</li>
                        <li>Resume uploaded (if the form requires a file)?</li>
                        <li>Cover letter attached (if applicable)?</li>
                        <li>CTC, notice period values correct?</li>
                        <li>Any consent checkboxes ticked?</li>
                      </ul>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button className="ina-btn-primary" style={{ flex: 1 }} onClick={handleConfirmSubmit}>
                        ✓ All checked — Submit Application
                      </button>
                      <button className="ina-btn-outline" onClick={() => { setPhase('review'); setPreviewShot('') }}>
                        ← Edit fields
                      </button>
                    </div>
                    <div style={{ marginTop: 10, fontSize: 11, color: c.textMuted }}>
                      Note: After submitting you&apos;ll see a confirmation screenshot. Also check your inbox for a confirmation email.
                    </div>
                  </div>
                </div>
              )}

              {(phase === 'executing' || phase === 'submitting' || (phase === 'done' && log.length > 0)) && (
                <div style={card}>
                  <div style={{ ...cardHead, display: 'flex', alignItems: 'center', gap: 8, borderLeft: 'none' }}>
                    {(phase === 'executing' || phase === 'submitting') && <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>}
                    {phase === 'done' ? '✓ Completed' : phase === 'submitting' ? 'Submitting…' : 'Live Log'}
                  </div>
                  <div ref={logRef} style={{ maxHeight: 280, overflowY: 'auto', padding: '4px 16px' }}>
                    {log.map(entry => (
                      <div key={entry.id} className="log-entry">
                        <span style={{ flexShrink: 0, marginTop: 1 }}>
                          {entry.type === 'error' ? '✗' : entry.type === 'done' ? '✓' : entry.type === 'filled' ? (entry.success ? '✓' : '–') : entry.type === 'screenshot' ? <SvgIcon name="camera" size={12} color="currentColor" /> : '·'}
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
      )}
    </div>
  )
}
