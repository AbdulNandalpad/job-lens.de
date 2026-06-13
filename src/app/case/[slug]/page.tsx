'use client'

import { useState } from 'react'
import Link from 'next/link'
import { c, f, g, sh } from '@/lib/theme'

const MOCK_CASE = {
  candidateName: 'Alex Müller',
  currentRole: 'Frontend Engineer',
  location: 'Berlin, Germany',
  jobTitle: 'Senior Frontend Engineer',
  company: 'Acme GmbH',
  matchScore: 72,
  requirementsMet: 4,
  requirementsTotal: 6,
  pitchNarrative: 'I have spent the last four years building production React applications that serve hundreds of thousands of users. At my current company I led the migration from Create React App to Next.js 14 App Router, cutting LCP by 40%. I have shipped five major features using TypeScript generics and have a strong record of explaining technical decisions clearly to product and design — something this role explicitly values.',
  requirements: [
    { skill: 'React / Next.js',    status: 'verified', evidence: 'Led CRA → Next.js 14 migration at Deutsche Telekom subsidiary. 40% LCP improvement.',                    url: 'https://github.com/alexm/nextjs-case-study' },
    { skill: 'TypeScript',         status: 'verified', evidence: 'Authored the internal TypeScript style guide adopted by 12 engineers. Strong with generics and mapped types.', url: '' },
    { skill: 'Node.js & APIs',     status: 'partial',  evidence: 'Built two internal REST APIs in Node/Express. Less experience with GraphQL.',                              url: '' },
    { skill: 'PostgreSQL',         status: 'verified', evidence: 'Designed schema for multi-tenant SaaS with 2M+ rows. Comfortable with CTEs and window functions.',          url: '' },
    { skill: 'CI/CD',              status: 'partial',  evidence: 'Used GitHub Actions for 2 years. Less experience with advanced pipeline optimisation.',                     url: '' },
    { skill: 'Team communication', status: 'verified', evidence: 'Run weekly architecture reviews. Wrote 3 RFCs adopted by the team. Presented to C-suite twice.',            url: '' },
  ],
  testAnswers: [
    { question: 'Describe a performance challenge you solved using Server Components.', answer: 'At my previous job we had a product listing page with 80+ components fetching data client-side. Switching to React Server Components eliminated 12 redundant API calls per page and brought TTFB from 1.8s to 0.4s on a cold cache. The main challenge was restructuring shared state — we ended up using Zustand only for UI state and RSC for all read data.', score: 82 },
    { question: 'Walk me through a PostgreSQL schema you designed for complex relationships.', answer: 'For a multi-tenant analytics product I chose row-level tenant isolation over schema-per-tenant because we had 3000+ tenants and schema creation overhead was unacceptable at that scale. I now wish I had added a composite index on (tenant_id, created_at) earlier — we added it six months later when queries slowed under load.', score: 76 },
    { question: 'Third-party API breaking change in 48 hours — how do you handle it?', answer: 'First I create an adapter layer if one does not exist, so internal code never calls the third-party contract directly. Then I write the new adapter behind a feature flag, deploy to staging, and run the existing test suite against both. I communicate via a short async write-up with the impact, the plan, and the deploy window — not a meeting. The flag means we can roll back in one line if needed.', score: 91 },
  ],
  testOverallScore: 83,
  tabSwitches: 0,
  createdAt: '10 Jun 2026',
  expiresAt: '10 Jul 2026',
}

// ── Colours scoped to this dark standalone page ───────────────────────────────
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
    verified: { icon: '✓', label: 'Verified', color: c.success, bg: 'rgba(29,158,117,0.1)',  border: 'rgba(29,158,117,0.2)'  },
    partial:  { icon: '~', label: 'Partial',  color: c.warning, bg: 'rgba(186,117,23,0.1)', border: 'rgba(186,117,23,0.2)' },
    missing:  { icon: '✗', label: 'Missing',  color: c.danger,  bg: 'rgba(226,75,74,0.1)',  border: 'rgba(226,75,74,0.2)'  },
  }
  const m = map[status] ?? map.missing
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

export default function PublicCasePage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [granted, setGranted] = useState(false)

  function requestAccess(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes('@') || !email.includes('.')) return
    setSubmitted(true)
    setTimeout(() => setGranted(true), 1400)
  }

  const kc = MOCK_CASE

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(55,138,221,0.1)', color: c.accent, fontWeight: 600, border: '1px solid rgba(55,138,221,0.2)' }}>
              Verified Job Case
            </span>
            <span style={{ fontSize: 11, color: D.txt3 }}>Expires {kc.expiresAt}</span>
          </div>
        </div>

        <div style={{ maxWidth: 700, margin: '0 auto', padding: '52px 20px 80px' }}>

          {/* ── GATE ─────────────────────────────────────────────────────── */}
          {!granted && (
            <div className="jc-fade" style={{ maxWidth: 400, margin: '0 auto', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(55,138,221,0.08)', border: '1px solid rgba(55,138,221,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 20px' }}>
                🔒
              </div>
              <h1 style={{ fontFamily: f.heading, fontSize: 22, fontWeight: 700, color: D.txt1, margin: '0 0 10px' }}>
                Access this Job Case
              </h1>
              <p style={{ fontSize: 14, color: D.txt2, lineHeight: 1.7, margin: '0 0 28px' }}>
                Enter your work email to receive a one-time access link.
              </p>

              {!submitted ? (
                <form onSubmit={requestAccess} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    type="email" required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: `1px solid ${D.border}`, borderRadius: 10, padding: '13px 16px', color: D.txt1, fontSize: 14, fontFamily: f.body, outline: 'none', transition: 'border-color 0.15s' }}
                  />
                  <button type="submit" style={{ background: g.button, color: '#fff', border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: f.heading, boxShadow: sh.glow }}>
                    Send access link
                  </button>
                  <p style={{ fontSize: 11, color: D.txt3, lineHeight: 1.7, margin: '4px 0 0' }}>
                    Your email domain (e.g. company.com) is shared with the candidate as a view confirmation. Your full email is never stored.
                  </p>
                </form>
              ) : (
                <div style={{ padding: '28px 24px', background: D.card, border: `1px solid ${D.border}`, borderRadius: 14 }}>
                  <div style={{ width: 18, height: 18, border: `2px solid ${c.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'jcSpin 0.8s linear infinite', margin: '0 auto 12px' }} />
                  <div style={{ fontSize: 14, color: D.txt2 }}>
                    Sending link to <strong style={{ color: D.txt1 }}>{email}</strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── FULL CASE ─────────────────────────────────────────────────── */}
          {granted && (
            <div className="jc-fade">

              {/* Hero */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 32, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: c.accent, margin: '0 0 10px' }}>
                    Job Case · {kc.jobTitle} @ {kc.company}
                  </p>
                  <h1 style={{ fontFamily: f.heading, fontSize: 28, fontWeight: 700, color: D.txt1, margin: '0 0 6px', lineHeight: 1.2 }}>
                    {kc.candidateName}
                  </h1>
                  <p style={{ fontSize: 13, color: D.txt2, margin: 0 }}>
                    {kc.currentRole} · {kc.location}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                  <ScoreRing value={kc.matchScore} />
                  <div style={{ fontSize: 11, color: D.txt3, textAlign: 'center' }}>
                    {kc.requirementsMet}/{kc.requirementsTotal} met
                  </div>
                </div>
              </div>

              {/* Pitch */}
              <div style={{ padding: '18px 20px', background: 'rgba(55,138,221,0.05)', border: '1px solid rgba(55,138,221,0.14)', borderRadius: 12, marginBottom: 28, lineHeight: 1.8, fontSize: 14, color: 'rgba(255,255,255,0.65)', fontStyle: 'italic' }}>
                "{kc.pitchNarrative}"
              </div>

              {/* Video */}
              <div style={{ marginBottom: 28 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: D.txt3, margin: '0 0 12px' }}>Video pitch</p>
                <div style={{ width: '100%', aspectRatio: '16/9', background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(55,138,221,0.12)', border: '1px solid rgba(55,138,221,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer' }}>▶</div>
                  <span style={{ fontSize: 12, color: D.txt3 }}>2-minute pitch · one take · unedited</span>
                </div>
              </div>

              {/* Requirement match */}
              <div style={{ marginBottom: 28 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: D.txt3, margin: '0 0 12px' }}>Requirement match</p>
                <div style={{ border: `1px solid ${D.border}`, borderRadius: 12, overflow: 'hidden' }}>
                  {kc.requirements.map((req, i) => (
                    <div key={i} className="jc-req-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 18px', borderBottom: i < kc.requirements.length - 1 ? `1px solid ${D.border}` : 'none', background: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                      <MatchBadge status={req.status} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: D.txt1, marginBottom: 3 }}>{req.skill}</div>
                        <div style={{ fontSize: 12, color: D.txt2, lineHeight: 1.6 }}>{req.evidence}</div>
                        {req.url && (
                          <a href={req.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: c.accent, textDecoration: 'none', marginTop: 4, display: 'inline-block', opacity: 0.8 }}>
                            → {req.url.replace('https://', '')}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Test results */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 12px' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: D.txt3, margin: 0 }}>Skill test</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: f.heading, fontSize: 18, fontWeight: 700, color: c.accent }}>{kc.testOverallScore}/100</span>
                    {kc.tabSwitches === 0 && (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(29,158,117,0.1)', color: c.success, fontWeight: 600, border: '1px solid rgba(29,158,117,0.2)' }}>No tab switches</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {kc.testAnswers.map((ta, i) => (
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

              {/* Footer */}
              <div style={{ padding: '14px 18px', background: D.card, border: `1px solid ${D.border}`, borderRadius: 10, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 12, color: D.txt3 }}>Created {kc.createdAt} · Auto-deletes {kc.expiresAt}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>Your domain was shared with the candidate as a view confirmation</span>
              </div>

            </div>
          )}
        </div>
      </div>
    </>
  )
}
