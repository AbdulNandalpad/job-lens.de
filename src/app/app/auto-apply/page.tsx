'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'
import { useLanguage } from '@/lib/i18n'
import type { FieldMapping, AnalyzeResult, ExecuteEvent } from '@/lib/auto-apply-engine'
import { theme } from '@/lib/theme'
import SvgIcon from '@/components/SvgIcon'
import AutoApplyDemoWidget from '@/components/AutoApplyDemoWidget'

const { colors: c, gradients: g, fonts: f } = theme

type Phase = 'idle' | 'analyzing' | 'review' | 'executing' | 'confirming' | 'submitting' | 'done'
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
    if (d.linkedin) lines.push(`LinkedIn: ${d.linkedin}`)
    if (d.summary) lines.push(`\nSummary:\n${d.summary}`)
    if (Array.isArray(d.experience) && d.experience.length) {
      lines.push('\nExperience:')
      d.experience.forEach((e: { role?: string; company?: string; period?: string; bullets?: string[] }) => {
        lines.push(`${e.role} at ${e.company} (${e.period})`)
        if (Array.isArray(e.bullets)) e.bullets.forEach((b: string) => lines.push(`  - ${b}`))
      })
    }
    if (Array.isArray(d.education) && d.education.length) {
      lines.push('\nEducation:')
      d.education.forEach((e: { degree?: string; school?: string; year?: string }) =>
        lines.push(`${e.degree} — ${e.school} (${e.year})`)
      )
    }
    if (Array.isArray(d.skills) && d.skills.length)
      lines.push(`\nSkills: ${d.skills.map((s: { name?: string }) => s.name).join(', ')}`)
    if (Array.isArray(d.languages) && d.languages.length)
      lines.push(`Languages: ${d.languages.map((l: { name?: string }) => l.name).join(', ')}`)
    if (Array.isArray(d.certifications) && d.certifications.length)
      lines.push(`Certifications: ${d.certifications.join(', ')}`)
    return lines.join('\n')
  } catch {
    return raw
  }
}

export default function AutoApplyPage() {
  const router = useRouter()
  const { lang } = useLanguage()

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
      if (!res.ok) throw new Error(data.error || (lang === 'DE' ? 'Upload fehlgeschlagen' : 'Upload failed'))
      setCvText(data.text || '')
    } catch (err) {
      setCvUploadError(err instanceof Error ? err.message : (lang === 'DE' ? 'Upload fehlgeschlagen' : 'Upload failed'))
    } finally {
      setCvUploading(false)
    }
  }

  const [phase, setPhase] = useState<Phase>('idle')
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null)
  const [mapping, setMapping] = useState<FieldMapping[]>([])
  const [log, setLog] = useState<LogEntry[]>([])
  const [liveShot, setLiveShot] = useState<string>('')
  const [confirmShot, setConfirmShot] = useState<string>('')
  const [previewShot, setPreviewShot] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [sessionId, setSessionId] = useState<string>('')
  const [fieldStatuses, setFieldStatuses] = useState<Record<string, boolean | null>>({})
  const logRef = useRef<HTMLDivElement>(null)
  const logCounter = useRef(0)

  const [targetJob, setTargetJob] = useState<{ title: string; company: string } | null>(null)

  useEffect(() => {
    const raw =
      sessionStorage.getItem('jl_cvb_tailored') ||
      sessionStorage.getItem('jl_sjs_cv_text') ||
      sessionStorage.getItem('jl_cv_text') ||
      ''
    const cv = flattenCvJson(raw)
    const cl = sessionStorage.getItem('jl_cl_letter') || ''
    setCvText(cv)
    setCoverLetter(cl)
    if (cl) setUseCoverLetter(true)
    try {
      const job = JSON.parse(sessionStorage.getItem('jl_cvb_job') || '{}')
      if (job?.job_title) setTargetJob({ title: job.job_title, company: job.employer_name || '' })
    } catch { /* no job in session */ }
  }, [])

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('demo') === '1') {
      setJobUrl(`${window.location.origin}/app/auto-apply/demo-form`)
      setMode('active')
    }
  }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [log])

  async function handleAnalyse() {
    if (!jobUrl.trim()) { setError(lang === 'DE' ? 'Bitte Bewerbungs-URL eingeben.' : 'Please enter the application URL.'); return }
    if (!cvText.trim()) { setError(lang === 'DE' ? 'Kein Lebenslauf gefunden. Bitte zuerst den CV Builder abschließen.' : 'No CV found. Please complete the CV Builder first.'); return }
    setError('')
    setPhase('analyzing')
    setAnalyzeResult(null)
    setMapping([])
    setSessionId('')
    setFieldStatuses({})

    try {
      const res = await fetch('/api/auto-apply/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobUrl: jobUrl.trim(),
          cvText,
          coverLetter: useCoverLetter ? coverLetter : '',
          market: 'eu',
        }),
      })
      const data: AnalyzeResult = await res.json()
      if (!res.ok) throw new Error((data as unknown as { error: string }).error || 'Analysis failed')

      if (data.requiresLogin) {
        setAnalyzeResult(data)
        setPhase('idle')
        setError(
          (lang === 'DE'
            ? 'Diese Seite erfordert einen Login. Bitte logge dich im Browser ein, navigiere zur eigentlichen Bewerbungsseite und kopiere die URL des Formulars (die URL nach dem Login).'
            : 'This page requires you to log in first. Open the URL in your browser, log into the company portal, navigate to the actual application form, then copy that URL and paste it here.'
          )
        )
        return
      }

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
                setConfirmShot(ev.confirmB64)
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
          } catch { /* ignore */ }
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
    setConfirmShot('')
    setPreviewShot('')
    setFieldStatuses({})
    setSessionId('')
    await streamEvents(
      '/api/auto-apply/execute',
      { jobUrl: jobUrl.trim(), mapping, cvText, coverLetter: useCoverLetter ? coverLetter : '' },
      () => {},
    )
  }

  async function handleConfirmSubmit() {
    if (!sessionId) {
      setError(lang === 'DE' ? 'Sitzung abgelaufen — bitte gehe zurück und fülle das Formular erneut aus.' : 'Session lost — please go back and re-fill the form.')
      setPhase('confirming')
      return
    }
    setPhase('submitting')
    setLog(prev => [...prev, { id: ++logCounter.current, type: 'log', message: lang === 'DE' ? 'Bestätigt — Bewerbung wird eingereicht…' : 'User confirmed — submitting application…' }])
    await streamEvents('/api/auto-apply/submit', { sessionId }, () => {})
  }

  function logToTracker() {
    const job = (() => {
      try { return JSON.parse(sessionStorage.getItem('jl_cvb_job') || '{}') } catch { return {} }
    })()
    const existing = JSON.parse(localStorage.getItem('jl_tracker') || '[]')
    const entry = {
      id: Date.now(),
      role: job.job_title || (lang === 'DE' ? 'Beworben via Auto-Bewerbung' : 'Applied via Auto Apply'),
      company: job.employer_name || new URL(jobUrl).hostname.replace('www.', ''),
      date: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }),
      notes: `${lang === 'DE' ? 'Auto-Bewerbung' : 'Auto Apply'} — ${jobUrl.slice(0, 60)}`,
      source: lang === 'DE' ? 'Auto-Bewerbung' : 'Auto Apply',
    }
    localStorage.setItem('jl_tracker', JSON.stringify([entry, ...existing]))
    router.push('/app/tracker')
  }

  const card: React.CSSProperties = {
    background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden',
  }
  const cardHead: React.CSSProperties = {
    padding: '12px 16px', borderBottom: `1px solid ${c.border}`,
    fontSize: 13, fontWeight: 700, color: c.primary, fontFamily: f.heading,
  }
  const label12: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: c.textMuted, marginBottom: 6, display: 'block',
  }

  const confidenceBadge = (conf: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      high:   { bg: c.successLight, color: c.success },
      medium: { bg: c.warningLight, color: c.warning },
      low:    { bg: c.errorLight,   color: c.error },
    }
    const s = map[conf] || map.low
    return (
      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700, background: s.bg, color: s.color }}>
        {conf}
      </span>
    )
  }

  const isUrlValid = jobUrl.trim().startsWith('http')
  const hasCv = cvText.trim().length > 50

  return (
    <div style={{ minHeight: '100vh', background: c.bg, fontFamily: f.body }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        .aa-input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1.5px solid ${c.borderLight}; font-size: 13px; font-family: inherit; outline: none; color: ${c.text}; box-sizing: border-box; transition: border-color 0.15s; background: transparent; }
        .aa-input:focus { border-color: ${c.accent}; }
        .aa-btn-primary { padding: 11px 28px; border-radius: 9px; background: ${g.primaryBtn}; color: #fff; border: none; cursor: pointer; font-family: ${f.heading}; font-size: 14px; font-weight: 700; transition: opacity 0.15s; }
        .aa-btn-primary:hover { opacity: 0.9; }
        .aa-btn-primary:disabled { background: ${c.border}; color: ${c.textFaint}; cursor: not-allowed; }
        .aa-btn-outline { padding: 10px 20px; border-radius: 9px; background: ${c.bgCard}; color: ${c.primary}; border: 1.5px solid ${c.primary}; cursor: pointer; font-family: ${f.heading}; font-size: 13px; font-weight: 700; }
        .aa-btn-success { padding: 11px 28px; border-radius: 9px; background: ${g.successBtn}; color: #fff; border: none; cursor: pointer; font-family: ${f.heading}; font-size: 14px; font-weight: 700; }
        .aa-toggle { position: relative; display: inline-block; width: 36px; height: 20px; }
        .aa-toggle input { opacity: 0; width: 0; height: 0; }
        .aa-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: ${c.borderLight}; border-radius: 20px; transition: 0.2s; }
        .aa-slider:before { position: absolute; content: ''; height: 14px; width: 14px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.2s; }
        input:checked + .aa-slider { background: ${c.accent}; }
        input:checked + .aa-slider:before { transform: translateX(16px); }
        .log-entry { display: flex; align-items: flex-start; gap: 8px; padding: 6px 0; border-bottom: 1px solid ${c.border}; font-size: 12px; color: ${c.text}; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .aa-grid { display: grid; grid-template-columns: 340px 1fr; gap: 20px; align-items: start; }
        .aa-field-grid { display: grid; grid-template-columns: 160px 1fr 70px; }
        .aa-steps-wrap { display: flex; align-items: center; gap: 0; background: ${c.bgCard}; border: 1px solid ${c.border}; border-radius: 10px; padding: 10px 18px; overflow: hidden; }
        @media (max-width: 768px) {
          .aa-grid { grid-template-columns: 1fr !important; }
          .aa-field-grid { grid-template-columns: 1fr 1fr !important; }
          .aa-steps-wrap { padding: 8px 10px; }
          .aa-step-label { display: none; }
          .aa-step-active-label { display: block !important; }
        }
      `}</style>

      <Navbar />

      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 20px' }}>

        {/* Page header */}
        <div style={{ marginBottom: 24, paddingLeft: 14, borderLeft: `3px solid ${c.accent}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.primary, fontFamily: f.heading }}>
              {lang === 'DE' ? 'Auto-Bewerbung' : 'Auto Apply'}
            </div>
            {targetJob ? (
              <div style={{ fontSize: 13, color: c.textMuted, marginTop: 3 }}>
                {lang === 'DE' ? 'Bewerbung für:' : 'Applying for:'}{' '}
                <strong style={{ color: c.primary }}>{targetJob.title}</strong>
                {targetJob.company && <> {lang === 'DE' ? 'bei' : 'at'} <strong style={{ color: c.accent }}>{targetJob.company}</strong></>}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: c.textMuted, marginTop: 3 }}>
                {mode === 'demo'
                  ? (lang === 'DE' ? 'Sieh, wie Kira eine echte Bewerbung ausfüllt — dann probiere es selbst' : 'See how Kira fills a real job application — then try it yourself')
                  : (lang === 'DE' ? 'Bewerbungs-URL einfügen und Kira das Formular ausfüllen lassen' : 'Paste a job application URL and let Kira fill the form for you')}
              </div>
            )}
          </div>
          {mode === 'active' && (
            <button
              onClick={() => { setMode('demo'); setPhase('idle'); setAnalyzeResult(null); setMapping([]); setError('') }}
              style={{ fontSize: 12, color: c.textMuted, background: 'transparent', border: `1px solid ${c.border}`, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: f.body }}
            >
              {lang === 'DE' ? '← Demo ansehen' : '← Watch demo'}
            </button>
          )}
        </div>

        {/* ── DEMO MODE ── */}
        {mode === 'demo' && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0 40px' }}>
            <AutoApplyDemoWidget
              market="eu"
              lang={lang}
              onTryItYourself={() => setMode('active')}
              onTryWithSample={() => {
                setJobUrl(`${window.location.origin}/app/auto-apply/demo-form`)
                setMode('active')
              }}
            />
          </div>
        )}

        {/* ── ACTIVE MODE ── */}
        {mode === 'active' && (
          <div className="aa-grid">

            {/* LEFT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Job URL */}
              <div style={card}>
                <div style={cardHead}>{lang === 'DE' ? 'Bewerbungs-URL eingeben' : 'Job Application URL'}</div>
                <div style={{ padding: 16 }}>
                  <label style={label12}>{lang === 'DE' ? 'Direkte URL des Bewerbungsformulars einfügen' : 'Paste the direct application form URL'}</label>
                  <input
                    className="aa-input"
                    value={jobUrl}
                    onChange={e => setJobUrl(e.target.value)}
                    placeholder="https://greenhouse.io/jobs/apply/..."
                    disabled={phase === 'analyzing' || phase === 'executing'}
                  />
                  {jobUrl && !isUrlValid && (
                    <div style={{ fontSize: 11, color: c.danger, marginTop: 4 }}>{lang === 'DE' ? 'Muss mit http beginnen' : 'Must start with http'}</div>
                  )}
                </div>
              </div>

              {/* CV status */}
              <div style={card}>
                <div style={cardHead}>{lang === 'DE' ? 'Dein Profil' : 'Your Profile'}</div>
                <div style={{ padding: 16 }}>
                  {hasCv ? (
                    <>
                      <div style={{ fontSize: 12, color: c.success, fontWeight: 600, marginBottom: 6 }}>
                        ✓ {lang === 'DE' ? `Lebenslauf geladen (${Math.round(cvText.length / 5)} Wörter)` : `CV loaded (${Math.round(cvText.length / 5)} words)`}
                      </div>
                      <div style={{ fontSize: 11, color: c.textMuted, lineHeight: 1.5, background: c.bgSubtle, borderRadius: 6, padding: '8px 10px', maxHeight: 60, overflow: 'hidden' }}>
                        {cvText.slice(0, 180)}…
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, cursor: 'pointer' }}>
                        <span style={{ fontSize: 11, color: c.textFaint }}>{lang === 'DE' ? 'Mit anderem Lebenslauf ersetzen →' : 'Replace with a different CV →'}</span>
                        <input type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }}
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleCvUpload(f) }}
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      {/* Upload drop zone */}
                      <label style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                        padding: '20px 16px', borderRadius: 10, cursor: 'pointer',
                        border: `2px dashed ${cvUploading ? c.accent : c.borderLight}`,
                        background: cvUploading ? c.primaryLight : c.bgSubtle,
                        transition: 'all 0.15s', marginBottom: 10,
                      }}>
                        {cvUploading ? (
                          <>
                            <svg className="spin" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2.5">
                              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                            </svg>
                            <span style={{ fontSize: 12, color: c.accent, fontWeight: 600 }}>{lang === 'DE' ? 'Text wird extrahiert…' : 'Extracting text…'}</span>
                          </>
                        ) : (
                          <>
                            <SvgIcon name="document" size={24} color={c.accent} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: c.primary }}>{lang === 'DE' ? 'Lebenslauf hochladen' : 'Upload your CV'}</span>
                            <span style={{ fontSize: 11, color: c.textMuted }}>{lang === 'DE' ? 'PDF, DOC, DOCX oder TXT · max. 10 MB' : 'PDF, DOC, DOCX or TXT · max 10 MB'}</span>
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
                        {lang === 'DE' ? 'Oder erstelle einen im ' : 'Or build one in '}
                        <span onClick={() => router.push('/app/cv-builder')} style={{ textDecoration: 'underline', cursor: 'pointer', color: c.accent }}>CV Builder</span>
                      </div>
                    </>
                  )}
                  <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: c.textMuted }}>{lang === 'DE' ? 'Anschreiben beifügen' : 'Include cover letter'}</span>
                    <label className="aa-toggle">
                      <input
                        type="checkbox"
                        checked={useCoverLetter}
                        onChange={e => setUseCoverLetter(e.target.checked)}
                        disabled={!coverLetter}
                      />
                      <span className="aa-slider" />
                    </label>
                  </div>
                  {!coverLetter && (
                    <div style={{ fontSize: 11, color: c.textFaint, marginTop: 4 }}>
                      {lang === 'DE' ? 'Erstelle eines im ' : 'Generate one in '}
                      <span onClick={() => router.push('/app/cover-letter')} style={{ textDecoration: 'underline', cursor: 'pointer', color: c.accent }}>{lang === 'DE' ? 'Anschreiben-Builder' : 'Cover Letter'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action */}
              <div>
                {error && (
                  <div style={{ fontSize: 12, color: c.error, background: c.errorLight, border: `1px solid ${c.errorBorder}`, borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                    {error}
                  </div>
                )}
                <button
                  className="aa-btn-primary"
                  style={{ width: '100%' }}
                  disabled={!isUrlValid || !hasCv || phase === 'analyzing' || phase === 'executing'}
                  onClick={handleAnalyse}
                >
                  {phase === 'analyzing' ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                      </svg>
                      {lang === 'DE' ? 'Analyse läuft…' : 'Analysing form…'}
                    </span>
                  ) : (lang === 'DE' ? 'Bewerbungsformular analysieren' : 'Analyse Form')}
                </button>

                {(phase === 'review' || phase === 'done') && (
                  <button
                    className="aa-btn-outline"
                    style={{ width: '100%', marginTop: 10 }}
                    onClick={() => { setPhase('idle'); setAnalyzeResult(null); setMapping([]); setError('') }}
                  >
                    {lang === 'DE' ? '← Neu starten' : '← Start over'}
                  </button>
                )}
              </div>

              {/* Info box */}
              <div style={{ background: c.primaryLight, border: `1px solid ${c.accentLight}`, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: c.primary, marginBottom: 4 }}>{lang === 'DE' ? 'So funktioniert es' : 'How it works'}</div>
                <ol style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: c.navy, lineHeight: 1.8 }}>
                  {lang === 'DE' ? (
                    <>
                      <li>Direkte URL des Bewerbungsformulars einfügen</li>
                      <li>Kira scannt die Felder per Browser-Automatisierung</li>
                      <li>Vorausgefüllte Werte prüfen &amp; bearbeiten</li>
                      <li>Starten klicken — Browser füllt &amp; sendet ab</li>
                    </>
                  ) : (
                    <>
                      <li>Paste the direct application form URL</li>
                      <li>Kira scans the form fields via browser automation</li>
                      <li>Review &amp; edit the pre-filled values</li>
                      <li>Click Launch &mdash; browser fills &amp; submits</li>
                    </>
                  )}
                </ol>
                <div style={{ fontSize: 10, color: c.textMuted, marginTop: 8 }}>
                  {lang === 'DE' ? 'Kostet 3 Credits pro Formularanalyse. Datei-Upload-Felder müssen manuell befüllt werden.' : 'Costs 3 credits per form analysis. File upload fields need manual upload.'}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* ── Phase step indicator ── */}
              {phase !== 'idle' && (() => {
                const steps: { key: Phase; label: string }[] = [
                  { key: 'analyzing',  label: lang === 'DE' ? 'Analyse' : 'Analyse' },
                  { key: 'review',     label: lang === 'DE' ? 'Prüfen' : 'Review' },
                  { key: 'executing',  label: lang === 'DE' ? 'Ausfüllen' : 'Fill' },
                  { key: 'confirming', label: lang === 'DE' ? 'Bestätigen' : 'Confirm' },
                  { key: 'submitting', label: lang === 'DE' ? 'Einreichen' : 'Submit' },
                  { key: 'done',       label: lang === 'DE' ? 'Fertig' : 'Done' },
                ]
                const order = steps.map(s => s.key)
                const currentIdx = order.indexOf(phase)
                return (
                  <div className="aa-steps-wrap">
                    <div className="aa-step-active-label" style={{ display: 'none', fontSize: 12, fontWeight: 700, color: c.accent, padding: '0 4px' }}>
                      {lang === 'DE' ? `Schritt ${currentIdx + 1} von ${steps.length} — ${steps[currentIdx]?.label}` : `Step ${currentIdx + 1} of ${steps.length} — ${steps[currentIdx]?.label}`}
                    </div>
                    {steps.map((s, i) => {
                      const done   = i < currentIdx
                      const active = i === currentIdx
                      return (
                        <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                            <div style={{
                              width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: done ? c.success : active ? c.accent : c.border,
                              color: done || active ? '#fff' : c.textFaint,
                              fontSize: 11, fontWeight: 700, flexShrink: 0,
                              boxShadow: active ? `0 0 0 3px ${c.accentLight}` : 'none',
                            }}>
                              {done ? '✓' : i + 1}
                            </div>
                            <div className="aa-step-label" style={{ fontSize: 10, color: done ? c.success : active ? c.accent : c.textFaint, fontWeight: active ? 700 : 400, whiteSpace: 'nowrap' }}>
                              {s.label}
                            </div>
                          </div>
                          {i < steps.length - 1 && (
                            <div style={{ flex: 1, height: 2, background: i < currentIdx ? c.success : c.border, marginBottom: 18, minWidth: 8 }} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}

              {phase === 'idle' && !analyzeResult && (
                <div style={{ ...card, padding: '60px 20px', textAlign: 'center' }}>
                  <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ margin: '0 auto 16px' }}>
                    <circle cx="26" cy="26" r="25" fill={c.primaryLight}/>
                    <path d="M18 26h16M26 18v16" stroke={c.accent} strokeWidth="2.5" strokeLinecap="round"/>
                    <circle cx="26" cy="26" r="10" stroke={c.primary} strokeWidth="1.5" fill="none" strokeDasharray="4 2"/>
                  </svg>
                  <div style={{ fontSize: 15, fontWeight: 600, color: c.primary, marginBottom: 6 }}>
                    {lang === 'DE' ? 'Bewerbungs-URL eingeben, um zu starten' : 'Enter a job application URL to begin'}
                  </div>
                  <div style={{ fontSize: 13, color: c.textMuted }}>
                    {lang === 'DE' ? 'URL des eigentlichen Bewerbungsformulars einfügen (nicht die Stellenanzeige)' : 'Paste the URL of the actual application form (not the job listing)'}
                  </div>
                </div>
              )}

              {phase === 'analyzing' && (
                <div style={{ ...card, padding: '50px 20px', textAlign: 'center' }}>
                  <svg className="spin" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" style={{ margin: '0 auto 16px' }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  <div style={{ fontSize: 14, fontWeight: 600, color: c.primary }}>{lang === 'DE' ? 'Seite wird per Browser-Automatisierung geöffnet…' : 'Opening page with browser automation…'}</div>
                  <div style={{ fontSize: 12, color: c.textMuted, marginTop: 6 }}>{lang === 'DE' ? 'Formularfelder werden extrahiert und mit deinem Lebenslauf abgeglichen' : 'Extracting form fields and mapping your CV'}</div>
                </div>
              )}

              {phase === 'confirming' && previewShot && (
                <div style={{ ...card, overflow: 'hidden' }}>
                  {mapping.some(m => m.field.type === 'password') && (
                    <div style={{ padding: '12px 16px', background: '#fef2f2', borderBottom: `1px solid #fca5a5` }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#b91c1c', marginBottom: 4 }}>
                        🚫 {lang === 'DE' ? 'Das ist kein Bewerbungsformular!' : 'This is not a job application form!'}
                      </div>
                      <div style={{ fontSize: 12, color: '#7f1d1d', lineHeight: 1.6 }}>
                        {lang === 'DE'
                          ? 'Die Seite enthält Passwortfelder — es handelt sich um ein Login- oder Registrierungsformular, nicht um eine Bewerbung. Logge dich im Browser auf der Unternehmenswebsite ein, navigiere dann zum eigentlichen Bewerbungsformular und kopiere diese URL.'
                          : 'This page contains password fields — it\'s a login or registration form, not a job application. Log in to the company portal in your browser, navigate to the actual application form, then paste that URL here.'}
                      </div>
                      <button
                        style={{ marginTop: 10, fontSize: 12, fontWeight: 700, padding: '7px 16px', background: '#b91c1c', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
                        onClick={() => { setPhase('idle'); setAnalyzeResult(null); setMapping([]); setPreviewShot('') }}
                      >
                        {lang === 'DE' ? '← Zurück zur URL-Eingabe' : '← Back to URL input'}
                      </button>
                    </div>
                  )}
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid ${c.border}`, background: c.warningLight }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: c.primary, fontFamily: f.heading }}>
                      {lang === 'DE' ? '⚠ Ausgefülltes Formular prüfen — du klickst auf Einreichen' : '⚠ Review filled form — confirm to submit'}
                    </div>
                    <div style={{ fontSize: 11, color: c.textMuted, marginTop: 3 }}>
                      {lang === 'DE'
                        ? 'Kira hat alle erreichbaren Felder ausgefüllt. Überprüfe die Vorschau sorgfältig. Datei-Upload-Felder (CV, Anschreiben) musst du auf der Live-Seite manuell hochladen, bevor du klickst.'
                        : 'Kira has filled all reachable fields. Carefully review the preview. File upload fields (CV, cover letter) must be manually uploaded on the live page before you click Submit.'}
                    </div>
                  </div>
                  <div style={{ padding: '12px 16px' }}>
                    <img
                      src={`data:image/png;base64,${previewShot}`}
                      alt="Filled form preview"
                      style={{ width: '100%', borderRadius: 6, border: `1px solid ${c.border}`, marginBottom: 14 }}
                    />
                    <div style={{ background: c.bgSubtle, borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 12, color: c.textMuted, lineHeight: 1.7 }}>
                      <strong style={{ color: c.primary }}>{lang === 'DE' ? 'Checkliste vor dem Einreichen:' : 'Before you submit:'}</strong>
                      <ul style={{ margin: '6px 0 0', paddingLeft: 16 }}>
                        <li>{lang === 'DE' ? 'Alle Pflichtfelder (*) ausgefüllt?' : 'All required fields (*) filled correctly?'}</li>
                        <li>{lang === 'DE' ? 'CV-Datei hochgeladen (falls vom Formular verlangt)?' : 'CV file uploaded (if the form requires a file)?'}</li>
                        <li>{lang === 'DE' ? 'Anschreiben angehängt (falls vorhanden)?' : 'Cover letter attached (if applicable)?'}</li>
                        <li>{lang === 'DE' ? 'Einwilligungen / DSGVO akzeptiert?' : 'Any consent / GDPR checkboxes ticked?'}</li>
                      </ul>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button className="aa-btn-primary" style={{ flex: 1 }} onClick={handleConfirmSubmit}>
                        {lang === 'DE' ? '✓ Alles geprüft — Bewerbung einreichen' : '✓ All checked — Submit Application'}
                      </button>
                      <button
                        className="aa-btn-outline"
                        onClick={() => { setPhase('review'); setPreviewShot('') }}
                      >
                        {lang === 'DE' ? '← Felder bearbeiten' : '← Edit fields'}
                      </button>
                    </div>
                    <div style={{ marginTop: 10, fontSize: 11, color: c.textMuted }}>
                      {lang === 'DE'
                        ? 'Hinweis: Nach dem Einreichen siehst du einen Bestätigungs-Screenshot. Prüfe außerdem deine E-Mails auf eine Bestätigungs-E-Mail der Firma.'
                        : 'Note: After submitting you\'ll see a confirmation screenshot. Also check your inbox for a confirmation email from the company.'}
                    </div>
                  </div>
                </div>
              )}

              {(phase === 'review' || phase === 'executing' || phase === 'confirming' || phase === 'submitting' || phase === 'done') && analyzeResult && (
                <>
                  <div style={{ ...card }}>
                    <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: c.primary, fontFamily: f.heading }}>
                          {analyzeResult.pageTitle || new URL(jobUrl).hostname}
                        </div>
                        <div style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>{jobUrl.slice(0, 70)}{jobUrl.length > 70 ? '…' : ''}</div>
                      </div>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: c.primaryLight, color: c.navy, fontWeight: 700 }}>
                          {analyzeResult.formType}
                        </span>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: c.bg, color: c.textMuted, fontWeight: 600 }}>
                          {analyzeResult.fields.length} {lang === 'DE' ? 'Felder' : 'fields'}
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
                    <div style={{ ...cardHead, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{lang === 'DE' ? 'Feldzuordnung — Werte prüfen & bearbeiten' : 'Field Mapping — review & edit values'}</span>
                      <span style={{ fontSize: 11, fontWeight: 400, color: c.textMuted }}>
                        {mapping.filter(m => m.value && m.value !== '__SKIP_FILE__').length} / {mapping.length} {lang === 'DE' ? 'ausgefüllt' : 'filled'}
                      </span>
                    </div>
                    <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                      <div className="aa-field-grid" style={{ padding: '8px 16px', background: c.bgSubtle, borderBottom: `1px solid ${c.border}` }}>
                        {(lang === 'DE' ? ['Feld', 'Wert', 'Konfidenz'] : ['Field', 'Value', 'Confidence']).map(h => (
                          <div key={h} style={{ fontSize: 10, fontWeight: 700, color: c.textFaint, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</div>
                        ))}
                      </div>
                      {mapping.map((m, idx) => (
                        <div key={`field-${idx}`} className="aa-field-grid" style={{ padding: '8px 16px', borderBottom: `1px solid ${c.border}`, alignItems: 'center', background: m.field.required && !m.value ? c.warningLight : undefined }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: c.text }}>
                              {m.field.label}
                              {m.field.required && <span style={{ color: c.danger, marginLeft: 2 }}>*</span>}
                            </div>
                            <div style={{ fontSize: 10, color: c.textFaint, textTransform: 'uppercase' }}>{m.field.type}</div>
                          </div>
                          <div style={{ paddingRight: 12 }}>
                            {m.value === '__CV_FILE__' ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: c.success, fontWeight: 600 }}><SvgIcon name="clipboard" size={13} color={c.success} /> {lang === 'DE' ? 'Lebenslauf-Datei wird angehängt' : 'Will attach CV text file'}</span>
                            ) : m.value === '__CL_FILE__' ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: c.success, fontWeight: 600 }}><SvgIcon name="clipboard" size={13} color={c.success} /> {lang === 'DE' ? 'Anschreiben-Datei wird angehängt' : 'Will attach cover letter file'}</span>
                            ) : m.value === '__SKIP_FILE__' ? (
                              <span style={{ fontSize: 11, color: c.textMuted, fontStyle: 'italic' }}>{lang === 'DE' ? 'Datei-Upload — manuell hochladen' : 'File upload — upload manually'}</span>
                            ) : m.field.type === 'select' && m.field.options ? (
                              <select
                                className="aa-input"
                                style={{ fontSize: 12, padding: '6px 10px' }}
                                value={m.value}
                                onChange={e => updateValue(idx, e.target.value)}
                                disabled={phase === 'executing'}
                              >
                                <option value="">{lang === 'DE' ? '-- auswählen --' : '-- select --'}</option>
                                {m.field.options.map((o, oi) => <option key={`${oi}-${o}`} value={o}>{o}</option>)}
                              </select>
                            ) : m.field.type === 'textarea' ? (
                              <textarea
                                className="aa-input"
                                rows={3}
                                style={{ fontSize: 12, resize: 'vertical', minHeight: 56 }}
                                value={m.value}
                                onChange={e => updateValue(idx, e.target.value)}
                                disabled={phase === 'executing'}
                              />
                            ) : (
                              <input
                                className="aa-input"
                                style={{ fontSize: 12, padding: '6px 10px' }}
                                value={m.value}
                                onChange={e => updateValue(idx, e.target.value)}
                                disabled={phase === 'executing'}
                                placeholder={m.field.placeholder || ''}
                              />
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
                          🚫 {lang === 'DE' ? 'Das ist kein Bewerbungsformular' : 'This is not a job application form'}
                        </div>
                        <div style={{ fontSize: 12, color: '#7f1d1d', lineHeight: 1.6, marginBottom: 10 }}>
                          {lang === 'DE'
                            ? 'Die Seite enthält Passwortfelder — es handelt sich um ein Login- oder Registrierungsformular. Logge dich auf der Unternehmenswebsite ein, navigiere zum eigentlichen Bewerbungsformular und kopiere diese URL.'
                            : 'This page has password fields — it\'s a login or registration form, not a job application. Log into the company portal in your browser, find the actual application form, then paste that URL here.'}
                        </div>
                        <button
                          className="aa-btn-outline"
                          style={{ width: '100%' }}
                          onClick={() => { setPhase('idle'); setAnalyzeResult(null); setMapping([]); setError('') }}
                        >
                          {lang === 'DE' ? '← Andere URL eingeben' : '← Enter a different URL'}
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button className="aa-btn-primary" style={{ flex: 1 }} onClick={handleExecute}>
                          {lang === 'DE' ? 'Formular ausfüllen (zuerst Vorschau) →' : 'Fill Form (Preview First) →'}
                        </button>
                        <a
                          href={jobUrl} target="_blank" rel="noopener noreferrer"
                          style={{ flex: '0 0 auto', padding: '11px 20px', borderRadius: 9, background: c.bgCard, color: c.primary, border: `1.5px solid ${c.primary}`, textDecoration: 'none', fontFamily: f.heading, fontSize: 13, fontWeight: 700 }}
                        >
                          {lang === 'DE' ? 'Manuell öffnen' : 'Open manually'}
                        </a>
                      </div>
                    )
                  )}

                  {phase === 'done' && (
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button className="aa-btn-success" style={{ flex: 1 }} onClick={logToTracker}>
                        {lang === 'DE' ? '✓ Im Tracker speichern →' : '✓ Log to Tracker →'}
                      </button>
                      <button
                        className="aa-btn-outline"
                        onClick={() => { setPhase('idle'); setAnalyzeResult(null); setMapping([]); setLog([]); setLiveShot(''); setConfirmShot('') }}
                      >
                        {lang === 'DE' ? 'Weitere Bewerbung' : 'Apply another'}
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* ── Live field fill status table (during execution) ── */}
              {(phase === 'executing' || phase === 'confirming') && Object.keys(fieldStatuses).length > 0 && (
                <div style={card}>
                  <div style={cardHead}>{lang === 'DE' ? 'Feld-Füllstatus' : 'Field Fill Status'}</div>
                  <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                    {Object.entries(fieldStatuses).map(([label, success]) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 16px', borderBottom: `1px solid ${c.border}` }}>
                        <span style={{ fontSize: 14, flexShrink: 0 }}>
                          {success === null ? <svg className="spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> : success ? '✓' : '⚠'}
                        </span>
                        <span style={{ fontSize: 12, color: success === null ? c.textMuted : success ? c.success : c.warning, flex: 1 }}>{label}</span>
                        <span style={{ fontSize: 10, color: c.textFaint }}>
                          {success === null ? (lang === 'DE' ? 'wird ausgefüllt…' : 'filling…') : success ? (lang === 'DE' ? 'ausgefüllt' : 'filled') : (lang === 'DE' ? 'übersprungen' : 'skipped')}
                        </span>
                      </div>
                    ))}
                  </div>
                  {phase === 'confirming' && (() => {
                    const failed = Object.entries(fieldStatuses).filter(([, s]) => s === false)
                    return failed.length > 0 ? (
                      <div style={{ padding: '10px 16px', background: c.warningLight, borderTop: `1px solid ${c.warningBorder ?? c.border}` }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: c.warning, marginBottom: 4 }}>
                          {lang === 'DE'
                            ? `${failed.length} Feld${failed.length > 1 ? 'er konnten' : ' konnte'} nicht automatisch ausgefüllt werden — prüfe die Vorschau und fülle sie manuell aus:`
                            : `${failed.length} field${failed.length > 1 ? 's' : ''} could not be auto-filled — check the preview and fill manually if required:`}
                        </div>
                        <div style={{ fontSize: 11, color: c.warning }}>{failed.map(([l]) => l).join(' · ')}</div>
                      </div>
                    ) : null
                  })()}
                </div>
              )}

              {(phase === 'executing' || phase === 'submitting' || (phase === 'done' && log.length > 0)) && (
                <div style={card}>
                  <div style={{ ...cardHead, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {(phase === 'executing' || phase === 'submitting') && <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>}
                    {phase === 'done' ? (lang === 'DE' ? '✓ Abgeschlossen' : '✓ Completed') : phase === 'submitting' ? (lang === 'DE' ? 'Wird eingereicht…' : 'Submitting…') : (lang === 'DE' ? 'Live-Protokoll' : 'Live Log')}
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
                        {phase === 'done' ? (lang === 'DE' ? 'Bestätigungs-Screenshot' : 'Confirmation screenshot') : (lang === 'DE' ? 'Aktueller Stand' : 'Current state')}
                      </div>
                      <img
                        src={`data:image/png;base64,${liveShot}`}
                        alt="Live browser state"
                        style={{ width: '100%', borderRadius: 6, border: `1px solid ${c.border}` }}
                      />
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
