'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { c, f, g, sh } from '@/lib/theme'
import { API } from '@/lib/constants'

type CaseData = {
  id: string
  slug: string
  job_title: string
  company_name: string
  match_score: number
  job_requirements: { id: string; skill: string; description: string; essential: boolean }[]
  requirement_evidence: { requirementId: string; text: string; url: string; status?: string }[] | null
  pitch_narrative: string | null
  test_answers: { question: string; answer: string; score: number }[] | null
  test_overall_score: number | null
  created_at: string
  expires_at: string
  candidateName: string
  videoSignedUrl: string | null
}

// ── Dark palette scoped to this standalone page ───────────────────────────────
const D = {
  bg:     '#061422',
  bg2:    '#0a1d30',
  card:   'rgba(255,255,255,0.03)',
  border: 'rgba(255,255,255,0.08)',
  txt1:   '#f1f5f9',
  txt2:   'rgba(255,255,255,0.45)',
  txt3:   'rgba(255,255,255,0.25)',
}

function MatchBadge({ status }: { status: string }) {
  const map: Record<string, { icon: string; label: string; color: string; bg: string; border: string }> = {
    verified: { icon: '✓', label: 'Verified', color: c.success, bg: 'rgba(29,158,117,0.1)',  border: 'rgba(29,158,117,0.2)' },
    partial:  { icon: '~', label: 'Partial',  color: c.warning, bg: 'rgba(186,117,23,0.1)', border: 'rgba(186,117,23,0.2)' },
    missing:  { icon: '✗', label: 'Missing',  color: c.danger,  bg: 'rgba(226,75,74,0.1)',  border: 'rgba(226,75,74,0.2)' },
  }
  const m = map[status] ?? map.verified
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, background: m.bg, color: m.color, fontSize: 11, fontWeight: 700, flexShrink: 0, border: `1px solid ${m.border}` }}>
      {m.icon} {m.label}
    </span>
  )
}

function ScoreRing({ value, size = 88 }: { value: number; size?: number }) {
  const r = (size / 2) - 7
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - value / 100)
  const color = value >= 75 ? c.success : value >= 50 ? c.accent : c.warning
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={D.border} strokeWidth={5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      <text x="50%" y="50%" textAnchor="middle" dy=".35em" fill="#fff"
        fontSize={size * 0.2} fontWeight={700} fontFamily={f.heading}>{value}%</text>
    </svg>
  )
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function PublicCasePage() {
  const params       = useParams()
  const searchParams = useSearchParams()
  const slug         = params?.slug as string

  const [email, setEmail]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [emailSent, setEmailSent]   = useState(false)
  const [granted, setGranted]   = useState(searchParams?.get('access') === 'granted')

  // Recruiter interest state
  const [interestEmail, setInterestEmail]     = useState('')
  const [interestConsent, setInterestConsent] = useState(false)
  const [interestSubmitting, setInterestSubmitting] = useState(false)
  const [interestError, setInterestError]     = useState('')
  const [interestDone, setInterestDone]       = useState(false)
  const interestRef = useRef<HTMLDivElement>(null)
  const [caseData, setCaseData] = useState<CaseData | null>(null)
  const [loadError, setLoadError] = useState('')
  const [isOwner, setIsOwner]   = useState(false)

  // Owner bypass: authenticated case owners skip the email gate
  useEffect(() => {
    if (!slug) return
    fetch(`/api/job-case/owner-check/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.owner) {
          setIsOwner(true)
          setGranted(true)
        }
      })
      .catch(() => null)
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!granted || !slug) return
    fetch(`/api/job-case/public/${slug}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setLoadError(d.error)
        else setCaseData(d)
      })
      .catch(() => setLoadError('Failed to load case — please refresh.'))
  }, [granted, slug])

  async function requestAccess(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')
    setSubmitting(true)
    try {
      // Record the request (for domain tracking) then grant immediate access
      await fetch(API.jobCaseRequestAccess, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, email }),
      })
      setEmailSent(true)
    } catch {
      setSubmitError('Something went wrong — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function expressInterest(e: React.FormEvent) {
    e.preventDefault()
    if (!interestConsent) { setInterestError('Please tick the consent box to continue.'); return }
    setInterestError('')
    setInterestSubmitting(true)
    try {
      const res = await fetch(API.jobCaseRecruiterInterest, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recruiterEmail: interestEmail, consent: interestConsent, slug }),
      })
      const data = await res.json()
      if (!res.ok) { setInterestError(data.error ?? 'Something went wrong — please try again.'); return }
      setInterestDone(true)
    } catch {
      setInterestError('Network error — please try again.')
    } finally {
      setInterestSubmitting(false)
    }
  }

  const expiresLabel = caseData ? fmt(caseData.expires_at) : ''

  // At-a-glance stats — computed from data already on the page, so a
  // recruiter skimming for a few seconds gets the headline numbers before
  // reading a single requirement row.
  const totalReqs    = caseData?.job_requirements?.length ?? 0
  const verifiedReqs = caseData?.job_requirements?.filter(req => {
    const ev = caseData.requirement_evidence?.find(e => e.requirementId === req.id)
    return !!ev?.text && (ev.status ?? 'verified') === 'verified'
  }).length ?? 0
  const evidenceCount = caseData?.requirement_evidence?.filter(e => e.text?.trim()).length ?? 0

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes jcFadeUp { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
        @keyframes jcSpin   { to { transform: rotate(360deg); } }
        .jc-fade { animation: jcFadeUp 0.4s ease; }
        .jc-req-row { transition: background 0.15s; }
        .jc-req-row:hover { background: rgba(255,255,255,0.04) !important; }
      `}</style>

      <div style={{ minHeight: '100vh', background: D.bg, fontFamily: f.body, color: D.txt1 }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{
          padding: '0 24px', height: 52,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `1px solid ${D.border}`,
          position: 'sticky', top: 0,
          background: 'rgba(6,20,34,0.94)', backdropFilter: 'blur(16px)', zIndex: 50,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {isOwner && (
              <Link href="/app/job-case" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: D.txt3, textDecoration: 'none', fontFamily: f.body, padding: '5px 10px', borderRadius: 7, border: `1px solid ${D.border}`, transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = D.txt1)}
                onMouseLeave={e => (e.currentTarget.style.color = D.txt3)}>
                ← My Cases
              </Link>
            )}
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
              <svg width="20" height="20" viewBox="0 0 44 44">
                <circle cx="20" cy="20" r="13" fill="none" stroke={c.accent} strokeWidth="2.5"/>
                <circle cx="20" cy="20" r="8"  fill="none" stroke={c.accentLight} strokeWidth="1.2"/>
                <circle cx="20" cy="20" r="3"  fill={c.accent}/>
                <line x1="28" y1="28" x2="36" y2="36" stroke={c.accent} strokeWidth="3" strokeLinecap="round"/>
              </svg>
              <span style={{ fontFamily: f.heading, fontSize: 14, fontWeight: 700, color: D.txt1 }}>
                Job-Lens <span style={{ color: c.accent }}>AI</span>
              </span>
            </Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(55,138,221,0.1)', color: c.accent, fontWeight: 600, border: '1px solid rgba(55,138,221,0.2)' }}>
              Verified Job Case
            </span>
            {expiresLabel && <span style={{ fontSize: 11, color: D.txt3 }}>Expires {expiresLabel}</span>}
          </div>
        </div>

        <div style={{ maxWidth: 700, margin: '0 auto', padding: '52px 20px 80px' }}>

          {/* ── GATE ─────────────────────────────────────────────────────── */}
          {!granted && !emailSent && (
            <div className="jc-fade" style={{ maxWidth: 400, margin: '0 auto', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(55,138,221,0.08)', border: '1px solid rgba(55,138,221,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 20px' }}>
                🔒
              </div>
              <h1 style={{ fontFamily: f.heading, fontSize: 22, fontWeight: 700, color: D.txt1, margin: '0 0 10px' }}>
                Access this Job Case
              </h1>
              <p style={{ fontSize: 14, color: D.txt2, lineHeight: 1.7, margin: '0 0 28px' }}>
                Enter your work email. We'll send you a secure link — click it to view the candidate's verified profile.
              </p>

              <form onSubmit={requestAccess} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  type="email" required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: `1px solid ${D.border}`, borderRadius: 10, padding: '13px 16px', color: D.txt1, fontSize: 14, fontFamily: f.body, outline: 'none' }}
                />
                {submitError && <p style={{ fontSize: 12, color: c.danger, margin: 0, textAlign: 'left' }}>{submitError}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ background: g.button, color: '#fff', border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 14, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: f.heading, boxShadow: sh.glow, opacity: submitting ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {submitting ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'jcSpin 0.8s linear infinite' }} /> Sending…</> : 'Send me the access link'}
                </button>
                <p style={{ fontSize: 11, color: D.txt3, lineHeight: 1.7, margin: '4px 0 0' }}>
                  Your email domain (e.g. company.com) is shared with the candidate as a view confirmation. Your full email is never stored.
                </p>
              </form>
            </div>
          )}

          {/* ── CHECK INBOX ──────────────────────────────────────────────── */}
          {!granted && emailSent && (
            <div className="jc-fade" style={{ maxWidth: 400, margin: '0 auto', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 20px' }}>
                ✉️
              </div>
              <h1 style={{ fontFamily: f.heading, fontSize: 22, fontWeight: 700, color: D.txt1, margin: '0 0 10px' }}>
                Check your inbox
              </h1>
              <p style={{ fontSize: 14, color: D.txt2, lineHeight: 1.7, margin: '0 0 8px' }}>
                We've sent a secure access link to <strong style={{ color: D.txt1 }}>{email}</strong>.
              </p>
              <p style={{ fontSize: 13, color: D.txt3, lineHeight: 1.7, margin: '0 0 28px' }}>
                Click the link in that email to open this Job Case. The link expires in 24 hours and can only be used once.
              </p>
              <button
                onClick={() => { setEmailSent(false); setEmail('') }}
                style={{ fontSize: 13, color: D.txt3, background: 'none', border: `1px solid ${D.border}`, borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontFamily: f.body }}
              >
                Use a different email
              </button>
            </div>
          )}

          {/* ── Loading ───────────────────────────────────────────────────── */}
          {granted && !caseData && !loadError && (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: D.txt2, fontSize: 14 }}>
              <div style={{ width: 20, height: 20, border: `2px solid ${D.border}`, borderTopColor: c.accent, borderRadius: '50%', animation: 'jcSpin 0.8s linear infinite', margin: '0 auto 16px' }} />
              Loading…
            </div>
          )}

          {/* ── Error ─────────────────────────────────────────────────────── */}
          {granted && loadError && (
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <p style={{ color: c.danger, fontSize: 14 }}>{loadError}</p>
            </div>
          )}

          {/* ── FULL CASE ─────────────────────────────────────────────────── */}
          {granted && caseData && (
            <div className="jc-fade">

              {/* Hero */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 32, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: c.accent, margin: '0 0 10px' }}>
                    Job Case · {caseData.job_title} @ {caseData.company_name}
                  </p>
                  <h1 style={{ fontFamily: f.heading, fontSize: 28, fontWeight: 700, color: D.txt1, margin: '0 0 6px', lineHeight: 1.2 }}>
                    {caseData.candidateName}
                  </h1>
                  <p style={{ fontSize: 13, color: D.txt2, margin: 0 }}>
                    Verified Job Case · Created {fmt(caseData.created_at)}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                  <ScoreRing value={caseData.match_score ?? 0} />
                  <div style={{ fontSize: 11, color: D.txt3, textAlign: 'center' }}>AI match score</div>
                </div>
              </div>

              {/* At-a-glance stat strip — the CV-skim equivalent: everything a
                  recruiter needs in the first few seconds, before reading detail */}
              {totalReqs > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${caseData.test_overall_score !== null ? 3 : 2}, 1fr)`, gap: 10, marginBottom: 24 }}>
                  <div style={{ padding: '14px 16px', background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, textAlign: 'center' as const }}>
                    <div style={{ fontFamily: f.heading, fontSize: 22, fontWeight: 700, color: c.success }}>{verifiedReqs}/{totalReqs}</div>
                    <div style={{ fontSize: 11, color: D.txt3, marginTop: 2 }}>Requirements verified</div>
                  </div>
                  <div style={{ padding: '14px 16px', background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, textAlign: 'center' as const }}>
                    <div style={{ fontFamily: f.heading, fontSize: 22, fontWeight: 700, color: c.accent }}>{evidenceCount}</div>
                    <div style={{ fontSize: 11, color: D.txt3, marginTop: 2 }}>Evidence items provided</div>
                  </div>
                  {caseData.test_overall_score !== null && (
                    <div style={{ padding: '14px 16px', background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, textAlign: 'center' as const }}>
                      <div style={{ fontFamily: f.heading, fontSize: 22, fontWeight: 700, color: caseData.test_overall_score >= 80 ? c.success : caseData.test_overall_score >= 60 ? c.accent : c.warning }}>{caseData.test_overall_score}</div>
                      <div style={{ fontSize: 11, color: D.txt3, marginTop: 2 }}>Skill test score</div>
                    </div>
                  )}
                </div>
              )}

              {/* Trust / methodology note — a bare "AI score" reads as a black box to
                  a skeptical recruiter; this states in one line what verification means */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28, padding: '10px 14px', background: 'rgba(29,158,117,0.05)', border: '1px solid rgba(29,158,117,0.14)', borderRadius: 10 }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>🛡️</span>
                <span style={{ fontSize: 11.5, color: D.txt2, lineHeight: 1.55 }}>
                  "Verified" means the candidate submitted specific, checkable evidence (with links where available) for that requirement — scored by AI against their own words, not self-rated.
                </span>
              </div>

              {/* Video pitch */}
              {caseData.videoSignedUrl && (
                <div style={{ marginBottom: 28 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: D.txt3, margin: '0 0 12px' }}>
                    Video pitch
                  </p>
                  <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${D.border}`, background: '#000', aspectRatio: '16/9' }}>
                    <video
                      src={caseData.videoSignedUrl}
                      controls
                      playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </div>
                </div>
              )}

              {/* Pitch narrative */}
              {caseData.pitch_narrative && (
                <div style={{ padding: '18px 20px', background: 'rgba(55,138,221,0.05)', border: '1px solid rgba(55,138,221,0.14)', borderRadius: 12, marginBottom: 28, lineHeight: 1.8, fontSize: 14, color: 'rgba(255,255,255,0.65)', fontStyle: 'italic' }}>
                  "{caseData.pitch_narrative}"
                </div>
              )}

              {/* Requirement match */}
              {caseData.job_requirements?.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: D.txt3, margin: '0 0 12px' }}>
                    Requirement match
                  </p>
                  <div style={{ border: `1px solid ${D.border}`, borderRadius: 12, overflow: 'hidden' }}>
                    {caseData.job_requirements.map((req, i) => {
                      const ev = caseData.requirement_evidence?.find(e => e.requirementId === req.id)
                      const status = ev?.text ? (ev.status ?? 'verified') : 'missing'
                      return (
                        <div key={req.id} className="jc-req-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 18px', borderBottom: i < caseData.job_requirements.length - 1 ? `1px solid ${D.border}` : 'none', background: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                          <MatchBadge status={status} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: D.txt1, marginBottom: 3 }}>{req.skill}</div>
                            {ev?.text && <div style={{ fontSize: 12, color: D.txt2, lineHeight: 1.6 }}>{ev.text}</div>}
                            {ev?.url && (
                              <a href={ev.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: c.accent, textDecoration: 'none', marginTop: 4, display: 'inline-block', opacity: 0.8 }}>
                                → {ev.url.replace('https://', '')}
                              </a>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Test results */}
              {caseData.test_answers?.length ? (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 12px' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: D.txt3, margin: 0 }}>Skill test</p>
                    {caseData.test_overall_score !== null && (
                      <span style={{ fontFamily: f.heading, fontSize: 18, fontWeight: 700, color: c.accent }}>
                        {caseData.test_overall_score}/100
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {caseData.test_answers.map((ta, i) => (
                      <div key={i} style={{ padding: '16px 18px', background: D.card, border: `1px solid ${D.border}`, borderRadius: 11 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 10 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: D.txt2, lineHeight: 1.5, flex: 1 }}>
                            Q{i + 1}: {ta.question}
                          </div>
                          <div style={{ fontFamily: f.heading, fontSize: 18, fontWeight: 700, color: ta.score >= 80 ? c.success : ta.score >= 60 ? c.accent : c.warning, flexShrink: 0 }}>
                            {ta.score}
                          </div>
                        </div>
                        <div style={{ fontSize: 13, color: D.txt2, lineHeight: 1.75, borderTop: `1px solid ${D.border}`, paddingTop: 10 }}>
                          {ta.answer}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Recruiter interest — not shown to owner */}
              {!isOwner && (
                <div ref={interestRef} style={{ margin: '0 0 28px', padding: '24px', background: 'rgba(55,138,221,0.05)', border: `1px solid rgba(55,138,221,0.18)`, borderRadius: 14 }}>
                  {interestDone ? (
                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                      <div style={{ fontSize: 28, marginBottom: 10 }}>✓</div>
                      <div style={{ fontFamily: f.heading, fontSize: 16, fontWeight: 700, color: D.txt1, marginBottom: 6 }}>
                        Candidate notified
                      </div>
                      <p style={{ fontSize: 13, color: D.txt2, margin: 0, lineHeight: 1.7 }}>
                        We've sent your email to the candidate. Expect a reply directly to your inbox.
                      </p>
                    </div>
                  ) : (
                    <>
                      <h3 style={{ fontFamily: f.heading, fontSize: 17, fontWeight: 700, color: D.txt1, margin: '0 0 6px' }}>
                        Interested in this candidate?
                      </h3>
                      <p style={{ fontSize: 13, color: D.txt2, lineHeight: 1.7, margin: '0 0 18px' }}>
                        Share your email with them and we'll notify them immediately. They'll reply to you directly — no platform middleman.
                      </p>
                      <form onSubmit={expressInterest} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <input
                          type="email" required
                          value={interestEmail}
                          onChange={e => setInterestEmail(e.target.value)}
                          placeholder="your@company.com"
                          style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: `1px solid ${D.border}`, borderRadius: 8, padding: '11px 14px', color: D.txt1, fontSize: 13, fontFamily: f.body, outline: 'none' }}
                        />
                        <label style={{ display: 'flex', gap: 10, cursor: 'pointer', alignItems: 'flex-start' }}>
                          <input
                            type="checkbox"
                            checked={interestConsent}
                            onChange={e => setInterestConsent(e.target.checked)}
                            style={{ marginTop: 2, width: 15, height: 15, accentColor: c.accent, flexShrink: 0, cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: 12, color: D.txt2, lineHeight: 1.65 }}>
                            I consent to Job-Lens storing my email and sharing it with this candidate so they can contact me directly.
                            My email will be deleted when this Job Case expires ({expiresLabel}).
                          </span>
                        </label>
                        {interestError && <p style={{ fontSize: 12, color: c.danger, margin: 0 }}>{interestError}</p>}
                        <button
                          type="submit"
                          disabled={interestSubmitting}
                          style={{ background: g.button, color: '#fff', border: 'none', borderRadius: 8, padding: '11px 24px', fontSize: 13, fontWeight: 700, cursor: interestSubmitting ? 'not-allowed' : 'pointer', fontFamily: f.heading, boxShadow: sh.glow, opacity: interestSubmitting ? 0.6 : 1, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                          {interestSubmitting
                            ? <><div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'jcSpin 0.8s linear infinite' }} /> Sending…</>
                            : 'Notify candidate of my interest →'}
                        </button>
                      </form>
                    </>
                  )}
                </div>
              )}

              {/* Footer */}
              <div style={{ padding: '14px 18px', background: D.card, border: `1px solid ${D.border}`, borderRadius: 10, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 12, color: D.txt3 }}>Created {fmt(caseData.created_at)} · Auto-deletes {expiresLabel}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>Your domain was shared with the candidate as a view confirmation</span>
              </div>

            </div>
          )}
        </div>
      </div>
    </>
  )
}
