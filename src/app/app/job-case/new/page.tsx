'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../components/Navbar'
import { c, f, sh, g } from '@/lib/theme'
import { JOB_CASE } from '@/lib/constants'
import AdminGate from '@/components/AdminGate'

// ── Types ────────────────────────────────────────────────────────────────────

type Step = 'paste' | 'analysing' | 'review' | 'consent' | 'evidence' | 'questions' | 'video' | 'test' | 'generating' | 'done'

type Requirement = { id: string; skill: string; description: string; essential: boolean }
type Evidence    = { requirementId: string; text: string; url: string }
type Question    = { question: string; skill_being_tested: string }
type JobQuality  = 'clear' | 'vague' | 'poor'

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_REQS: Requirement[] = [
  { id: '1', skill: 'React / Next.js',   description: '3+ years building production React apps with SSR.',        essential: true  },
  { id: '2', skill: 'TypeScript',         description: 'Strong TypeScript including generics and type narrowing.', essential: true  },
  { id: '3', skill: 'Node.js & APIs',     description: 'Experience designing RESTful APIs with Node.js.',         essential: true  },
  { id: '4', skill: 'PostgreSQL',         description: 'Complex queries and schema design.',                       essential: true  },
  { id: '5', skill: 'CI/CD',             description: 'Familiar with GitHub Actions or similar pipelines.',       essential: false },
  { id: '6', skill: 'Team communication', description: 'Articulate technical decisions to non-engineers.',        essential: false },
]

const MOCK_QUESTIONS: Question[] = [
  { question: 'You claimed experience with Next.js App Router. Describe a specific performance challenge you solved using Server Components — what was the problem, what did you change, and what was the measurable outcome?', skill_being_tested: 'React / Next.js' },
  { question: 'Walk me through a PostgreSQL schema you designed for a feature with complex relationships. What trade-offs did you make?', skill_being_tested: 'PostgreSQL' },
  { question: 'You discover a third-party API you depend on is changing its response format in 48 hours. How do you handle it and communicate it to the team?', skill_being_tested: 'Team communication' },
]

// ── Shared styles ─────────────────────────────────────────────────────────────

const SHARED_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  textarea { resize: vertical; }
  textarea:focus, input:focus { outline: none; }
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes jcPulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
  @keyframes jcFadeUp { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
  .jc-fade { animation: jcFadeUp 0.3s ease; }
  .jc-input {
    background: #fff;
    border: 1px solid ${c.border};
    border-radius: 8px; padding: 9px 12px;
    color: ${c.text}; font-family: ${f.body}; font-size: 13px; width: 100%;
    transition: border-color 0.15s;
  }
  .jc-input:focus { border-color: ${c.accent}; box-shadow: 0 0 0 3px rgba(55,138,221,0.10); }
  .jc-input::placeholder { color: ${c.textFaint}; }
  .jc-btn {
    background: ${g.button};
    color: #fff; border: none; border-radius: 8px;
    padding: 10px 20px; font-size: 13px; font-weight: 700;
    cursor: pointer; font-family: ${f.heading}; transition: opacity 0.15s;
    display: inline-flex; align-items: center; gap: 6px;
    box-shadow: ${sh.glow};
  }
  .jc-btn:hover { opacity: 0.88; }
  .jc-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .jc-btn-ghost {
    background: transparent;
    color: ${c.textMuted};
    border: 1px solid ${c.border};
    border-radius: 8px; padding: 9px 18px; font-size: 13px;
    cursor: pointer; font-family: ${f.body}; transition: all 0.15s;
    font-weight: 500;
  }
  .jc-btn-ghost:hover { background: ${c.bg}; color: ${c.text}; border-color: ${c.borderLight}; }
  .jc-check { width: 16px; height: 16px; accent-color: ${c.accent}; cursor: pointer; flex-shrink: 0; }
  @media (max-width: 600px) { .jc-row { flex-direction: column !important; } }
`

// ── Small components ──────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${c.border}`, borderRadius: 12, padding: '24px', boxShadow: sh.card, ...style }}>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' as const, color: c.textMuted, margin: '0 0 6px' }}>
      {children}
    </p>
  )
}

function StepHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontFamily: f.heading, fontSize: 20, fontWeight: 700, color: c.primary, margin: 0 }}>{title}</h2>
      <p style={{ fontSize: 13, color: c.textMuted, margin: '5px 0 0', lineHeight: 1.6 }}>{sub}</p>
    </div>
  )
}

function QualityBadge({ q }: { q: JobQuality }) {
  const map = {
    clear: { label: 'Clear posting',  color: c.success, bg: 'rgba(29,158,117,0.08)',  border: 'rgba(29,158,117,0.2)' },
    vague: { label: 'Vague posting',  color: c.warning, bg: 'rgba(186,117,23,0.08)', border: 'rgba(186,117,23,0.2)' },
    poor:  { label: 'Poor posting',   color: c.danger,  bg: 'rgba(226,75,74,0.08)',   border: 'rgba(226,75,74,0.2)' },
  }
  const m = map[q]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, background: m.bg, color: m.color, fontSize: 11, fontWeight: 700, border: `1px solid ${m.border}` }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.color }} />{m.label}
    </span>
  )
}

function StepProgress({ step }: { step: Step }) {
  const ordered: Step[] = ['paste', 'review', 'consent', 'evidence', 'questions', 'video', 'test', 'done']
  const labels = ['Job posting', 'Review', 'Consent', 'Evidence', 'Questions', 'Video', 'Skill test', 'Done']
  const current = step === 'analysing' ? 0 : step === 'generating' ? 7 : ordered.indexOf(step)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28, overflowX: 'auto', paddingBottom: 4 }}>
      {ordered.map((s, i) => {
        const done   = i < current
        const active = i === current
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? c.success : active ? c.accent : '#fff',
                border: `1.5px solid ${done ? c.success : active ? c.accent : c.border}`,
                fontSize: 10, fontWeight: 700,
                color: done || active ? '#fff' : c.textFaint,
                boxShadow: active ? sh.glow : 'none',
                transition: 'all 0.3s',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 9, color: active ? c.accent : done ? c.success : c.textFaint, fontWeight: active ? 700 : 400, whiteSpace: 'nowrap', letterSpacing: 0.3 }}>
                {labels[i]}
              </span>
            </div>
            {i < ordered.length - 1 && (
              <div style={{ width: 24, height: 1.5, background: done ? c.success : c.border, margin: '0 3px', marginBottom: 14, transition: 'background 0.3s', flexShrink: 0 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function Spinner({ light = false }: { light?: boolean }) {
  const base = light ? 'rgba(255,255,255,0.2)' : 'rgba(55,138,221,0.2)'
  const top  = light ? '#fff' : c.accent
  return <div style={{ width: 16, height: 16, border: `2px solid ${base}`, borderTopColor: top, borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block', flexShrink: 0 }} />
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function JobCaseNewPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('paste')

  const [jobText, setJobText]        = useState('')
  const [jobUrl, setJobUrl]          = useState('')
  const [quality]                    = useState<JobQuality>('clear')
  const [matchScore]                 = useState(72)
  const [jobTitle]                   = useState('Senior Frontend Engineer')
  const [company]                    = useState('Acme GmbH')
  const [reqs, setReqs]              = useState<Requirement[]>([])
  const [consent, setConsent]        = useState({ video: false, test: false, tracking: false })
  const [evidence, setEvidence]      = useState<Evidence[]>([])
  const [questions]                  = useState<Question[]>(MOCK_QUESTIONS)

  const [countdown, setCountdown]    = useState(0)
  const [recording, setRecording]    = useState(false)
  const [elapsed, setElapsed]        = useState(0)
  const [videoBlob, setVideoBlob]    = useState<Blob | null>(null)
  const [videoUrl, setVideoUrl]      = useState('')
  const liveRef    = useRef<HTMLVideoElement>(null)
  const previewRef = useRef<HTMLVideoElement>(null)
  const mrRef      = useRef<MediaRecorder | null>(null)
  const chunksRef  = useRef<Blob[]>([])
  const streamRef  = useRef<MediaStream | null>(null)
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null)

  const [testStarted, setTestStarted] = useState(false)
  const [timeLeft, setTimeLeft]       = useState(JOB_CASE.testMinutes * 60)
  const [currentQ, setCurrentQ]       = useState(0)
  const [answers, setAnswers]         = useState(['', '', ''])
  const [tabSwitches, setTabSwitches] = useState(0)
  const [submitted, setSubmitted]     = useState(false)

  function analyse() {
    if (!jobText.trim() && !jobUrl.trim()) return
    setStep('analysing')
    setTimeout(() => {
      setReqs(MOCK_REQS)
      setEvidence(MOCK_REQS.map(r => ({ requirementId: r.id, text: '', url: '' })))
      setStep('review')
    }, 2000)
  }

  async function startCountdown() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    streamRef.current = stream
    if (liveRef.current) { liveRef.current.srcObject = stream; liveRef.current.muted = true; liveRef.current.play() }
    setCountdown(3)
    let n = 3
    const iv = setInterval(() => { n--; setCountdown(n); if (n === 0) { clearInterval(iv); beginRecording(stream) } }, 1000)
  }

  function beginRecording(stream: MediaStream) {
    chunksRef.current = []
    const mr = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' })
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      setVideoBlob(blob)
      setVideoUrl(URL.createObjectURL(blob))
      setRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
      stream.getTracks().forEach(t => t.stop())
    }
    mr.start()
    mrRef.current = mr
    setRecording(true)
    setElapsed(0)
    timerRef.current = setInterval(() => {
      setElapsed(e => {
        if (e + 1 >= JOB_CASE.videoMaxSeconds) { mr.stop(); return JOB_CASE.videoMaxSeconds }
        return e + 1
      })
    }, 1000)
  }

  useEffect(() => {
    if (!testStarted || submitted) return
    const iv = setInterval(() => setTimeLeft(t => { if (t <= 1) { clearInterval(iv); setSubmitted(true); return 0 } return t - 1 }), 1000)
    return () => clearInterval(iv)
  }, [testStarted, submitted])

  useEffect(() => {
    if (!testStarted || submitted) return
    const fn = () => { if (document.hidden) setTabSwitches(n => n + 1) }
    document.addEventListener('visibilitychange', fn)
    return () => document.removeEventListener('visibilitychange', fn)
  }, [testStarted, submitted])

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const allConsent = consent.video && consent.test && consent.tracking

  return (
    <AdminGate>
      <>
        <style>{SHARED_CSS}</style>
        <Navbar />

        <div style={{ minHeight: 'calc(100vh - 52px)', background: c.bg, fontFamily: f.body, color: c.text }}>
          <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px 80px' }}>
            <StepProgress step={step} />

            {/* ── PASTE ──────────────────────────────────────────────────── */}
            {(step === 'paste' || step === 'analysing') && (
              <div className="jc-fade">
                <SectionLabel>Step 1 of 7</SectionLabel>
                <StepHeading
                  title="Paste the job posting"
                  sub="Add the full description or a URL. AI extracts what the role actually requires."
                />
                <Card>
                  <input
                    className="jc-input"
                    placeholder="Job URL (optional)"
                    value={jobUrl}
                    onChange={e => setJobUrl(e.target.value)}
                    style={{ marginBottom: 10 }}
                  />
                  <textarea
                    className="jc-input"
                    placeholder="Paste the full job description here…"
                    rows={10}
                    value={jobText}
                    onChange={e => setJobText(e.target.value)}
                    style={{ minHeight: 200 }}
                  />
                  <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
                    {step === 'analysing' ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: c.textMuted, fontSize: 13 }}>
                        <Spinner /> Analysing job description…
                      </span>
                    ) : (
                      <button className="jc-btn" onClick={analyse} disabled={!jobText.trim() && !jobUrl.trim()}>
                        Analyse →
                      </button>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* ── REVIEW ─────────────────────────────────────────────────── */}
            {step === 'review' && (
              <div className="jc-fade">
                <SectionLabel>Step 2 of 7</SectionLabel>
                <StepHeading
                  title="Review the analysis"
                  sub="Confirm the requirements look right before you spend credits."
                />
                <Card style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontFamily: f.heading, fontSize: 16, fontWeight: 700, color: c.text, marginBottom: 6 }}>{jobTitle} · {company}</div>
                      <QualityBadge q={quality} />
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: f.heading, fontSize: 34, fontWeight: 700, color: c.accent, lineHeight: 1 }}>{matchScore}%</div>
                      <div style={{ fontSize: 11, color: c.textFaint, marginTop: 2 }}>profile match</div>
                    </div>
                  </div>

                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: c.textMuted, marginBottom: 10 }}>Requirements</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {reqs.map(r => (
                      <div key={r.id} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: c.bg, borderRadius: 8, border: `1px solid ${c.border}` }}>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: r.essential ? c.primaryLight : c.bg, color: r.essential ? c.accent : c.textFaint, fontWeight: 700, flexShrink: 0, alignSelf: 'flex-start', marginTop: 1, border: `1px solid ${r.essential ? 'rgba(55,138,221,0.2)' : c.border}` }}>
                          {r.essential ? 'Essential' : 'Preferred'}
                        </span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{r.skill}</div>
                          <div style={{ fontSize: 12, color: c.textMuted, marginTop: 2, lineHeight: 1.5 }}>{r.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 16, padding: '11px 14px', background: c.primaryLight, border: `1px solid rgba(55,138,221,0.2)`, borderRadius: 8, fontSize: 13, color: c.textMuted, lineHeight: 1.6 }}>
                    Building this Job Case costs <strong style={{ color: c.primary }}>{JOB_CASE.creditCost} credits</strong>. You'll preview the 3 skill test questions before any credits are deducted.
                  </div>
                </Card>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="jc-btn-ghost" onClick={() => setStep('paste')}>← Back</button>
                  <button className="jc-btn" onClick={() => setStep('consent')}>Looks good →</button>
                </div>
              </div>
            )}

            {/* ── CONSENT ────────────────────────────────────────────────── */}
            {step === 'consent' && (
              <div className="jc-fade">
                <SectionLabel>Step 3 of 7</SectionLabel>
                <StepHeading
                  title="Your consent"
                  sub="All three are required. Everything is hard-deleted after 30 days."
                />
                <Card>
                  {[
                    { key: 'video'    as const, label: 'Video storage', text: 'I consent to my video pitch being stored for 30 days and shared with recruiters who access this Job Case via the link I provide.' },
                    { key: 'test'     as const, label: 'Test answers',  text: 'I consent to my skill test answers and scores being stored for 30 days and shown to recruiters who access this Job Case.' },
                    { key: 'tracking' as const, label: 'View tracking', text: 'I consent to Job-Lens recording the email domain of recruiters who view my Job Case, and notifying me when a view occurs.' },
                  ].map((item, i) => (
                    <label key={item.key} style={{ display: 'flex', gap: 12, cursor: 'pointer', paddingBottom: i < 2 ? 18 : 0, marginBottom: i < 2 ? 18 : 0, borderBottom: i < 2 ? `1px solid ${c.border}` : 'none' }}>
                      <input type="checkbox" className="jc-check" checked={consent[item.key]} onChange={e => setConsent(p => ({ ...p, [item.key]: e.target.checked }))} style={{ marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: c.text, marginBottom: 3 }}>{item.label}</div>
                        <div style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.6 }}>{item.text}</div>
                      </div>
                    </label>
                  ))}
                </Card>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                  <button className="jc-btn-ghost" onClick={() => setStep('review')}>← Back</button>
                  <button className="jc-btn" disabled={!allConsent} onClick={() => setStep('evidence')}>Continue →</button>
                </div>
              </div>
            )}

            {/* ── EVIDENCE ───────────────────────────────────────────────── */}
            {step === 'evidence' && (
              <div className="jc-fade">
                <SectionLabel>Step 4 of 7</SectionLabel>
                <StepHeading
                  title="Map your evidence"
                  sub="For each requirement, add your strongest proof. Be specific — vague answers score poorly."
                />
                <Card>
                  {reqs.map((r, i) => {
                    const ev = evidence[i] ?? { requirementId: r.id, text: '', url: '' }
                    return (
                      <div key={r.id} style={{ paddingBottom: i < reqs.length - 1 ? 22 : 0, marginBottom: i < reqs.length - 1 ? 22 : 0, borderBottom: i < reqs.length - 1 ? `1px solid ${c.border}` : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: r.essential ? c.primaryLight : c.bg, color: r.essential ? c.accent : c.textFaint, fontWeight: 700, border: `1px solid ${r.essential ? 'rgba(55,138,221,0.2)' : c.border}` }}>
                            {r.essential ? 'Essential' : 'Preferred'}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{r.skill}</span>
                        </div>
                        <p style={{ fontSize: 12, color: c.textMuted, margin: '0 0 10px', lineHeight: 1.5 }}>{r.description}</p>
                        <textarea
                          className="jc-input"
                          placeholder="Describe your specific experience…"
                          rows={3}
                          value={ev.text}
                          onChange={e => { const u = [...evidence]; u[i] = { ...ev, text: e.target.value }; setEvidence(u) }}
                          style={{ marginBottom: 8 }}
                        />
                        <input
                          className="jc-input"
                          placeholder="Project or portfolio URL (optional)"
                          value={ev.url}
                          onChange={e => { const u = [...evidence]; u[i] = { ...ev, url: e.target.value }; setEvidence(u) }}
                        />
                      </div>
                    )
                  })}
                </Card>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                  <button className="jc-btn-ghost" onClick={() => setStep('consent')}>← Back</button>
                  <button className="jc-btn" onClick={() => setStep('questions')}>Preview test questions →</button>
                </div>
              </div>
            )}

            {/* ── QUESTIONS ──────────────────────────────────────────────── */}
            {step === 'questions' && (
              <div className="jc-fade">
                <SectionLabel>Step 5 of 7</SectionLabel>
                <StepHeading
                  title="Your 3 skill test questions"
                  sub="Read these before the timer starts. Abort here for a full credit refund."
                />
                <Card style={{ marginBottom: 12 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: c.primaryLight, border: `1px solid rgba(55,138,221,0.2)`, borderRadius: 20, fontSize: 12, color: c.accent, fontWeight: 600, marginBottom: 18 }}>
                    ⏱ {JOB_CASE.testMinutes} minutes · no pausing · copy-paste disabled
                  </div>
                  {questions.map((q, i) => (
                    <div key={i} style={{ padding: '12px 14px', background: c.bg, borderRadius: 8, border: `1px solid ${c.border}`, marginBottom: i < 2 ? 10 : 0 }}>
                      <div style={{ fontSize: 10, color: c.accent, fontWeight: 700, marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>Q{i + 1} · {q.skill_being_tested}</div>
                      <div style={{ fontSize: 13, color: c.text, lineHeight: 1.7 }}>{q.question}</div>
                    </div>
                  ))}
                  <div style={{ marginTop: 14, padding: '11px 14px', background: c.primaryLight, border: `1px solid rgba(55,138,221,0.2)`, borderRadius: 8, fontSize: 13, color: c.textMuted }}>
                    Starting the video step will deduct <strong style={{ color: c.primary }}>{JOB_CASE.creditCost} credits</strong>.
                  </div>
                </Card>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="jc-btn-ghost" onClick={() => setStep('evidence')}>← Abort (keep credits)</button>
                  <button className="jc-btn" onClick={() => setStep('video')}>Record video →</button>
                </div>
              </div>
            )}

            {/* ── VIDEO ──────────────────────────────────────────────────── */}
            {step === 'video' && (
              <div className="jc-fade">
                <SectionLabel>Step 6 of 7</SectionLabel>
                <StepHeading
                  title="Record your 2-minute pitch"
                  sub="One take only. Talk directly about why you fit this specific role."
                />
                <Card>
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: 10, overflow: 'hidden', marginBottom: 18, border: `1px solid ${c.border}` }}>
                    {!videoBlob
                      ? <video ref={liveRef} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} muted playsInline />
                      : <video ref={previewRef} src={videoUrl} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    }
                    {countdown > 0 && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)' }}>
                        <div style={{ fontFamily: f.heading, fontSize: 88, fontWeight: 700, color: '#fff', animation: 'jcPulse 1s ease' }}>{countdown}</div>
                      </div>
                    )}
                    {recording && (
                      <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.65)', padding: '5px 10px', borderRadius: 20 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#e53e3e', animation: 'jcPulse 1s ease infinite' }} />
                        <span style={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>REC {fmt(elapsed)} / {fmt(JOB_CASE.videoMaxSeconds)}</span>
                      </div>
                    )}
                  </div>

                  {!videoBlob ? (
                    <div style={{ textAlign: 'center' }}>
                      {!recording && countdown === 0 && (
                        <button className="jc-btn" onClick={startCountdown} style={{ fontSize: 14, padding: '12px 32px' }}>
                          Start recording
                        </button>
                      )}
                      {recording && (
                        <button onClick={() => mrRef.current?.stop()} style={{ background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 28px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: f.body }}>
                          Stop recording
                        </button>
                      )}
                      <p style={{ fontSize: 12, color: c.textFaint, margin: '10px 0 0' }}>Camera + microphone required · max 2 minutes</p>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: 13, color: c.textMuted, marginBottom: 14 }}>Watch your recording above. This is your only take.</p>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <button className="jc-btn-ghost" onClick={() => { setVideoBlob(null); setVideoUrl(''); setElapsed(0) }}>Discard & re-record</button>
                        <button className="jc-btn" onClick={() => setStep('test')}>Confirm & take test →</button>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* ── TEST ───────────────────────────────────────────────────── */}
            {step === 'test' && (
              <div className="jc-fade">
                <SectionLabel>Step 7 of 7</SectionLabel>
                <Card>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 12 }}>
                    <div>
                      <h2 style={{ fontFamily: f.heading, fontSize: 18, fontWeight: 700, color: c.primary, margin: 0 }}>Skill test</h2>
                      {testStarted && !submitted && <p style={{ fontSize: 12, color: c.textMuted, margin: '3px 0 0' }}>Question {currentQ + 1} of {questions.length}</p>}
                    </div>
                    {testStarted && !submitted && (
                      <div style={{ padding: '6px 14px', background: timeLeft < 120 ? 'rgba(226,75,74,0.08)' : c.primaryLight, border: `1px solid ${timeLeft < 120 ? 'rgba(226,75,74,0.2)' : 'rgba(55,138,221,0.2)'}`, borderRadius: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: f.heading, fontSize: 16, fontWeight: 700, color: timeLeft < 120 ? c.danger : c.accent }}>{fmt(timeLeft)}</span>
                        <span style={{ fontSize: 11, color: c.textFaint }}>left</span>
                      </div>
                    )}
                  </div>

                  {submitted ? (
                    <div style={{ textAlign: 'center', padding: '28px 0' }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(29,158,117,0.1)', border: `1px solid rgba(29,158,117,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, margin: '0 auto 14px' }}>✓</div>
                      <div style={{ fontFamily: f.heading, fontSize: 16, fontWeight: 700, color: c.primary, marginBottom: 6 }}>Test submitted</div>
                      <p style={{ fontSize: 13, color: c.textMuted, marginBottom: 20 }}>AI is scoring your answers.</p>
                      <button className="jc-btn" onClick={() => { setStep('generating'); setTimeout(() => setStep('done'), 3000) }}>
                        Generate my Job Case →
                      </button>
                    </div>
                  ) : !testStarted ? (
                    <div style={{ textAlign: 'center', padding: '12px 0 20px' }}>
                      <p style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.7, marginBottom: 18 }}>
                        The timer starts the moment you click. Right-click and copy-paste are disabled during the test.
                      </p>
                      <button className="jc-btn" onClick={() => setTestStarted(true)} style={{ fontSize: 14, padding: '12px 32px' }}>
                        Start {JOB_CASE.testMinutes}-minute test
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ padding: '12px 14px', background: c.bg, borderRadius: 8, border: `1px solid ${c.border}`, marginBottom: 12 }}>
                        <div style={{ fontSize: 10, color: c.accent, fontWeight: 700, marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>{questions[currentQ]?.skill_being_tested}</div>
                        <div style={{ fontSize: 13, color: c.text, lineHeight: 1.7 }}>{questions[currentQ]?.question}</div>
                      </div>
                      <textarea
                        className="jc-input"
                        placeholder="Type your answer… (150–250 words)"
                        rows={8}
                        value={answers[currentQ]}
                        onChange={e => { const u = [...answers]; u[currentQ] = e.target.value; setAnswers(u) }}
                        onContextMenu={e => e.preventDefault()}
                        onPaste={e => e.preventDefault()}
                        onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && ['c','v','x','a'].includes(e.key.toLowerCase())) e.preventDefault() }}
                        style={{ minHeight: 180 }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                        <span style={{ fontSize: 12, color: c.textFaint }}>
                          {answers[currentQ].split(/\s+/).filter(Boolean).length} words
                          {tabSwitches > 0 && <span style={{ marginLeft: 10, color: c.danger }}>⚠ {tabSwitches} tab switch{tabSwitches > 1 ? 'es' : ''}</span>}
                        </span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {currentQ > 0 && <button className="jc-btn-ghost" onClick={() => setCurrentQ(q => q - 1)}>← Prev</button>}
                          {currentQ < questions.length - 1
                            ? <button className="jc-btn" onClick={() => setCurrentQ(q => q + 1)}>Next →</button>
                            : <button className="jc-btn" onClick={() => setSubmitted(true)}>Submit answers</button>
                          }
                        </div>
                      </div>
                    </>
                  )}
                </Card>
              </div>
            )}

            {/* ── GENERATING ─────────────────────────────────────────────── */}
            {step === 'generating' && (
              <div className="jc-fade" style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ width: 48, height: 48, border: `3px solid ${c.border}`, borderTopColor: c.accent, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
                <h2 style={{ fontFamily: f.heading, fontSize: 20, fontWeight: 700, color: c.primary, margin: '0 0 8px' }}>Building your Job Case…</h2>
                <p style={{ fontSize: 13, color: c.textMuted, maxWidth: 360, margin: '0 auto', lineHeight: 1.6 }}>
                  AI is scoring your answers, mapping evidence, and writing your pitch narrative. About 15 seconds.
                </p>
              </div>
            )}

            {/* ── DONE ───────────────────────────────────────────────────── */}
            {step === 'done' && (
              <div className="jc-fade">
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(29,158,117,0.1)', border: `1.5px solid rgba(29,158,117,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 16px' }}>✓</div>
                  <h2 style={{ fontFamily: f.heading, fontSize: 22, fontWeight: 700, color: c.primary, margin: '0 0 8px' }}>Your Job Case is live</h2>
                  <p style={{ fontSize: 13, color: c.textMuted, margin: 0, lineHeight: 1.6 }}>
                    Paste this link in your application's cover letter or additional info field.
                  </p>
                </div>

                <Card>
                  <div style={{ fontSize: 10, fontWeight: 700, color: c.textMuted, marginBottom: 8, letterSpacing: 0.8, textTransform: 'uppercase' }}>Your link</div>
                  <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${c.border}`, marginBottom: 18 }}>
                    <span style={{ flex: 1, padding: '10px 12px', fontSize: 13, color: c.textMuted, fontFamily: 'monospace', background: c.bg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      job-lens.de/case/demo-abc123
                    </span>
                    <button
                      onClick={() => navigator.clipboard?.writeText('https://job-lens.de/case/demo-abc123')}
                      style={{ padding: '10px 16px', background: g.button, border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: f.heading, flexShrink: 0 }}
                    >
                      Copy
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="jc-btn" onClick={() => router.push('/case/demo-abc123')}>
                      Preview as recruiter →
                    </button>
                    <button className="jc-btn-ghost" onClick={() => router.push('/app/job-case')}>
                      My Job Cases
                    </button>
                  </div>

                  <div style={{ marginTop: 16, padding: '10px 14px', background: c.bg, borderRadius: 8, border: `1px solid ${c.border}`, fontSize: 12, color: c.textMuted, lineHeight: 1.6 }}>
                    Auto-deletes in {JOB_CASE.expiryDays} days · You'll be notified when a recruiter views this
                  </div>
                </Card>
              </div>
            )}

          </div>
        </div>
      </>
    </AdminGate>
  )
}
