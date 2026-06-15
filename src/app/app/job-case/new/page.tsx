'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../components/Navbar'
import { c, f, sh, g } from '@/lib/theme'
import { JOB_CASE, SS, API } from '@/lib/constants'
import { useCredits } from '@/lib/useCredits'
import AdminGate from '@/components/AdminGate'

// ── Types ────────────────────────────────────────────────────────────────────

type Step = 'paste' | 'analysing' | 'review' | 'consent' | 'evidence' | 'questions' | 'video' | 'test' | 'generating' | 'done'

type Requirement = { id: string; skill: string; description: string; essential: boolean }
type Evidence    = { requirementId: string; text: string; url: string }
type Question    = { question: string; skill_being_tested: string }
type JobQuality  = 'clear' | 'vague' | 'poor'

// No mock data — all data comes from real API calls

const SAMPLE_QUESTION = {
  question: 'Tell me about a time you had to learn a new technology quickly for a project. What did you do and what was the result?',
  skill_being_tested: 'Learning agility',
}

// ── Sidebar guidance per step ────────────────────────────────────────────────

const SB = '#152233'

const SBLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.8, textTransform: 'uppercase' as const, marginBottom: 8 }}>
    {children}
  </div>
)

const SBHeading = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontFamily: f.heading, fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
    {children}
  </div>
)

const SBBody = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: '0 0 14px' }}>
    {children}
  </p>
)

const SBTip = ({ icon, children }: { icon: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
    <span style={{ fontSize: 13, flexShrink: 0 }}>{icon}</span>
    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{children}</span>
  </div>
)

const SBDivider = () => (
  <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '16px 0' }} />
)

const SBBadge = ({ children, color = c.accent }: { children: React.ReactNode; color?: string }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, background: `${color}18`, color, fontSize: 11, fontWeight: 600, border: `1px solid ${color}28` }}>
    {children}
  </span>
)

function CreditsChip({ credits }: { credits: number | null }) {
  if (credits === null) return null
  const low = credits < JOB_CASE.creditCost
  return (
    <div style={{ padding: '10px 12px', background: low ? 'rgba(226,75,74,0.08)' : 'rgba(55,138,221,0.07)', borderRadius: 8, border: `1px solid ${low ? 'rgba(226,75,74,0.2)' : 'rgba(55,138,221,0.15)'}`, marginTop: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 3 }}>Your credits</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontFamily: f.heading, fontSize: 20, fontWeight: 700, color: low ? c.danger : c.accent }}>{credits}</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>available</span>
      </div>
      {low && <div style={{ fontSize: 11, color: c.danger, marginTop: 3 }}>Need {JOB_CASE.creditCost} to create a Job Case</div>}
      {!low && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>Costs {JOB_CASE.creditCost} credits to create</div>}
    </div>
  )
}

// ── Sample test component (inside sidebar on questions step) ─────────────────

function SampleTest({ questions }: { questions: Question[] }) {
  const q = questions[0] ?? SAMPLE_QUESTION
  const [open, setOpen]           = useState(false)
  const [answer, setAnswer]       = useState('')
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState<{ score: number; feedback: string } | null>(null)
  const [error, setError]         = useState('')

  async function score() {
    if (answer.trim().length < 30) { setError('Write at least 30 characters first.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(API.jobCaseScoreSample, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q.question, answer, skill: q.skill_being_tested }),
      })
      const data = await res.json()
      if (data.score !== undefined) setResult(data)
      else setError('Scoring failed — try again.')
    } catch {
      setError('Network error — try again.')
    } finally {
      setLoading(false)
    }
  }

  function reset() { setAnswer(''); setResult(null); setError('') }

  return (
    <div style={{ marginTop: 14 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(55,138,221,0.08)', border: '1px solid rgba(55,138,221,0.18)', borderRadius: 8, padding: '9px 12px', cursor: 'pointer', color: c.accent, fontSize: 12, fontWeight: 600, fontFamily: f.body }}
      >
        <span>Try a sample question with AI</span>
        <span style={{ fontSize: 10, opacity: 0.7 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ marginTop: 10, padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: c.accent, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>
            {q.skill_being_tested}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.65, marginBottom: 10 }}>
            {q.question}
          </div>

          {!result ? (
            <>
              <textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                placeholder="Type your answer… aim for 100–200 words"
                rows={5}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12, fontFamily: f.body, resize: 'vertical', outline: 'none', lineHeight: 1.6 }}
              />
              {error && <div style={{ fontSize: 11, color: c.danger, marginTop: 4 }}>{error}</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                  {answer.split(/\s+/).filter(Boolean).length} words · no timer · no credits
                </span>
                <button
                  onClick={score}
                  disabled={loading}
                  style={{ background: g.button, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: f.heading, opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  {loading ? <><Spinner light />&nbsp;Scoring…</> : 'Get AI feedback'}
                </button>
              </div>
            </>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ fontFamily: f.heading, fontSize: 26, fontWeight: 700, color: result.score >= 70 ? c.success : result.score >= 50 ? c.accent : c.warning, lineHeight: 1 }}>
                  {result.score}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>/ 100</div>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: 10 }}>
                {result.feedback}
              </div>
              <button onClick={reset} style={{ fontSize: 11, color: c.accent, background: 'none', border: 'none', cursor: 'pointer', fontFamily: f.body, padding: 0, textDecoration: 'underline' }}>
                Try again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Sidebar content per step ─────────────────────────────────────────────────

function SidebarContent({ step, credits, cvFound, cvSource, questions }: {
  step: Step
  credits: number | null
  cvFound: boolean
  cvSource: 'session' | 'upload' | null
  questions: Question[]
}) {
  if (step === 'paste' || step === 'analysing') return (
    <div>
      <SBLabel>What happens next</SBLabel>
      <SBHeading>AI analyses the job posting</SBHeading>
      <SBBody>
        Paste the full job description (or a URL) and AI will extract the 5–7 concrete requirements this role actually needs — not just the buzzwords.
      </SBBody>
      <SBDivider />
      <SBLabel>You'll see before spending credits</SBLabel>
      <SBTip icon="✓">Job quality score — Clear / Vague / Poor</SBTip>
      <SBTip icon="✓">Your profile match % against requirements</SBTip>
      <SBTip icon="✓">The 3 AI-generated test questions</SBTip>
      <SBDivider />
      <SBLabel>Tips</SBLabel>
      <SBTip icon="💡">Paste the full text, not just the title — the more detail, the better the match analysis.</SBTip>
      <SBTip icon="⏱">Takes about 5 seconds to analyse.</SBTip>
      {cvFound && (
        <>
          <SBDivider />
          <div style={{ padding: '9px 11px', background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.18)', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: c.success, fontWeight: 600, marginBottom: 3 }}>
              ✓ CV loaded{cvSource === 'upload' ? ' from file' : cvSource === 'session' ? ' from previous scan' : ''}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>AI will use your CV to pre-fill evidence and tailor the test questions.</div>
          </div>
        </>
      )}
      <CreditsChip credits={credits} />
    </div>
  )

  if (step === 'review') return (
    <div>
      <SBLabel>What you're reviewing</SBLabel>
      <SBHeading>Check the requirements</SBHeading>
      <SBBody>
        AI has extracted what this role actually requires. Check that the list looks complete — if something obvious is missing, you can add evidence manually on the next screen.
      </SBBody>
      <SBDivider />
      <SBLabel>The match score</SBLabel>
      <SBBody>
        Your match % is based on {cvFound ? 'your CV from Career Scan' : 'a general profile estimate'}. It tells you where your strongest and weakest evidence will be before you commit.
      </SBBody>
      <SBDivider />
      <SBLabel>Job quality</SBLabel>
      <SBTip icon="🟢"><strong style={{ color: '#fff' }}>Clear</strong> — specific, measurable requirements. AI generates strong questions.</SBTip>
      <SBTip icon="🟡"><strong style={{ color: '#fff' }}>Vague</strong> — generic buzzwords. Questions will be more general.</SBTip>
      <SBTip icon="🔴"><strong style={{ color: '#fff' }}>Poor</strong> — not enough detail. Consider finding a better posting.</SBTip>
      <CreditsChip credits={credits} />
    </div>
  )

  if (step === 'consent') return (
    <div>
      <SBLabel>Why we ask</SBLabel>
      <SBHeading>GDPR-compliant consent</SBHeading>
      <SBBody>
        Job Cases store sensitive data — your video and test answers. Under GDPR we need explicit, granular consent for each category before we store anything.
      </SBBody>
      <SBDivider />
      <SBLabel>What gets deleted</SBLabel>
      <SBTip icon="🗑">Video, test answers, and evidence are hard-deleted after {JOB_CASE.expiryDays} days.</SBTip>
      <SBTip icon="🔒">Your full email is never shared with recruiters — only your company domain.</SBTip>
      <SBTip icon="🚫">No mailing list. No ad targeting. No profiling.</SBTip>
      <SBDivider />
      <SBBody>
        You can delete your Job Case at any time from the My Cases screen and all data is removed immediately.
      </SBBody>
    </div>
  )

  if (step === 'evidence') return (
    <div>
      <SBLabel>Tips for strong evidence</SBLabel>
      <SBHeading>Specific beats generic</SBHeading>
      <SBBody>
        "Led the migration from X to Y, reducing load time by 40%" scores far higher than "experienced with X". AI scores specificity and measurable outcome.
      </SBBody>
      <SBDivider />
      <SBLabel>What AI looks for</SBLabel>
      <SBTip icon="📌">A real example, not a general claim</SBTip>
      <SBTip icon="📊">A measurable result or outcome</SBTip>
      <SBTip icon="🔗">A URL to a project, repo, or reference if you have one</SBTip>
      <SBDivider />
      <SBLabel>Skip is OK</SBLabel>
      <SBBody>
        Leaving a requirement blank marks it as "missing" on the recruiter view — honest is better than vague filler.
      </SBBody>
      {cvFound && (
        <>
          <SBDivider />
          <SBTip icon="✨">AI has pre-filled suggestions from your Career Scan CV where it found relevant evidence.</SBTip>
        </>
      )}
    </div>
  )

  if (step === 'questions') return (
    <div>
      <SBLabel>About the skill test</SBLabel>
      <SBHeading>3 questions · {JOB_CASE.testMinutes} minutes</SBHeading>
      <SBBody>
        Questions are generated specifically for this role based on what you claimed in your evidence. They cannot be googled — they require your actual experience.
      </SBBody>
      <SBDivider />
      <SBLabel>Rules during the real test</SBLabel>
      <SBTip icon="⏱">Timer starts the moment you enter the test screen</SBTip>
      <SBTip icon="🚫">Copy-paste is disabled</SBTip>
      <SBTip icon="👁">Tab switches are logged and shown to recruiters</SBTip>
      <SBTip icon="⚡">Auto-submits when the timer hits zero</SBTip>
      <SBDivider />
      <SBLabel>Abort option</SBLabel>
      <SBBody>
        If the questions look wrong, you can abort here and get a full credit refund. Once you move to video, credits are spent.
      </SBBody>
      <SampleTest questions={questions} />
    </div>
  )

  if (step === 'video') return (
    <div>
      <SBLabel>Recording tips</SBLabel>
      <SBHeading>One take · 2 minutes max</SBHeading>
      <SBBody>
        This is the part that replaces the cover letter. Recruiters watch 30–60 seconds on average — make the first 20 seconds count.
      </SBBody>
      <SBDivider />
      <SBLabel>What to say</SBLabel>
      <SBTip icon="🎯">Start with: "I'm [name], applying for [role] at [company]."</SBTip>
      <SBTip icon="💪">Name your strongest requirement match from the table.</SBTip>
      <SBTip icon="🔍">Mention one specific thing about the company that excited you.</SBTip>
      <SBTip icon="✅">Close with why you'd be ready to start.</SBTip>
      <SBDivider />
      <SBLabel>Technical</SBLabel>
      <SBTip icon="💡">Look at the camera lens, not your face on screen.</SBTip>
      <SBTip icon="🎙">Use headphones to avoid echo.</SBTip>
      <SBTip icon="🌅">Natural side light beats a ring light.</SBTip>
    </div>
  )

  if (step === 'test') return (
    <div>
      <SBLabel>During the test</SBLabel>
      <SBHeading>Answer in your own words</SBHeading>
      <SBBody>
        AI scores your answers for specificity, outcome clarity, and relevance. A 150-word specific answer beats a 300-word generic one every time.
      </SBBody>
      <SBDivider />
      <SBLabel>Structure that scores well</SBLabel>
      <SBTip icon="1️⃣">Situation — briefly set the context</SBTip>
      <SBTip icon="2️⃣">Action — what you specifically did</SBTip>
      <SBTip icon="3️⃣">Result — measurable outcome if possible</SBTip>
      <SBDivider />
      <SBTip icon="⚠️">Tab switches are recorded. After 3 your test auto-submits with a flag visible to recruiters.</SBTip>
    </div>
  )

  return (
    <div>
      <SBLabel>What's next</SBLabel>
      <SBHeading>Share your Job Case</SBHeading>
      <SBBody>
        Paste the link in the "Additional information" or cover letter field of your application. Recruiters open it directly — no account needed.
      </SBBody>
      <SBDivider />
      <SBTip icon="📧">You'll get an email when someone views it, showing their company domain.</SBTip>
      <SBTip icon="♻️">If no recruiter views after {JOB_CASE.refundCheckDays} days, your {JOB_CASE.creditCost} credits are auto-refunded.</SBTip>
      <SBTip icon="🗑">Auto-deleted after {JOB_CASE.expiryDays} days — no action needed.</SBTip>
    </div>
  )
}

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
  @media (max-width: 768px) { .jl-dsb { display: none !important; } }
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
    poor:  { label: 'Poor posting',   color: c.danger,  bg: 'rgba(226,75,74,0.08)',   border: 'rgba(226,75,74,0.2)'  },
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
  const labels = ['Job', 'Review', 'Consent', 'Evidence', 'Questions', 'Video', 'Test', 'Done']
  const current = step === 'analysing' ? 0 : step === 'generating' ? 7 : ordered.indexOf(step)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
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
              <div style={{ width: 20, height: 1.5, background: done ? c.success : c.border, margin: '0 2px', marginBottom: 14, transition: 'background 0.3s', flexShrink: 0 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function Spinner({ light = false }: { light?: boolean }) {
  return <div style={{ width: 14, height: 14, border: `2px solid ${light ? 'rgba(255,255,255,0.2)' : 'rgba(55,138,221,0.2)'}`, borderTopColor: light ? '#fff' : c.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block', flexShrink: 0 }} />
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function JobCaseNewPage() {
  const router = useRouter()
  const { credits } = useCredits()

  const [step, setStep]          = useState<Step>('paste')
  const [cvFound, setCvFound]    = useState(false)
  const [cvSource, setCvSource]  = useState<'session' | 'upload' | null>(null)
  const [cvUploading, setCvUploading] = useState(false)
  const [cvRequired, setCvRequired] = useState(false) // shows error if user tries to analyse without CV
  const cvInputRef = useRef<HTMLInputElement>(null)

  const [jobText, setJobText]    = useState('')
  const [jobUrl, setJobUrl]      = useState('')
  const [quality, setQuality]    = useState<JobQuality>('clear')
  const [qualityReason, setQualityReason] = useState('')
  const [matchScore, setMatchScore] = useState<number | null>(null)
  const [jobTitle, setJobTitle]  = useState('')
  const [company, setCompany]    = useState('')
  const [reqs, setReqs]          = useState<Requirement[]>([])
  const [consent, setConsent]    = useState({ video: false, test: false, tracking: false })
  const [evidence, setEvidence]  = useState<Evidence[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [analyseError, setAnalyseError] = useState('')
  const [caseSlug, setCaseSlug]  = useState('')
  const [caseUrl, setCaseUrl]    = useState('')
  const [videoStorageKey, setVideoStorageKey] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [fromJobSearch, setFromJobSearch] = useState(false)

  const [countdown, setCountdown] = useState(0)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed]     = useState(0)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const [videoUrl, setVideoUrl]   = useState('')
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

  // Read CV text from Career Scan / CV Builder / ATS scan session
  useEffect(() => {
    const cv = sessionStorage.getItem(SS.cvText)
      || sessionStorage.getItem(SS.cvbTailored)
      || sessionStorage.getItem(SS.atsSuggestions)
    if (cv && cv.trim().length > 100) {
      setCvFound(true)
      setCvSource('session')
    }
  }, [])

  // Pre-fill from job search if navigated via Job Case button, else restore draft
  useEffect(() => {
    const jobRaw = sessionStorage.getItem(SS.jcJob)
    if (jobRaw) {
      try {
        const job = JSON.parse(jobRaw)
        if (job.job_description) setJobText(job.job_description)
        if (job.job_apply_link)  setJobUrl(job.job_apply_link)
        if (job.job_title)       setJobTitle(job.job_title)
        if (job.employer_name)   setCompany(job.employer_name)
        setFromJobSearch(true)
        sessionStorage.removeItem(SS.jcJob)
      } catch {}
      return // jcJob wins over draft
    }
    // Restore draft if user navigated away accidentally
    const draftRaw = sessionStorage.getItem(SS.jcDraft)
    if (draftRaw) {
      try {
        const d = JSON.parse(draftRaw)
        if (d.jobText)  setJobText(d.jobText)
        if (d.jobUrl)   setJobUrl(d.jobUrl)
        if (d.jobTitle) setJobTitle(d.jobTitle)
        if (d.company)  setCompany(d.company)
      } catch {}
    }
  }, [])

  // Persist form draft to sessionStorage whenever jobText/jobUrl changes
  useEffect(() => {
    if (!jobText && !jobUrl) return
    try {
      sessionStorage.setItem(SS.jcDraft, JSON.stringify({ jobText, jobUrl, jobTitle, company }))
    } catch {}
  }, [jobText, jobUrl, jobTitle, company])

  // Clear draft once case is successfully created
  useEffect(() => {
    if (step === 'done') {
      try { sessionStorage.removeItem(SS.jcDraft) } catch {}
    }
  }, [step])

  async function handleCvUpload(file: File) {
    setCvUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(API.extractPdf, { method: 'POST', body: form })
      const data = await res.json()
      if (data.text && data.text.trim().length > 100) {
        sessionStorage.setItem(SS.cvText, data.text)
        setCvFound(true)
        setCvSource('upload')
        setCvRequired(false)
      }
    } catch {
      // upload failed — let user try again
    } finally {
      setCvUploading(false)
    }
  }

  async function analyse() {
    if (!jobText.trim() && !jobUrl.trim()) return
    setAnalyseError('')
    setStep('analysing')
    try {
      const cvText = sessionStorage.getItem(SS.cvText) || sessionStorage.getItem(SS.cvbTailored) || sessionStorage.getItem(SS.atsSuggestions) || ''
      const res = await fetch(API.jobCaseAnalyse, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobText, jobUrl, cvText }),
      })
      const data = await res.json()
      if (!res.ok) { setAnalyseError(data.error ?? 'Analysis failed'); setStep('paste'); return }
      setJobTitle(data.jobTitle ?? '')
      setCompany(data.companyName ?? '')
      setQuality(data.qualityScore ?? 'clear')
      setQualityReason(data.qualityReason ?? '')
      // matchScore is null when no CV was provided — display as "—" not a fake number
      setMatchScore(data.matchScore ?? null)
      setReqs(data.requirements ?? [])
      setEvidence((data.requirements ?? []).map((r: Requirement) => ({ requirementId: r.id, text: '', url: '' })))
      setStep('review')
    } catch {
      setAnalyseError('Network error — please try again.')
      setStep('paste')
    }
  }

  async function generateTest() {
    setStep('questions')
    try {
      const cvText = sessionStorage.getItem(SS.cvText) || sessionStorage.getItem(SS.cvbTailored) || sessionStorage.getItem(SS.atsSuggestions) || ''
      const res = await fetch(API.jobCaseGenerateTest, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirements: reqs, evidence, cvText }),
      })
      const data = await res.json()
      if (res.ok && data.questions?.length) {
        setQuestions(data.questions)
      }
    } catch {
      // Keep questions empty — user can still proceed, test will use generic questions
    }
  }

  async function createCase() {
    setStep('generating')
    try {
      const cvText = sessionStorage.getItem(SS.cvText) || sessionStorage.getItem(SS.cvbTailored) || sessionStorage.getItem(SS.atsSuggestions) || ''
      const res = await fetch(API.jobCaseCreate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobText, jobTitle, companyName: company,
          qualityScore: quality,
          requirements: reqs, evidence,
          questions, answers, tabSwitches,
          videoStorageKey,
          consent: { video: true, test: true, tracking: true },
          cvText,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setStep('test'); return }
      setCaseSlug(data.slug ?? '')
      setCaseUrl(data.caseUrl ?? '')
      setMatchScore(data.matchScore ?? matchScore)
      setStep('done')
    } catch {
      setStep('test')
    }
  }

  async function uploadVideo(blob: Blob): Promise<string | null> {
    setUploading(true)
    try {
      const mimeType = blob.type || 'video/webm'
      const urlRes = await fetch(API.jobCaseUploadVideo, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mimeType }),
      })
      const { signedUrl, storagePath } = await urlRes.json()
      if (!signedUrl) return null
      await fetch(signedUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': mimeType } })
      return storagePath
    } catch (err) {
      console.error('Video upload error:', err)
      return null
    } finally {
      setUploading(false)
    }
  }

  async function startCountdown() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: 'user' }, audio: { echoCancellation: true, noiseSuppression: true } })
    streamRef.current = stream
    if (liveRef.current) { liveRef.current.srcObject = stream; liveRef.current.muted = true; liveRef.current.play() }
    setCountdown(3)
    let n = 3
    const iv = setInterval(() => { n--; setCountdown(n); if (n === 0) { clearInterval(iv); beginRecording(stream) } }, 1000)
  }

  function beginRecording(stream: MediaStream) {
    chunksRef.current = []
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/mp4'
    const mr = new MediaRecorder(stream, { mimeType })
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mimeType })
      setVideoBlob(blob)
      setVideoUrl(URL.createObjectURL(blob))
      setRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
      stream.getTracks().forEach(t => t.stop())
      const key = await uploadVideo(blob)
      if (key) setVideoStorageKey(key)
    }
    mr.start()
    mrRef.current = mr
    setRecording(true)
    setElapsed(0)
    timerRef.current = setInterval(() => {
      setElapsed(e => { if (e + 1 >= JOB_CASE.videoMaxSeconds) { mr.stop(); return JOB_CASE.videoMaxSeconds } return e + 1 })
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

        <div style={{ display: 'flex', minHeight: 'calc(100vh - 52px)', fontFamily: f.body }}>

          {/* ── Sidebar ──────────────────────────────────────────────────── */}
          <div className="jl-dsb" style={{ width: 260, flexShrink: 0, background: `linear-gradient(180deg, ${SB} 0%, #0e1a28 100%)`, padding: '28px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0, position: 'sticky', top: 52, height: 'calc(100vh - 52px)' }}>
            <SidebarContent step={step} credits={credits} cvFound={cvFound} cvSource={cvSource} questions={questions} />
          </div>

          {/* ── Main content ─────────────────────────────────────────────── */}
          <div style={{ flex: 1, minWidth: 0, background: c.bg, overflowY: 'auto' }}>
            <div style={{ maxWidth: 620, margin: '0 auto', padding: '28px 20px 80px' }}>
              <StepProgress step={step} />

              {/* ── PASTE ──────────────────────────────────────────────── */}
              {(step === 'paste' || step === 'analysing') && (
                <div className="jc-fade">
                  <SectionLabel>Step 1 of 7</SectionLabel>
                  <StepHeading title="Paste the job posting" sub="Add the full description or a URL. AI extracts what the role actually requires." />
                  <Card>
                    {fromJobSearch && (
                      <div style={{ marginBottom: 12, padding: '10px 12px', background: 'rgba(55,138,221,0.06)', border: `1px solid rgba(55,138,221,0.2)`, borderRadius: 8, fontSize: 12, color: c.textMuted, lineHeight: 1.6 }}>
                        <strong style={{ color: c.accent }}>Pre-filled from job search.</strong> Adzuna summaries are often shortened — visit the job posting for the full description and paste it below for the best AI matching.
                        {jobUrl && <> <a href={jobUrl} target="_blank" rel="noopener noreferrer" style={{ color: c.accent, marginLeft: 4 }}>Open job posting →</a></>}
                      </div>
                    )}
                    <input className="jc-input" placeholder="Job URL (optional)" value={jobUrl} onChange={e => setJobUrl(e.target.value)} style={{ marginBottom: 10 }} />
                    <textarea className="jc-input" placeholder="Paste the full job description here…" rows={10} value={jobText} onChange={e => setJobText(e.target.value)} style={{ minHeight: 200 }} />

                    {/* CV — required for AI skill matching */}
                    <div style={{ marginTop: 14, padding: '12px 14px', background: cvFound ? 'rgba(29,158,117,0.06)' : cvRequired ? 'rgba(226,75,74,0.05)' : 'rgba(55,138,221,0.04)', border: `1px solid ${cvFound ? 'rgba(29,158,117,0.2)' : cvRequired ? 'rgba(226,75,74,0.3)' : c.border}`, borderRadius: 8 }}>
                      {cvFound ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: c.success }}>
                            ✓ CV loaded{cvSource === 'session' ? ' from your previous scan' : ' from file'}
                          </div>
                          <button type="button" onClick={() => cvInputRef.current?.click()} style={{ fontSize: 11, color: c.textMuted, background: 'none', border: `1px solid ${c.border}`, borderRadius: 5, padding: '3px 9px', cursor: 'pointer', fontFamily: f.body }}>
                            Replace
                          </button>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: 12, fontWeight: 600, color: cvRequired ? c.danger : c.text, marginBottom: 6 }}>
                            {cvRequired ? '⚠ CV required — without it AI cannot match your skills to the job' : 'Your CV is required to match your skills to this job'}
                          </div>
                          <div style={{ fontSize: 11, color: c.textMuted, marginBottom: 8 }}>
                            Already did a Career Scan or CV Build? Your CV is auto-loaded. Otherwise upload below.
                          </div>
                          <button
                            type="button"
                            disabled={cvUploading}
                            onClick={() => cvInputRef.current?.click()}
                            style={{ fontSize: 12, color: '#fff', background: g.button, border: 'none', borderRadius: 7, padding: '8px 16px', cursor: cvUploading ? 'not-allowed' : 'pointer', fontFamily: f.body, display: 'flex', alignItems: 'center', gap: 6, opacity: cvUploading ? 0.6 : 1, boxShadow: sh.glow }}
                          >
                            {cvUploading ? <><Spinner light /> Extracting CV…</> : '↑ Upload CV (PDF / DOCX)'}
                          </button>
                        </>
                      )}
                      <input
                        ref={cvInputRef}
                        type="file"
                        accept=".pdf,.docx"
                        style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleCvUpload(f); e.target.value = '' }}
                      />
                    </div>

                    <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
                      {step === 'analysing'
                        ? <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: c.textMuted, fontSize: 13 }}><Spinner /> Analysing job description…</span>
                        : <>
                            {analyseError && <p style={{ fontSize: 12, color: c.danger, margin: '0 0 10px', textAlign: 'right' }}>{analyseError}</p>}
                            <button className="jc-btn" onClick={() => {
                              if (!cvFound) { setCvRequired(true); return }
                              analyse()
                            }} disabled={!jobText.trim() && !jobUrl.trim()}>Analyse →</button>
                          </>
                      }
                    </div>
                  </Card>
                </div>
              )}

              {/* ── REVIEW ─────────────────────────────────────────────── */}
              {step === 'review' && (
                <div className="jc-fade">
                  <SectionLabel>Step 2 of 7</SectionLabel>
                  <StepHeading title="Review the analysis" sub="Confirm the requirements look right before you spend credits." />
                  <Card style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontFamily: f.heading, fontSize: 16, fontWeight: 700, color: c.text, marginBottom: 6 }}>{jobTitle} · {company}</div>
                        <QualityBadge q={quality} />
                        {qualityReason && <div style={{ fontSize: 11, color: c.textMuted, marginTop: 5, lineHeight: 1.5 }}>{qualityReason}</div>}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {matchScore !== null ? (
                          <>
                            <div style={{ fontFamily: f.heading, fontSize: 34, fontWeight: 700, color: matchScore >= 70 ? c.success : c.accent, lineHeight: 1 }}>{matchScore}%</div>
                            <div style={{ fontSize: 11, color: c.textFaint, marginTop: 2 }}>CV match</div>
                          </>
                        ) : (
                          <>
                            <div style={{ fontFamily: f.heading, fontSize: 28, fontWeight: 700, color: c.textFaint, lineHeight: 1 }}>—</div>
                            <div style={{ fontSize: 11, color: c.textFaint, marginTop: 2 }}>no CV</div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* What "CV match" means */}
                    <div style={{ marginBottom: 14, padding: '10px 12px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, fontSize: 12, color: c.textMuted, lineHeight: 1.6 }}>
                      <strong style={{ color: c.text }}>CV match</strong> — how well your uploaded CV covers the requirements below, scored by AI against each skill. A higher % means your existing experience is a strong fit. It does <em>not</em> affect the recruiter view — it's a signal for you to decide whether to proceed.
                      {matchScore === null && <span style={{ color: c.warning }}> Upload a CV on the previous step to see your actual score.</span>}
                    </div>

                    {/* What "test questions" means */}
                    <div style={{ marginBottom: 14, padding: '10px 12px', background: 'rgba(55,138,221,0.04)', border: `1px solid rgba(55,138,221,0.15)`, borderRadius: 8, fontSize: 12, color: c.textMuted, lineHeight: 1.6 }}>
                      <strong style={{ color: c.text }}>Skill test questions</strong> — after the video, you answer 3 AI-generated questions specific to the requirements below. Recruiters see your answers and an AI-scored result (0–100). You will preview all 3 questions <em>before</em> the timer starts and before any credits are deducted — you can abort at that point for a full refund.
                    </div>

                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: c.textMuted, marginBottom: 10 }}>Requirements extracted from this posting</div>
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

              {/* ── CONSENT ────────────────────────────────────────────── */}
              {step === 'consent' && (
                <div className="jc-fade">
                  <SectionLabel>Step 3 of 7</SectionLabel>
                  <StepHeading title="Your consent" sub="All three are required. Everything is hard-deleted after 30 days." />
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

              {/* ── EVIDENCE ───────────────────────────────────────────── */}
              {step === 'evidence' && (
                <div className="jc-fade">
                  <SectionLabel>Step 4 of 7</SectionLabel>
                  <StepHeading title="Map your evidence" sub="For each requirement, add your strongest proof. Be specific — vague answers score poorly." />
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
                          <textarea className="jc-input" placeholder="Describe your specific experience…" rows={3} value={ev.text} onChange={e => { const u = [...evidence]; u[i] = { ...ev, text: e.target.value }; setEvidence(u) }} style={{ marginBottom: 8 }} />
                          <input className="jc-input" placeholder="Project or portfolio URL (optional)" value={ev.url} onChange={e => { const u = [...evidence]; u[i] = { ...ev, url: e.target.value }; setEvidence(u) }} />
                        </div>
                      )
                    })}
                  </Card>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                    <button className="jc-btn-ghost" onClick={() => setStep('consent')}>← Back</button>
                    <button className="jc-btn" onClick={generateTest}>Preview test questions →</button>
                  </div>
                </div>
              )}

              {/* ── QUESTIONS ──────────────────────────────────────────── */}
              {step === 'questions' && (
                <div className="jc-fade">
                  <SectionLabel>Step 5 of 7</SectionLabel>
                  <StepHeading title="Your 3 skill test questions" sub="Read these before the timer starts. Abort here for a full credit refund." />
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

              {/* ── VIDEO ──────────────────────────────────────────────── */}
              {step === 'video' && (
                <div className="jc-fade">
                  <SectionLabel>Step 6 of 8</SectionLabel>
                  <StepHeading title="Record your 2-minute pitch" sub="One take only. Talk directly about why you fit this specific role." />
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
                          <button className="jc-btn" onClick={startCountdown} style={{ fontSize: 14, padding: '12px 32px' }}>Start recording</button>
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
                        {uploading && <p style={{ fontSize: 12, color: c.textMuted, marginBottom: 10 }}>Uploading video…</p>}
                        <p style={{ fontSize: 13, color: c.textMuted, marginBottom: 14 }}>Watch your recording above. This is your only take.</p>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                          <button className="jc-btn-ghost" onClick={() => { setVideoBlob(null); setVideoUrl(''); setElapsed(0); setVideoStorageKey(null) }}>Discard & re-record</button>
                          <button className="jc-btn" disabled={uploading} onClick={() => setStep('test')}>
                            {uploading ? 'Uploading…' : 'Confirm & take test →'}
                          </button>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              )}

              {/* ── TEST ───────────────────────────────────────────────── */}
              {step === 'test' && (
                <div className="jc-fade">
                  <SectionLabel>Step 7 of 8</SectionLabel>
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
                        <button className="jc-btn" onClick={createCase}>Generate my Job Case →</button>
                      </div>
                    ) : !testStarted ? (
                      <div style={{ textAlign: 'center', padding: '12px 0 20px' }}>
                        <p style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.7, marginBottom: 18 }}>The timer starts the moment you click. Right-click and copy-paste are disabled during the test.</p>
                        <button className="jc-btn" onClick={() => setTestStarted(true)} style={{ fontSize: 14, padding: '12px 32px' }}>Start {JOB_CASE.testMinutes}-minute test</button>
                      </div>
                    ) : (
                      <>
                        <div style={{ padding: '12px 14px', background: c.bg, borderRadius: 8, border: `1px solid ${c.border}`, marginBottom: 12 }}>
                          <div style={{ fontSize: 10, color: c.accent, fontWeight: 700, marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>{questions[currentQ]?.skill_being_tested}</div>
                          <div style={{ fontSize: 13, color: c.text, lineHeight: 1.7 }}>{questions[currentQ]?.question}</div>
                        </div>
                        <textarea className="jc-input" placeholder="Type your answer… (150–250 words)" rows={8} value={answers[currentQ]} onChange={e => { const u = [...answers]; u[currentQ] = e.target.value; setAnswers(u) }} onContextMenu={e => e.preventDefault()} onPaste={e => e.preventDefault()} onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && ['c','v','x','a'].includes(e.key.toLowerCase())) e.preventDefault() }} style={{ minHeight: 180 }} />
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

              {/* ── GENERATING ─────────────────────────────────────────── */}
              {step === 'generating' && (
                <div className="jc-fade" style={{ textAlign: 'center', padding: '80px 20px' }}>
                  <div style={{ width: 48, height: 48, border: `3px solid ${c.border}`, borderTopColor: c.accent, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
                  <h2 style={{ fontFamily: f.heading, fontSize: 20, fontWeight: 700, color: c.primary, margin: '0 0 8px' }}>Building your Job Case…</h2>
                  <p style={{ fontSize: 13, color: c.textMuted, maxWidth: 360, margin: '0 auto', lineHeight: 1.6 }}>AI is scoring your answers, mapping evidence, and writing your pitch narrative. About 15 seconds.</p>
                </div>
              )}

              {/* ── DONE ───────────────────────────────────────────────── */}
              {step === 'done' && (
                <div className="jc-fade">
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(29,158,117,0.1)', border: `1.5px solid rgba(29,158,117,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 16px' }}>✓</div>
                    <h2 style={{ fontFamily: f.heading, fontSize: 22, fontWeight: 700, color: c.primary, margin: '0 0 8px' }}>Your Job Case is live</h2>
                    <p style={{ fontSize: 13, color: c.textMuted, margin: 0, lineHeight: 1.6 }}>Paste this link in your application's cover letter or additional info field.</p>
                  </div>
                  <Card>
                    <div style={{ fontSize: 10, fontWeight: 700, color: c.textMuted, marginBottom: 8, letterSpacing: 0.8, textTransform: 'uppercase' }}>Your link</div>
                    <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${c.border}`, marginBottom: 18 }}>
                      <span style={{ flex: 1, padding: '10px 12px', fontSize: 13, color: c.textMuted, fontFamily: 'monospace', background: c.bg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {caseUrl || `job-lens.de/case/${caseSlug}`}
                      </span>
                      <button onClick={() => navigator.clipboard?.writeText(caseUrl || `https://job-lens.de/case/${caseSlug}`)} style={{ padding: '10px 16px', background: g.button, border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: f.heading, flexShrink: 0 }}>
                        Copy
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="jc-btn" onClick={() => router.push(`/case/${caseSlug}`)}>Preview as recruiter →</button>
                      <button className="jc-btn-ghost" onClick={() => router.push('/app/job-case')}>My Job Cases</button>
                    </div>
                    <div style={{ marginTop: 16, padding: '10px 14px', background: c.bg, borderRadius: 8, border: `1px solid ${c.border}`, fontSize: 12, color: c.textMuted, lineHeight: 1.6 }}>
                      Auto-deletes in {JOB_CASE.expiryDays} days · You'll be notified when a recruiter views this
                    </div>
                  </Card>
                </div>
              )}

            </div>
          </div>
        </div>
      </>
    </AdminGate>
  )
}
