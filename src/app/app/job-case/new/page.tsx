'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { theme } from '@/lib/theme'
import { JOB_CASE } from '@/lib/constants'
import AdminGate from '@/components/AdminGate'

const { colors: c, fonts: f, shadow: sh } = theme

// ── Types ────────────────────────────────────────────────────────────────────

type Step = 'paste' | 'analyse' | 'consent' | 'evidence' | 'questions' | 'video' | 'test' | 'generating' | 'done'

type Requirement = {
  id: string
  skill: string
  description: string
  essential: boolean
}

type Evidence = {
  requirementId: string
  text: string
  url: string
}

type Question = {
  question: string
  skill_being_tested: string
}

type JobQuality = 'clear' | 'vague' | 'poor'

// ── Mock data for local preview ──────────────────────────────────────────────

const MOCK_REQUIREMENTS: Requirement[] = [
  { id: '1', skill: 'React / Next.js', description: '3+ years building production React applications with server-side rendering.', essential: true },
  { id: '2', skill: 'TypeScript', description: 'Strong TypeScript skills including generics and type narrowing.', essential: true },
  { id: '3', skill: 'Node.js & APIs', description: 'Experience designing and building RESTful APIs with Node.js.', essential: true },
  { id: '4', skill: 'PostgreSQL', description: 'Comfortable writing complex queries and schema design.', essential: true },
  { id: '5', skill: 'CI/CD', description: 'Familiar with GitHub Actions or similar pipelines.', essential: false },
  { id: '6', skill: 'Team communication', description: 'Can articulate technical decisions clearly to non-engineers.', essential: false },
]

const MOCK_QUESTIONS: Question[] = [
  { question: 'You claimed experience with Next.js App Router. Describe a specific performance challenge you solved using Server Components — what was the problem, what did you change, and what was the measurable outcome?', skill_being_tested: 'React / Next.js' },
  { question: 'Walk me through a time you designed a PostgreSQL schema for a feature with complex relationships. What trade-offs did you make and what would you change now?', skill_being_tested: 'PostgreSQL' },
  { question: 'You are mid-sprint and discover a third-party API you depend on is going to change its response format in 48 hours. How do you handle it, and how do you communicate it to the team?', skill_being_tested: 'Team communication' },
]

// ── Step indicator ───────────────────────────────────────────────────────────

const STEPS: { key: Step; label: string }[] = [
  { key: 'paste',      label: 'Job posting' },
  { key: 'analyse',    label: 'Analysis' },
  { key: 'consent',    label: 'Consent' },
  { key: 'evidence',   label: 'Evidence' },
  { key: 'questions',  label: 'Questions' },
  { key: 'video',      label: 'Video' },
  { key: 'test',       label: 'Skill test' },
  { key: 'generating', label: 'Generating' },
  { key: 'done',       label: 'Done' },
]

const STEP_ORDER = STEPS.map(s => s.key)

function StepBar({ current }: { current: Step }) {
  const idx = STEP_ORDER.indexOf(current)
  const visibleSteps = STEPS.filter(s => !['analyse', 'generating'].includes(s.key))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32, overflowX: 'auto', paddingBottom: 4 }}>
      {visibleSteps.map((s, i) => {
        const sIdx = STEP_ORDER.indexOf(s.key)
        const done = sIdx < idx
        const active = sIdx === idx || (s.key === 'paste' && current === 'analyse')
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? c.success : active ? c.accent : 'rgba(255,255,255,0.08)',
                border: `2px solid ${done ? c.success : active ? c.accent : 'rgba(255,255,255,0.15)'}`,
                fontSize: 11, fontWeight: 700, color: done || active ? '#fff' : 'rgba(255,255,255,0.3)',
                transition: 'all 0.3s',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 10, color: active ? '#fff' : 'rgba(255,255,255,0.35)', fontWeight: active ? 600 : 400, whiteSpace: 'nowrap' }}>
                {s.label}
              </span>
            </div>
            {i < visibleSteps.length - 1 && (
              <div style={{ width: 32, height: 2, background: done ? c.success : 'rgba(255,255,255,0.1)', margin: '0 4px', marginBottom: 18, flexShrink: 0, transition: 'background 0.3s' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Quality badge ────────────────────────────────────────────────────────────

function QualityBadge({ quality }: { quality: JobQuality }) {
  const map = {
    clear: { label: 'Clear posting', color: c.success, bg: 'rgba(29,158,117,0.12)' },
    vague: { label: 'Vague posting', color: c.warning, bg: 'rgba(186,117,23,0.12)' },
    poor:  { label: 'Poor posting',  color: c.danger,  bg: 'rgba(226,75,74,0.12)' },
  }
  const q = map[quality]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, background: q.bg, color: q.color, fontSize: 11, fontWeight: 700 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: q.color, display: 'inline-block' }} />
      {q.label}
    </span>
  )
}

// ── Card wrapper ─────────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 28, ...style }}>
      {children}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function JobCaseNewPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('paste')

  // Step 1 — paste
  const [jobText, setJobText] = useState('')
  const [jobUrl, setJobUrl] = useState('')

  // Step 2 — analysis results
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [quality, setQuality] = useState<JobQuality>('clear')
  const [matchScore, setMatchScore] = useState(72)
  const [jobTitle, setJobTitle] = useState('Senior Frontend Engineer')
  const [company, setCompany] = useState('Acme GmbH')

  // Step 3 — consent
  const [consent, setConsent] = useState({ video: false, test: false, tracking: false })

  // Step 4 — evidence
  const [evidence, setEvidence] = useState<Evidence[]>([])

  // Step 5 — questions
  const [questions, setQuestions] = useState<Question[]>([])

  // Step 6 — video
  const [recording, setRecording] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [videoConfirmed, setVideoConfirmed] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const videoPreviewRef = useRef<HTMLVideoElement>(null)
  const liveVideoRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Step 7 — test
  const [testStarted, setTestStarted] = useState(false)
  const [testTimeLeft, setTestTimeLeft] = useState(JOB_CASE.testMinutes * 60)
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<string[]>(['', '', ''])
  const [tabSwitches, setTabSwitches] = useState(0)
  const [testSubmitted, setTestSubmitted] = useState(false)

  // ── Mock analyse ──────────────────────────────────────────────────────────
  function handleAnalyse() {
    if (!jobText.trim() && !jobUrl.trim()) return
    setStep('analyse')
    setTimeout(() => {
      setRequirements(MOCK_REQUIREMENTS)
      setStep('analyse') // stay on analyse to show results
    }, 1800)
  }

  // Show results after "analysing" state
  const [analyseDone, setAnalyseDone] = useState(false)
  useEffect(() => {
    if (step === 'analyse') {
      const t = setTimeout(() => setAnalyseDone(true), 1800)
      return () => clearTimeout(t)
    } else {
      setAnalyseDone(false)
    }
  }, [step])

  // ── Init evidence from requirements ──────────────────────────────────────
  function proceedToConsent() {
    setEvidence(requirements.map(r => ({ requirementId: r.id, text: '', url: '' })))
    setQuestions(MOCK_QUESTIONS)
    setStep('consent')
  }

  // ── Video recording ───────────────────────────────────────────────────────
  async function startCountdown() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    streamRef.current = stream
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = stream
      liveVideoRef.current.muted = true
      liveVideoRef.current.play()
    }
    setCountdown(3)
    let c = 3
    const iv = setInterval(() => {
      c--
      setCountdown(c)
      if (c === 0) {
        clearInterval(iv)
        startRecording(stream)
      }
    }, 1000)
  }

  function startRecording(stream: MediaStream) {
    chunksRef.current = []
    const mr = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' })
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      setVideoBlob(blob)
      const url = URL.createObjectURL(blob)
      setVideoUrl(url)
      setRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
      stream.getTracks().forEach(t => t.stop())
    }
    mr.start()
    mediaRecorderRef.current = mr
    setRecording(true)
    setElapsed(0)
    timerRef.current = setInterval(() => {
      setElapsed(e => {
        if (e + 1 >= JOB_CASE.videoMaxSeconds) {
          mr.stop()
          return JOB_CASE.videoMaxSeconds
        }
        return e + 1
      })
    }, 1000)
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
  }

  // ── Test timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!testStarted || testSubmitted) return
    const iv = setInterval(() => {
      setTestTimeLeft(t => {
        if (t <= 1) { clearInterval(iv); setTestSubmitted(true); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [testStarted, testSubmitted])

  // Tab-switch detection during test
  useEffect(() => {
    if (!testStarted || testSubmitted) return
    function onVisibility() {
      if (document.hidden) setTabSwitches(n => n + 1)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [testStarted, testSubmitted])

  // ── Generate & done ───────────────────────────────────────────────────────
  function handleGenerate() {
    setStep('generating')
    setTimeout(() => setStep('done'), 3000)
  }

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const allConsent = consent.video && consent.test && consent.tracking

  // ── Render steps ──────────────────────────────────────────────────────────

  return (
    <AdminGate>
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        textarea { resize: vertical; }
        textarea:focus, input:focus { outline: none; }
        .jc-btn-primary { background: linear-gradient(135deg, #378ADD 0%, #185FA5 100%); color: #fff; border: none; border-radius: 10px; padding: 12px 28px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; transition: opacity 0.15s; }
        .jc-btn-primary:hover { opacity: 0.88; }
        .jc-btn-primary:disabled { opacity: 0.35; cursor: not-allowed; }
        .jc-btn-ghost { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 12px 24px; font-size: 14px; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .jc-btn-ghost:hover { background: rgba(255,255,255,0.11); }
        .jc-input { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 12px 16px; color: #fff; font-family: inherit; font-size: 14px; width: 100%; transition: border 0.15s; }
        .jc-input:focus { border-color: #378ADD; }
        .jc-input::placeholder { color: rgba(255,255,255,0.25); }
        .jc-checkbox { width: 18px; height: 18px; accent-color: #378ADD; cursor: pointer; flex-shrink: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .jc-fade { animation: fadeIn 0.35s ease; }
        @media (max-width: 600px) {
          .jc-two-col { flex-direction: column !important; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0d1e30 0%, #091525 100%)', padding: '32px 20px 80px', fontFamily: f.body }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <button onClick={() => router.push('/app/job-case')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', padding: 0, fontFamily: 'inherit', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              ← My Job Cases
            </button>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: -0.5 }}>
              Build your Job Case
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginTop: 6, marginBottom: 0 }}>
              Turn your experience into verified proof — not just another CV.
            </p>
          </div>

          <StepBar current={step} />

          {/* ── STEP: PASTE ─────────────────────────────────────────────── */}
          {(step === 'paste' || step === 'analyse') && (
            <div className="jc-fade">
              <Card>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginTop: 0, marginBottom: 6 }}>Paste the job posting</h2>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 0, marginBottom: 20 }}>
                  Paste the full job description or a URL. AI will extract the key requirements.
                </p>

                <div style={{ marginBottom: 16 }}>
                  <input
                    className="jc-input"
                    placeholder="https://jobs.acme.com/senior-frontend-engineer (optional)"
                    value={jobUrl}
                    onChange={e => setJobUrl(e.target.value)}
                  />
                </div>

                <textarea
                  className="jc-input"
                  placeholder="Paste the full job description here…"
                  rows={10}
                  value={jobText}
                  onChange={e => setJobText(e.target.value)}
                  style={{ minHeight: 200 }}
                />

                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                  {step === 'analyse' && !analyseDone ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
                      <div style={{ width: 18, height: 18, border: '2px solid #378ADD', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      Analysing job posting…
                    </div>
                  ) : analyseDone ? (
                    <button className="jc-btn-primary" onClick={proceedToConsent}>
                      Review results →
                    </button>
                  ) : (
                    <button className="jc-btn-primary" onClick={handleAnalyse} disabled={!jobText.trim() && !jobUrl.trim()}>
                      Analyse job posting →
                    </button>
                  )}
                </div>
              </Card>

              {/* Analysis results (shown while still on 'analyse' step) */}
              {analyseDone && (
                <div className="jc-fade" style={{ marginTop: 20 }}>
                  <Card>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{jobTitle} — {company}</div>
                        <QualityBadge quality={quality} />
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Your profile match</div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: c.accent, fontFamily: "'Syne', sans-serif" }}>{matchScore}%</div>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
                      Requirements extracted
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {requirements.map(r => (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)' }}>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: r.essential ? 'rgba(55,138,221,0.15)' : 'rgba(255,255,255,0.07)', color: r.essential ? c.accent : 'rgba(255,255,255,0.35)', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
                            {r.essential ? 'Essential' : 'Preferred'}
                          </span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{r.skill}</div>
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{r.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(186,117,23,0.1)', border: '1px solid rgba(186,117,23,0.25)', borderRadius: 10, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                      Building this Job Case will cost <strong style={{ color: '#fff' }}>{JOB_CASE.creditCost} credits</strong>. You will be shown the 3 skill test questions before any credits are deducted.
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* ── STEP: CONSENT ───────────────────────────────────────────── */}
          {step === 'consent' && (
            <div className="jc-fade">
              <Card>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginTop: 0, marginBottom: 6 }}>Your consent</h2>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 0, marginBottom: 24 }}>
                  All three consents are required. Data is hard-deleted after 30 days.
                </p>

                {[
                  { key: 'video' as const, text: 'I consent to my video pitch being stored for 30 days and shared with recruiters who access this Job Case via the link I provide.' },
                  { key: 'test'  as const, text: 'I consent to my skill test answers and scores being stored for 30 days and shown to recruiters who access this Job Case.' },
                  { key: 'tracking' as const, text: 'I consent to Job-Lens recording the email domain of recruiters who view my Job Case, and notifying me when a view occurs.' },
                ].map(item => (
                  <label key={item.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      className="jc-checkbox"
                      checked={consent[item.key]}
                      onChange={e => setConsent(prev => ({ ...prev, [item.key]: e.target.checked }))}
                      style={{ marginTop: 2 }}
                    />
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{item.text}</span>
                  </label>
                ))}

                <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                  Consent timestamps and version are stored for compliance. This does not affect your right to delete your Job Case at any time.
                </div>

                <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button className="jc-btn-ghost" onClick={() => setStep('analyse')}>Back</button>
                  <button className="jc-btn-primary" disabled={!allConsent} onClick={() => setStep('evidence')}>
                    Continue →
                  </button>
                </div>
              </Card>
            </div>
          )}

          {/* ── STEP: EVIDENCE ──────────────────────────────────────────── */}
          {step === 'evidence' && (
            <div className="jc-fade">
              <Card>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginTop: 0, marginBottom: 6 }}>Map your evidence</h2>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 0, marginBottom: 24 }}>
                  For each requirement, add the strongest evidence you have. Be specific — vague answers score poorly.
                </p>

                {requirements.map((r, i) => {
                  const ev = evidence[i] ?? { requirementId: r.id, text: '', url: '' }
                  return (
                    <div key={r.id} style={{ marginBottom: 24, paddingBottom: 24, borderBottom: i < requirements.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: r.essential ? 'rgba(55,138,221,0.15)' : 'rgba(255,255,255,0.07)', color: r.essential ? c.accent : 'rgba(255,255,255,0.35)', fontWeight: 700 }}>
                          {r.essential ? 'Essential' : 'Preferred'}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{r.skill}</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 0, marginBottom: 12 }}>{r.description}</p>
                      <textarea
                        className="jc-input"
                        placeholder="Describe your specific experience with this skill…"
                        rows={3}
                        value={ev.text}
                        onChange={e => {
                          const updated = [...evidence]
                          updated[i] = { ...ev, text: e.target.value }
                          setEvidence(updated)
                        }}
                        style={{ marginBottom: 8 }}
                      />
                      <input
                        className="jc-input"
                        placeholder="Project or portfolio URL (optional)"
                        value={ev.url}
                        onChange={e => {
                          const updated = [...evidence]
                          updated[i] = { ...ev, url: e.target.value }
                          setEvidence(updated)
                        }}
                      />
                    </div>
                  )
                })}

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button className="jc-btn-ghost" onClick={() => setStep('consent')}>Back</button>
                  <button className="jc-btn-primary" onClick={() => setStep('questions')}>
                    Preview skill test →
                  </button>
                </div>
              </Card>
            </div>
          )}

          {/* ── STEP: QUESTIONS (preview before credit deduction) ────────── */}
          {step === 'questions' && (
            <div className="jc-fade">
              <Card>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginTop: 0, marginBottom: 6 }}>Your 3 skill test questions</h2>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 0, marginBottom: 8 }}>
                  Review these before the timer starts. You can abort here for a full credit refund.
                </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'rgba(55,138,221,0.1)', border: '1px solid rgba(55,138,221,0.2)', borderRadius: 20, fontSize: 12, color: c.accent, fontWeight: 600, marginBottom: 24 }}>
                  ⏱ {JOB_CASE.testMinutes} minutes once you start — no pausing
                </div>

                {questions.map((q, i) => (
                  <div key={i} style={{ marginBottom: 16, padding: '16px 18px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: 11, color: c.accent, fontWeight: 700, marginBottom: 8, letterSpacing: 0.5 }}>
                      Q{i + 1} · {q.skill_being_tested}
                    </div>
                    <div style={{ fontSize: 14, color: '#fff', lineHeight: 1.6 }}>{q.question}</div>
                  </div>
                ))}

                <div style={{ marginTop: 4, padding: '12px 16px', background: 'rgba(186,117,23,0.08)', border: '1px solid rgba(186,117,23,0.2)', borderRadius: 10, fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                  Starting the test will deduct <strong style={{ color: '#fff' }}>{JOB_CASE.creditCost} credits</strong> from your account.
                </div>

                <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button className="jc-btn-ghost" onClick={() => setStep('evidence')}>← Abort (keep credits)</button>
                  <button className="jc-btn-primary" onClick={() => setStep('video')}>
                    Record video first →
                  </button>
                </div>
              </Card>
            </div>
          )}

          {/* ── STEP: VIDEO ──────────────────────────────────────────────── */}
          {step === 'video' && (
            <div className="jc-fade">
              <Card>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginTop: 0, marginBottom: 6 }}>Record your 2-minute pitch</h2>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 0, marginBottom: 24 }}>
                  One take only. No re-recording after you confirm. Talk directly about why you fit this role.
                </p>

                {/* Live preview */}
                <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: 12, overflow: 'hidden', marginBottom: 20, border: '1px solid rgba(255,255,255,0.1)' }}>
                  {!videoBlob ? (
                    <video ref={liveVideoRef} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} muted playsInline />
                  ) : (
                    <video ref={videoPreviewRef} src={videoUrl} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}

                  {/* Countdown overlay */}
                  {countdown > 0 && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 96, fontWeight: 800, color: '#fff', animation: 'pulse 1s ease' }}>{countdown}</div>
                    </div>
                  )}

                  {/* Recording indicator */}
                  {recording && (
                    <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.6)', padding: '5px 10px', borderRadius: 20 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e53e3e', animation: 'pulse 1s ease infinite' }} />
                      <span style={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>REC {fmtTime(elapsed)} / {fmtTime(JOB_CASE.videoMaxSeconds)}</span>
                    </div>
                  )}
                </div>

                {!videoBlob ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    {!recording && countdown === 0 && (
                      <button className="jc-btn-primary" onClick={startCountdown} style={{ fontSize: 15, padding: '14px 36px' }}>
                        Start recording
                      </button>
                    )}
                    {recording && (
                      <button onClick={stopRecording} style={{ background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Stop recording
                      </button>
                    )}
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0, textAlign: 'center' }}>
                      Camera and microphone access required · Max 2 minutes
                    </p>
                  </div>
                ) : !videoConfirmed ? (
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>Watch your recording above. This is the only take — confirm to continue.</p>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                      <button className="jc-btn-ghost" onClick={() => { setVideoBlob(null); setVideoUrl(''); setElapsed(0) }}>
                        Discard & re-record
                      </button>
                      <button className="jc-btn-primary" onClick={() => { setVideoConfirmed(true); setStep('test') }}>
                        Confirm & continue →
                      </button>
                    </div>
                  </div>
                ) : null}
              </Card>
            </div>
          )}

          {/* ── STEP: TEST ───────────────────────────────────────────────── */}
          {step === 'test' && (
            <div className="jc-fade">
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>Skill test</h2>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>
                      Question {currentQ + 1} of {questions.length}
                    </p>
                  </div>
                  {testStarted && !testSubmitted && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: testTimeLeft < 120 ? 'rgba(226,75,74,0.15)' : 'rgba(55,138,221,0.1)', border: `1px solid ${testTimeLeft < 120 ? 'rgba(226,75,74,0.3)' : 'rgba(55,138,221,0.2)'}`, borderRadius: 20 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: testTimeLeft < 120 ? c.danger : c.accent, fontFamily: "'Syne', sans-serif" }}>{fmtTime(testTimeLeft)}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>remaining</span>
                    </div>
                  )}
                </div>

                {testSubmitted ? (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Test submitted</div>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>AI is scoring your answers now.</p>
                    <button className="jc-btn-primary" onClick={handleGenerate}>
                      Generate my Job Case →
                    </button>
                  </div>
                ) : !testStarted ? (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
                      The timer starts the moment you click. Right-click and copy-paste are disabled.
                    </p>
                    {tabSwitches > 0 && <p style={{ fontSize: 12, color: c.danger }}>⚠ {tabSwitches} tab switch{tabSwitches > 1 ? 'es' : ''} detected — these are logged</p>}
                    <button className="jc-btn-primary" onClick={() => setTestStarted(true)} style={{ fontSize: 15, padding: '14px 36px', marginTop: 12 }}>
                      Start {JOB_CASE.testMinutes}-minute test
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ padding: '16px 18px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 16 }}>
                      <div style={{ fontSize: 11, color: c.accent, fontWeight: 700, marginBottom: 8 }}>
                        Q{currentQ + 1} · {questions[currentQ]?.skill_being_tested}
                      </div>
                      <div style={{ fontSize: 14, color: '#fff', lineHeight: 1.7 }}>{questions[currentQ]?.question}</div>
                    </div>

                    <textarea
                      className="jc-input"
                      placeholder="Type your answer here… (150–250 words recommended)"
                      rows={8}
                      value={answers[currentQ]}
                      onChange={e => {
                        const updated = [...answers]
                        updated[currentQ] = e.target.value
                        setAnswers(updated)
                      }}
                      onContextMenu={e => e.preventDefault()}
                      onPaste={e => e.preventDefault()}
                      onKeyDown={e => {
                        if ((e.ctrlKey || e.metaKey) && ['c','v','x','a'].includes(e.key.toLowerCase())) e.preventDefault()
                      }}
                      style={{ minHeight: 180 }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                        {answers[currentQ].split(/\s+/).filter(Boolean).length} words
                        {tabSwitches > 0 && <span style={{ marginLeft: 12, color: c.danger }}>⚠ {tabSwitches} tab switch{tabSwitches > 1 ? 'es' : ''}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        {currentQ > 0 && <button className="jc-btn-ghost" onClick={() => setCurrentQ(q => q - 1)}>← Prev</button>}
                        {currentQ < questions.length - 1 ? (
                          <button className="jc-btn-primary" onClick={() => setCurrentQ(q => q + 1)}>Next →</button>
                        ) : (
                          <button className="jc-btn-primary" onClick={() => setTestSubmitted(true)}>Submit answers</button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </Card>
            </div>
          )}

          {/* ── STEP: GENERATING ────────────────────────────────────────── */}
          {step === 'generating' && (
            <div className="jc-fade" style={{ textAlign: 'center', padding: '80px 20px' }}>
              <div style={{ width: 60, height: 60, border: '3px solid rgba(55,138,221,0.2)', borderTopColor: '#378ADD', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 24px' }} />
              <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8, fontFamily: "'Syne', sans-serif" }}>Building your Job Case…</div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>AI is scoring your answers, mapping evidence, and generating your case. This takes about 15 seconds.</p>
            </div>
          )}

          {/* ── STEP: DONE ───────────────────────────────────────────────── */}
          {step === 'done' && (
            <div className="jc-fade">
              <Card style={{ textAlign: 'center', padding: '40px 28px' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(29,158,117,0.15)', border: '2px solid rgba(29,158,117,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 20px' }}>✓</div>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>Your Job Case is live</h2>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 28 }}>
                  Share the link below in your application's cover letter or additional info field.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, overflow: 'hidden' }}>
                  <span style={{ flex: 1, padding: '13px 16px', fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'left', fontFamily: 'monospace' }}>
                    job-lens.de/case/demo-abc123
                  </span>
                  <button
                    onClick={() => navigator.clipboard?.writeText('https://job-lens.de/case/demo-abc123')}
                    style={{ padding: '13px 20px', background: c.accent, border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                  >
                    Copy
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button className="jc-btn-primary" onClick={() => router.push('/case/demo-abc123')}>
                    Preview as recruiter →
                  </button>
                  <button className="jc-btn-ghost" onClick={() => router.push('/app/job-case')}>
                    My Job Cases
                  </button>
                </div>

                <div style={{ marginTop: 24, padding: '10px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                  Auto-deletes in 30 days · You'll be notified when a recruiter views this
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
