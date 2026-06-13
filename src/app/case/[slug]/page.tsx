'use client'

import { useState } from 'react'
import { theme } from '@/lib/theme'
import AdminGate from '@/components/AdminGate'

const { colors: c, fonts: f } = theme

// ── Mock public case data ────────────────────────────────────────────────────

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
    { skill: 'React / Next.js', status: 'verified', evidence: 'Led CRA → Next.js 14 migration at Deutsche Telekom subsidiary, 40% LCP improvement.', evidenceUrl: 'https://github.com/alexm/nextjs-migration-case-study' },
    { skill: 'TypeScript', status: 'verified', evidence: 'Authored the internal TypeScript style guide adopted by 12 engineers. Strong with generics and mapped types.', evidenceUrl: '' },
    { skill: 'Node.js & APIs', status: 'partial', evidence: 'Built two internal REST APIs in Node/Express. Less experience with GraphQL.', evidenceUrl: '' },
    { skill: 'PostgreSQL', status: 'verified', evidence: 'Designed schema for multi-tenant SaaS product with 2M+ rows. Comfortable with CTEs, window functions.', evidenceUrl: '' },
    { skill: 'CI/CD', status: 'partial', evidence: 'Used GitHub Actions for 2 years. Less experience with advanced pipeline optimisation.', evidenceUrl: '' },
    { skill: 'Team communication', status: 'verified', evidence: 'Run weekly architecture reviews. Wrote 3 RFCs adopted by the team. Presented to C-suite twice.', evidenceUrl: '' },
  ],
  testAnswers: [
    {
      question: 'Describe a specific performance challenge you solved using Server Components.',
      answer: 'At my previous job we had a product listing page with 80+ components fetching their own data client-side. Switching the data-fetching layer to React Server Components eliminated 12 redundant API calls per page load and brought TTFB down from 1.8s to 0.4s on a cold cache. The main challenge was restructuring shared state — we ended up using Zustand only for UI state and RSC for all read data.',
      score: 82,
    },
    {
      question: 'Walk me through a PostgreSQL schema you designed.',
      answer: 'For a multi-tenant analytics product I designed a schema where each tenant row references a shared `plans` table instead of duplicating data. The main challenge was deciding whether to use row-level tenant isolation or schema-per-tenant. We went with row-level because we had 3000+ tenants and schema creation overhead was unacceptable at that scale. I now wish I had used a composite index on (tenant_id, created_at) earlier — we added it six months later when queries slowed.',
      score: 76,
    },
    {
      question: 'Third-party API breaking change in 48 hours — how do you handle it?',
      answer: 'First I create an adapter layer if one does not exist, so the internal code never calls the third-party contract directly. Then I write the new adapter version behind a feature flag, deploy it to staging, and run the existing test suite against both. I communicate to the team via a short async write-up (not a meeting) with the impact, the plan, and the deploy window. The feature flag means we can roll back in one line if the new format has unexpected edge cases.',
      score: 91,
    },
  ],
  testOverallScore: 83,
  tabSwitches: 0,
  createdAt: '2026-06-10',
  expiresAt: '2026-07-10',
}

// ── Status badge ──────────────────────────────────────────────────────────────

function MatchBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    verified: { label: 'Verified',  color: c.success, bg: 'rgba(29,158,117,0.12)' },
    partial:  { label: 'Partial',   color: c.warning, bg: 'rgba(186,117,23,0.12)' },
    missing:  { label: 'Missing',   color: c.danger,  bg: 'rgba(226,75,74,0.12)' },
  }
  const m = map[status] ?? map.missing
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, background: m.bg, color: m.color, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
      {status === 'verified' ? '✓' : status === 'partial' ? '~' : '✗'} {m.label}
    </span>
  )
}

// ── Score ring ────────────────────────────────────────────────────────────────

function ScoreRing({ value, size = 80 }: { value: number; size?: number }) {
  const r = (size / 2) - 6
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - value / 100)
  const color = value >= 75 ? c.success : value >= 50 ? c.accent : c.warning
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      <text x="50%" y="50%" textAnchor="middle" dy=".35em" fill="#fff" fontSize={size * 0.22} fontWeight={800} fontFamily="'Syne', sans-serif">
        {value}%
      </text>
    </svg>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PublicCasePage() {
  const [email, setEmail] = useState('')
  const [gateSubmitted, setGateSubmitted] = useState(false)
  const [accessGranted, setAccessGranted] = useState(false)
  const [copying, setCopying] = useState(false)

  // For local preview, skip the real magic link flow
  function handleAccessRequest(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes('@') || !email.includes('.')) return
    setGateSubmitted(true)
    // Simulate instant access for local demo
    setTimeout(() => setAccessGranted(true), 1200)
  }

  const kc = MOCK_CASE

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
        @keyframes spin { to{transform:rotate(360deg);} }
        .jc-section { animation: fadeIn 0.4s ease; }
        .jc-req-row:hover { background: rgba(255,255,255,0.06) !important; }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #061422 0%, #0a1c2e 100%)', fontFamily: f.body, color: '#fff' }}>

        {/* Minimal header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="22" height="22" viewBox="0 0 44 44">
            <circle cx="20" cy="20" r="13" fill="none" stroke="#378ADD" strokeWidth="2.5"/>
            <circle cx="20" cy="20" r="8" fill="none" stroke="#85B7EB" strokeWidth="1.2"/>
            <circle cx="20" cy="20" r="3" fill="#378ADD"/>
            <line x1="28" y1="28" x2="36" y2="36" stroke="#378ADD" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 700, color: '#E6F1FB' }}>
            Job-Lens <span style={{ color: '#378ADD' }}>AI</span>
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            Verified Job Case · Expires {kc.expiresAt}
          </span>
        </div>

        <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 80px' }}>

          {/* ── MAGIC LINK GATE ─────────────────────────────────────────── */}
          {!accessGranted && (
            <div className="jc-section" style={{ maxWidth: 440, margin: '0 auto', textAlign: 'center', paddingTop: 40 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(55,138,221,0.1)', border: '1px solid rgba(55,138,221,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 20px' }}>
                🔒
              </div>
              <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 10px' }}>
                Access this Job Case
              </h1>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 28 }}>
                Enter your work email to receive a one-time access link.
              </p>

              {!gateSubmitted ? (
                <form onSubmit={handleAccessRequest}>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '13px 16px', color: '#fff', fontSize: 15, fontFamily: 'inherit', marginBottom: 12, outline: 'none', boxSizing: 'border-box' }}
                  />
                  <button type="submit" style={{ width: '100%', background: 'linear-gradient(135deg,#378ADD,#185FA5)', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Send access link
                  </button>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 14, lineHeight: 1.6 }}>
                    Your email domain (e.g. company.com) will be shared with the candidate as a view confirmation. Your full email is never stored. We do not add you to any mailing list.
                  </p>
                </form>
              ) : (
                <div style={{ padding: '28px 24px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14 }}>
                  <div style={{ width: 20, height: 20, border: '2px solid #378ADD', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
                    Sending access link to <strong style={{ color: '#fff' }}>{email}</strong>
                  </div>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>
                    (Local demo: granting access automatically…)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── FULL JOB CASE ───────────────────────────────────────────── */}
          {accessGranted && (
            <div className="jc-section">

              {/* Hero */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginBottom: 32, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                    Job Case for
                  </div>
                  <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: -0.5 }}>
                    {kc.candidateName}
                  </h1>
                  <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>{kc.currentRole} · {kc.location}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
                    Applying for: <strong style={{ color: 'rgba(255,255,255,0.6)' }}>{kc.jobTitle}</strong> @ {kc.company}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <ScoreRing value={kc.matchScore} size={88} />
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
                    {kc.requirementsMet}/{kc.requirementsTotal} requirements met
                  </div>
                </div>
              </div>

              {/* Pitch narrative */}
              <div style={{ padding: '20px 22px', background: 'rgba(55,138,221,0.06)', border: '1px solid rgba(55,138,221,0.15)', borderRadius: 14, marginBottom: 28, lineHeight: 1.8, fontSize: 14, color: 'rgba(255,255,255,0.75)', fontStyle: 'italic' }}>
                "{kc.pitchNarrative}"
              </div>

              {/* Video placeholder */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, fontWeight: 700 }}>Video pitch</div>
                <div style={{ width: '100%', aspectRatio: '16/9', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(55,138,221,0.15)', border: '1px solid rgba(55,138,221,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer' }}>▶</div>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>2-minute pitch · Recorded in one take</span>
                </div>
              </div>

              {/* Requirement match table */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, fontWeight: 700 }}>Requirement match</div>
                <div style={{ border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, overflow: 'hidden' }}>
                  {kc.requirements.map((req, i) => (
                    <div key={i} className="jc-req-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 18px', borderBottom: i < kc.requirements.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', background: 'rgba(255,255,255,0.02)', transition: 'background 0.15s' }}>
                      <MatchBadge status={req.status} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{req.skill}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{req.evidence}</div>
                        {req.evidenceUrl && (
                          <a href={req.evidenceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: c.accent, textDecoration: 'none', marginTop: 4, display: 'inline-block' }}>
                            → {req.evidenceUrl.replace('https://', '')}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skill test results */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>Skill test results</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Overall score:</span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: c.accent, fontFamily: "'Syne', sans-serif" }}>{kc.testOverallScore}/100</span>
                    {kc.tabSwitches === 0 && (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(29,158,117,0.12)', color: c.success, fontWeight: 700 }}>No tab switches</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {kc.testAnswers.map((ta, i) => (
                    <div key={i} style={{ padding: '16px 18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', flex: 1, lineHeight: 1.5 }}>
                          Q{i+1}: {ta.question}
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: ta.score >= 80 ? c.success : ta.score >= 60 ? c.accent : c.warning, fontFamily: "'Syne', sans-serif", flexShrink: 0 }}>
                          {ta.score}
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                        {ta.answer}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                  Created {kc.createdAt} · Auto-deletes {kc.expiresAt} · Verified by Job-Lens AI
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
                  Your email domain was shared with the candidate as a view confirmation.
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </>
  )
}
