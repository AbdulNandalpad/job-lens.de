'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { theme } from '@/lib/theme'
import { JOB_CASE } from '@/lib/constants'
import AdminGate from '@/components/AdminGate'
import JobCaseNav from '../components/JobCaseNav'

const { colors: c, fonts: f } = theme

// ── Types ────────────────────────────────────────────────────────────────────

type Step = 'paste' | 'analysing' | 'review' | 'consent' | 'evidence' | 'questions' | 'video' | 'test' | 'generating' | 'done'

type Requirement = { id: string; skill: string; description: string; essential: boolean }
type Evidence    = { requirementId: string; text: string; url: string }
type Question    = { question: string; skill_being_tested: string }
type JobQuality  = 'clear' | 'vague' | 'poor'

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_REQS: Requirement[] = [
  { id: '1', skill: 'React / Next.js',     description: '3+ years building production React apps with SSR.',         essential: true  },
  { id: '2', skill: 'TypeScript',           description: 'Strong TypeScript including generics and type narrowing.',  essential: true  },
  { id: '3', skill: 'Node.js & APIs',       description: 'Experience designing RESTful APIs with Node.js.',          essential: true  },
  { id: '4', skill: 'PostgreSQL',           description: 'Complex queries and schema design.',                        essential: true  },
  { id: '5', skill: 'CI/CD',               description: 'Familiar with GitHub Actions or similar pipelines.',        essential: false },
  { id: '6', skill: 'Team communication',   description: 'Articulate technical decisions to non-engineers.',         essential: false },
]

const MOCK_QUESTIONS: Question[] = [
  { question: 'You claimed experience with Next.js App Router. Describe a specific performance challenge you solved using Server Components — what was the problem, what did you change, and what was the measurable outcome?', skill_being_tested: 'React / Next.js' },
  { question: 'Walk me through a PostgreSQL schema you designed for a feature with complex relationships. What trade-offs did you make?', skill_being_tested: 'PostgreSQL' },
  { question: 'You discover a third-party API you depend on is changing its response format in 48 hours. How do you handle it and communicate it to the team?', skill_being_tested: 'Team communication' },
]

// ── Shared styles ─────────────────────────────────────────────────────────────

const SHARED_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  textarea { resize: vertical; }
  textarea:focus, input:focus { outline: none; }
  @keyframes spin  { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
  .jc-fade { animation: fadeUp 0.3s ease; }
  .jc-input {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px; padding: 12px 14px;
    color: #fff; font-family: inherit; font-size: 14px; width: 100%;
    transition: border-color 0.15s;
  }
  .jc-input:focus { border-color: #378ADD; background: rgba(255,255,255,0.07); }
  .jc-input::placeholder { color: rgba(255,255,255,0.22); }
  .jc-btn {
    background: linear-gradient(135deg, #378ADD, #185FA5);
    color: #fff; border: none; border-radius: 9px;
    padding: 11px 22px; font-size: 14px; font-weight: 700;
    cursor: pointer; font-family: inherit; transition: opacity 0.15s;
    display: inline-flex; align-items: center; gap: 6px;
  }
  .jc-btn:hover { opacity: 0.88; }
  .jc-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .jc-btn-ghost {
    background: rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.5);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 9px; padding: 11px 20px; font-size: 14px;
    cursor: pointer; font-family: inherit; transition: all 0.15s;
  }
  .jc-btn-ghost:hover { background: rgba(255,255,255,0.1); color: #fff; }
  .jc-check { width: 17px; height: 17px; accent-color: #378ADD; cursor: pointer; flex-shrink: 0; }
  @media (max-width: 600px) { .jc-row { flex-direction: column !important; } }
`

// ── Small components ──────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, padding: '28px 28px', ...style }}>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: c.accent, margin: '0 0 6px' }}>
      {children}
    </p>
  )
}

function StepHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: -0.4 }}>{title}</h2>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: '6px 0 0', lineHeight: 1.6 }}>{sub}</p>
    </div>
  )
}

function QualityBadge({ q }: { q: JobQuality }) {
  const map = {
    clear: { label: 'Clear posting',  color: c.success, bg: 'rgba(29,158,117,0.1)'  },
    vague: { label: 'Vague posting',  color: c.warning, bg: 'rgba(186,117,23,0.1)'  },
    poor:  { label: 'Poor posting',   color: c.danger,  bg: 'rgba(226,75,74,0.1)'   },
  }
  const m = map[q]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, background: m.bg, color: m.color, fontSize: 11, fontWeight: 700 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.color }} />{m.label}
    </span>
  )
}

// Progress bar at top of steps
function StepProgress({ step }: { step: Step }) {
  const ordered: Step[] = ['paste', 'review', 'consent', 'evidence', 'questions', 'video', 'test', 'done']
  const labels = ['Job posting', 'Review', 'Consent', 'Evidence', 'Questions', 'Video', 'Skill test', 'Done']
  const current = step === 'analysing' ? 0 : step === 'generating' ? 7 : ordered.indexOf(step)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 36, overflowX: 'auto', paddingBottom: 4 }}>
      {ordered.map((s, i) => {
        const done    = i < current
        const active  = i === current
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? c.success : active ? c.accent : 'rgba(255,255,255,0.06)',
                border: `1.5px solid ${done ? c.success : active ? c.accent : 'rgba(255,255,255,0.12)'}`,
                fontSize: 10, fontWeight: 700,
                color: done || active ? '#fff' : 'rgba(255,255,255,0.25)',
                transition: 'all 0.3s',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 10, color: active ? '#fff' : 'rgba(255,255,255,0.28)', fontWeight: active ? 600 : 400, whiteSpace: 'nowrap' }}>
                {labels[i]}
              </span>
            </div>
            {i < ordered.length - 1 && (
              <div style={{ width: 28, height: 1.5, background: done ? c.success : 'rgba(255,255,255,0.08)', margin: '0 4px', marginBottom: 16, transition: 'background 0.3s', flexShrink: 0 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function Spinner() {
  return <div style={{ width: 18, height: 18, border: '2px solid rgba(55,138,221,0.3)', borderTopColor: c.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function JobCaseNewPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('paste')

  // Step data
  const [jobText, setJobText]           = useState('')
  const [jobUrl, setJobUrl]             = useState('')
  const [quality]                        = useState<JobQuality>('clear')
  const [matchScore]                     = useState(72)
  const [jobTitle]                       = useState('Senior Frontend Engineer')
  const [company]                        = useState('Acme GmbH')
  const [reqs, setReqs]                  = useState<Requirement[]>([])
  const [consent, setConsent]            = useState({ video: false, test: false, tracking: false })
  const [evidence, setEvidence]          = useState<Evidence[]>([])
  const [questions]                      = useState<Question[]>(MOCK_QUESTIONS)

  // Video
  const [countdown, setCountdown]        = useState(0)
  const [recording, setRecording]        = useState(false)
  const [elapsed, setElapsed]            = useState(0)
  const [videoBlob, setVideoBlob]        = useState<Blob | null>(null)
  const [videoUrl, setVideoUrl]          = useState('')
  const liveRef   = useRef<HTMLVideoElement>(null)
  const previewRef = useRef<HTMLVideoElement>(null)
  const mrRef      = useRef<MediaRecorder | null>(null)
  const chunksRef  = useRef<Blob[]>([])
  const streamRef  = useRef<MediaStream | null>(null)
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null)

  // Test
  const [testStarted, setTestStarted]    = useState(false)
  const [timeLeft, setTimeLeft]          = useState(JOB_CASE.testMinutes * 60)
  const [currentQ, setCurrentQ]          = useState(0)
  const [answers, setAnswers]            = useState(['', '', ''])
  const [tabSwitches, setTabSwitches]    = useState(0)
  const [submitted, setSubmitted]        = useState(false)

  // ── Analyse (mock) ────────────────────────────────────────────────────────
  function analyse() {
    if (!jobText.trim() && !jobUrl.trim()) return
    setStep('analysing')
    setTimeout(() => {
      setReqs(MOCK_REQS)
      setEvidence(MOCK_REQS.map(r => ({ requirementId: r.id, text: '', url: '' })))
      setStep('review')
    }, 2000)
  }

  // ── Video ─────────────────────────────────────────────────────────────────
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

  // ── Test timer ────────────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AdminGate>
      <>
        <style>{SHARED_CSS}</style>
        <div style={{ minHeight: '100vh', background: '#091525', fontFamily: f.body, color: '#fff' }}>
          <JobCaseNav credits={5} />

          <div style={{ maxWidth: 660, margin: '0 auto', padding: '40px 20px 80px' }}>
            <StepProgress step={step} />

            {/* ── PASTE ──────────────────────────────────────────────────── */}
            {(step === 'paste' || step === 'analysing') && (
              <div className="jc-fade">
                <SectionLabel>Step 1</SectionLabel>
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
                    style={{ marginBottom: 12 }}
                  />
                  <textarea
                    className="jc-input"
                    placeholder="Paste the full job description here…"
                    rows={10}
                    value={jobText}
                    onChange={e => setJobText(e.target.value)}
                    style={{ minHeight: 200 }}
                  />
                  <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                    {step === 'analysing' ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
                        <Spinner /> Analysing…
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
                <SectionLabel>Step 2</SectionLabel>
                <StepHeading
                  title="Review the analysis"
                  sub="Confirm the requirements look right before you spend credits."
                />
                <Card style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{jobTitle} · {company}</div>
                      <QualityBadge q={quality} />
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 36, fontWeight: 800, color: c.accent, lineHeight: 1 }}>{matchScore}%</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>profile match</div>
                    </div>
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>Requirements</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {reqs.map(r => (
                      <div key={r.id} style={{ display: 'flex', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 9, border: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: r.essential ? 'rgba(55,138,221,0.12)' : 'rgba(255,255,255,0.06)', color: r.essential ? c.accent : 'rgba(255,255,255,0.3)', fontWeight: 700, flexShrink: 0, alignSelf: 'flex-start', marginTop: 1 }}>
                          {r.essential ? 'Essential' : 'Preferred'}
                        </span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{r.skill}</div>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 2, lineHeight: 1.5 }}>{r.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 20, padding: '12px 14px', background: 'rgba(55,138,221,0.07)', border: '1px solid rgba(55,138,221,0.15)', borderRadius: 9, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                    Building this Job Case costs <strong style={{ color: '#fff' }}>{JOB_CASE.creditCost} credits</strong>. You'll preview the 3 skill test questions before any credits are deducted.
                  </div>
                </Card>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button className="jc-btn-ghost" onClick={() => setStep('paste')}>← Back</button>
                  <button className="jc-btn" onClick={() => setStep('consent')}>Looks good →</button>
                </div>
              </div>
            )}

            {/* ── CONSENT ────────────────────────────────────────────────── */}
            {step === 'consent' && (
              <div className="jc-fade">
                <SectionLabel>Step 3</SectionLabel>
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
                    <label key={item.key} style={{ display: 'flex', gap: 14, cursor: 'pointer', paddingBottom: i < 2 ? 20 : 0, marginBottom: i < 2 ? 20 : 0, borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                      <input type="checkbox" className="jc-check" checked={consent[item.key]} onChange={e => setConsent(p => ({ ...p, [item.key]: e.target.checked }))} style={{ marginTop: 3 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{item.label}</div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{item.text}</div>
                      </div>
                    </label>
                  ))}
                </Card>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                  <button className="jc-btn-ghost" onClick={() => setStep('review')}>← Back</button>
                  <button className="jc-btn" disabled={!allConsent} onClick={() => setStep('evidence')}>Continue →</button>
                </div>
              </div>
            )}

            {/* ── EVIDENCE ───────────────────────────────────────────────── */}
            {step === 'evidence' && (
              <div className="jc-fade">
                <SectionLabel>Step 4</SectionLabel>
                <StepHeading
                  title="Map your evidence"
                  sub="For each requirement, add your strongest proof. Be specific — vague answers score poorly."
                />
                <Card>
                  {reqs.map((r, i) => {
                    const ev = evidence[i] ?? { requirementId: r.id, text: '', url: '' }
                    return (
                      <div key={r.id} style={{ paddingBottom: i < reqs.length - 1 ? 24 : 0, marginBottom: i < reqs.length - 1 ? 24 : 0, borderBottom: i < reqs.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: r.essential ? 'rgba(55,138,221,0.12)' : 'rgba(255,255,255,0.06)', color: r.essential ? c.accent : 'rgba(255,255,255,0.3)', fontWeight: 700 }}>
                            {r.essential ? 'Essential' : 'Preferred'}
                          </span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{r.skill}</span>
                        </div>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '0 0 10px', lineHeight: 1.5 }}>{r.description}</p>
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
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                  <button className="jc-btn-ghost" onClick={() => setStep('consent')}>← Back</button>
                  <button className="jc-btn" onClick={() => setStep('questions')}>Preview test questions →</button>
                </div>
              </div>
            )}

            {/* ── QUESTIONS ──────────────────────────────────────────────── */}
            {step === 'questions' && (
              <div className="jc-fade">
                <SectionLabel>Step 5</SectionLabel>
                <StepHeading
                  title="Your 3 skill test questions"
                  sub="Read these before the timer starts. Abort here for a full credit refund."
                />
                <Card style={{ marginBottom: 16 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'rgba(55,138,221,0.08)', border: '1px solid rgba(55,138,221,0.18)', borderRadius: 20, fontSize: 12, color: c.accent, fontWeight: 600, marginBottom: 20 }}>
                    ⏱ {JOB_CASE.testMinutes} minutes · no pausing · copy-paste disabled
                  </div>
                  {questions.map((q, i) => (
                    <div key={i} style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', marginBottom: i < 2 ? 10 : 0 }}>
                      <div style={{ fontSize: 11, color: c.accent, fontWeight: 700, marginBottom: 8, letterSpacing: 0.5 }}>Q{i + 1} · {q.skill_being_tested}</div>
                      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7 }}>{q.question}</div>
                    </div>
                  ))}
                  <div style={{ marginTop: 16, padding: '11px 14px', background: 'rgba(55,138,221,0.07)', border: '1px solid rgba(55,138,221,0.14)', borderRadius: 9, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
                    Starting the video step will deduct <strong style={{ color: '#fff' }}>{JOB_CASE.creditCost} credits</strong>.
                  </div>
                </Card>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button className="jc-btn-ghost" onClick={() => setStep('evidence')}>← Abort (keep credits)</button>
                  <button className="jc-btn" onClick={() => setStep('video')}>Record video →</button>
                </div>
              </div>
            )}

            {/* ── VIDEO ──────────────────────────────────────────────────── */}
            {step === 'video' && (
              <div className="jc-fade">
                <SectionLabel>Step 6</SectionLabel>
                <StepHeading
                  title="Record your 2-minute pitch"
                  sub="One take only. Talk directly about why you fit this specific role."
                />
                <Card>
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: 10, overflow: 'hidden', marginBottom: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
                    {!videoBlob
                      ? <video ref={liveRef} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} muted playsInline />
                      : <video ref={previewRef} src={videoUrl} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    }
                    {countdown > 0 && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)' }}>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 88, fontWeight: 800, color: '#fff', animation: 'pulse 1s ease' }}>{countdown}</div>
                      </div>
                    )}
                    {recording && (
                      <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.65)', padding: '5px 10px', borderRadius: 20 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#e53e3e', animation: 'pulse 1s ease infinite' }} />
                        <span style={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>REC {fmt(elapsed)} / {fmt(JOB_CASE.videoMaxSeconds)}</span>
                      </div>
                    )}
                  </div>

                  {!videoBlob ? (
                    <div style={{ textAlign: 'center' }}>
                      {!recording && countdown === 0 && (
                        <button className="jc-btn" onClick={startCountdown} style={{ fontSize: 15, padding: '13px 36px' }}>
                          Start recording
                        </button>
                      )}
                      {recording && (
                        <button onClick={() => mrRef.current?.stop()} style={{ background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 9, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Stop recording
                        </button>
                      )}
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', margin: '12px 0 0' }}>Camera + microphone required · max 2 minutes</p>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>Watch your recording above. This is your only take.</p>
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
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
                <SectionLabel>Step 7</SectionLabel>
                <Card>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
                    <div>
                      <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 }}>Skill test</h2>
                      {testStarted && !submitted && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>Question {currentQ + 1} of {questions.length}</p>}
                    </div>
                    {testStarted && !submitted && (
                      <div style={{ padding: '7px 16px', background: timeLeft < 120 ? 'rgba(226,75,74,0.12)' : 'rgba(55,138,221,0.08)', border: `1px solid ${timeLeft < 120 ? 'rgba(226,75,74,0.25)' : 'rgba(55,138,221,0.18)'}`, borderRadius: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 800, color: timeLeft < 120 ? c.danger : c.accent }}>{fmt(timeLeft)}</span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>left</span>
                      </div>
                    )}
                  </div>

                  {submitted ? (
                    <div style={{ textAlign: 'center', padding: '32px 0' }}>
                      <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Test submitted</div>
                      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>AI is scoring your answers.</p>
                      <button className="jc-btn" onClick={() => { setStep('generating'); setTimeout(() => setStep('done'), 3000) }}>
                        Generate my Job Case →
                      </button>
                    </div>
                  ) : !testStarted ? (
                    <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
                      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 20 }}>
                        The timer starts the moment you click. Right-click and copy-paste are disabled during the test.
                      </p>
                      <button className="jc-btn" onClick={() => setTestStarted(true)} style={{ fontSize: 15, padding: '13px 36px' }}>
                        Start {JOB_CASE.testMinutes}-minute test
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', marginBottom: 14 }}>
                        <div style={{ fontSize: 11, color: c.accent, fontWeight: 700, marginBottom: 8 }}>{questions[currentQ]?.skill_being_tested}</div>
                        <div style={{ fontSize: 14, color: '#fff', lineHeight: 1.7 }}>{questions[currentQ]?.question}</div>
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
                          {answers[currentQ].split(/\s+/).filter(Boolean).length} words
                          {tabSwitches > 0 && <span style={{ marginLeft: 10, color: c.danger }}>⚠ {tabSwitches} tab switch{tabSwitches > 1 ? 'es' : ''}</span>}
                        </span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {currentQ > 0 && <button className="jc-btn-ghost" onClick={() => setCurrentQ(q => q - 1)}>← Prev</button>}
                          {currentQ < questions.length - 1
                            ? <button className="jc-btn" onClick={() => setCurrentQ(q => q + 1)}>Next →</button>
                            : <button className="jc-btn" onClick={() => setSubmitted(true)}>Submit</button>
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
                <div style={{ width: 52, height: 52, border: '3px solid rgba(55,138,221,0.15)', borderTopColor: c.accent, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 24px' }} />
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>Building your Job Case…</h2>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', maxWidth: 360, margin: '0 auto' }}>
                  AI is scoring your answers, mapping evidence, and writing your pitch narrative. About 15 seconds.
                </p>
              </div>
            )}

            {/* ── DONE ───────────────────────────────────────────────────── */}
            {step === 'done' && (
              <div className="jc-fade">
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(29,158,117,0.12)', border: '1.5px solid rgba(29,158,117,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 18px' }}>✓</div>
                  <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 8px', letterSpacing: -0.5 }}>Your Job Case is live</h2>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.6 }}>
                    Paste this link in your application's cover letter or additional info field.
                  </p>
                </div>

                <Card>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.35)', marginBottom: 10, letterSpacing: 0.5 }}>YOUR LINK</div>
                  <div style={{ display: 'flex', borderRadius: 9, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', marginBottom: 20 }}>
                    <span style={{ flex: 1, padding: '12px 14px', fontSize: 14, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', background: 'rgba(255,255,255,0.04)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      job-lens.de/case/demo-abc123
                    </span>
                    <button
                      onClick={() => navigator.clipboard?.writeText('https://job-lens.de/case/demo-abc123')}
                      style={{ padding: '12px 18px', background: c.accent, border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                    >
                      Copy
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button className="jc-btn" onClick={() => router.push('/case/demo-abc123')}>
                      Preview as recruiter →
                    </button>
                    <button className="jc-btn-ghost" onClick={() => router.push('/app/job-case')}>
                      My Job Cases
                    </button>
                  </div>

                  <div style={{ marginTop: 20, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: 12, color: 'rgba(255,255,255,0.25)', lineHeight: 1.6 }}>
                    Auto-deletes in 30 days · You'll be notified when a recruiter views this · 9 credits remaining
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
