'use client'

import Link from 'next/link'
import { useState } from 'react'
import { theme } from '@/lib/theme'
import { JOB_CASE } from '@/lib/constants'
import AdminGate from '@/components/AdminGate'
import JobCaseNav from './components/JobCaseNav'

const { colors: c, fonts: f } = theme

type CaseStatus = 'active' | 'viewed' | 'expired'

type JobCase = {
  id: string
  slug: string
  jobTitle: string
  company: string
  matchScore: number
  status: CaseStatus
  viewCount: number
  viewerDomains: string[]
  createdAt: string
  daysLeft: number
}

const MOCK_CASES: JobCase[] = [
  {
    id: '1',
    slug: 'demo-abc123',
    jobTitle: 'Senior Frontend Engineer',
    company: 'Acme GmbH',
    matchScore: 72,
    status: 'viewed',
    viewCount: 2,
    viewerDomains: ['acme.com', 'bosch.com'],
    createdAt: '10 Jun 2026',
    daysLeft: 27,
  },
  {
    id: '2',
    slug: 'demo-def456',
    jobTitle: 'React Developer',
    company: 'Startup Berlin',
    matchScore: 88,
    status: 'active',
    viewCount: 0,
    viewerDomains: [],
    createdAt: '12 Jun 2026',
    daysLeft: 29,
  },
]

function StatusPill({ status, viewCount }: { status: CaseStatus; viewCount: number }) {
  if (status === 'viewed') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: 'rgba(29,158,117,0.12)', color: c.success, fontSize: 11, fontWeight: 600 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.success }} />
      {viewCount} recruiter view{viewCount !== 1 ? 's' : ''}
    </span>
  )
  if (status === 'expired') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 600 }}>
      Expired
    </span>
  )
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: 'rgba(55,138,221,0.1)', color: c.accent, fontSize: 11, fontWeight: 600 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.accent, animation: 'jcPulse 2s ease infinite' }} />
      Live · awaiting views
    </span>
  )
}

function ExpiryBar({ daysLeft }: { daysLeft: number }) {
  const pct = Math.max(0, Math.min(100, (daysLeft / JOB_CASE.expiryDays) * 100))
  const color = daysLeft <= 7 ? c.danger : daysLeft <= 14 ? c.warning : 'rgba(255,255,255,0.2)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 11, color: daysLeft <= 14 ? color : 'rgba(255,255,255,0.25)', fontWeight: 500, flexShrink: 0 }}>
        {daysLeft}d left
      </span>
    </div>
  )
}

export default function MyJobCasesPage() {
  const [copied, setCopied] = useState<string | null>(null)

  function copyLink(slug: string) {
    navigator.clipboard?.writeText(`https://job-lens.de/case/${slug}`)
    setCopied(slug)
    setTimeout(() => setCopied(null), 1800)
  }

  return (
    <AdminGate>
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
          *, *::before, *::after { box-sizing: border-box; }
          @keyframes jcPulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
          @keyframes fadeUp { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }
          .jc-card {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 14px;
            padding: 22px 24px;
            transition: border-color 0.2s, background 0.2s;
            animation: fadeUp 0.3s ease both;
          }
          .jc-card:hover { border-color: rgba(55,138,221,0.25); background: rgba(255,255,255,0.045); }
          .jc-btn-primary {
            background: linear-gradient(135deg, #378ADD, #185FA5);
            color: #fff; border: none; border-radius: 8px;
            padding: 9px 18px; font-size: 13px; font-weight: 700;
            cursor: pointer; font-family: inherit; text-decoration: none;
            display: inline-flex; align-items: center; gap: 6px;
            transition: opacity 0.15s;
          }
          .jc-btn-primary:hover { opacity: 0.88; }
          .jc-btn-ghost {
            background: rgba(255,255,255,0.06);
            color: rgba(255,255,255,0.55);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px; padding: 7px 14px; font-size: 12px;
            cursor: pointer; font-family: inherit; text-decoration: none;
            display: inline-flex; align-items: center; gap: 5px;
            transition: all 0.15s;
          }
          .jc-btn-ghost:hover { background: rgba(255,255,255,0.1); color: #fff; }
        `}</style>

        <div style={{ minHeight: '100vh', background: '#091525', fontFamily: f.body, color: '#fff' }}>
          <JobCaseNav credits={5} />

          <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px 80px' }}>

            {/* Page header */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 36, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', color: c.accent, margin: '0 0 8px' }}>
                  Job Case
                </p>
                <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: -0.5, lineHeight: 1.2 }}>
                  My Cases
                </h1>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', margin: '8px 0 0', lineHeight: 1.6 }}>
                  Each case is a verified proof package for one specific role.
                </p>
              </div>
              <Link href="/app/job-case/new" className="jc-btn-primary">
                + Build new case
              </Link>
            </div>

            {/* Summary strip */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 28, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
              {[
                { value: `${MOCK_CASES.length}`, label: 'Active' },
                { value: `${MOCK_CASES.reduce((s, c) => s + c.viewCount, 0)}`, label: 'Views' },
                { value: '5', label: 'Credits' },
                { value: `${JOB_CASE.expiryDays}d`, label: 'Auto-delete' },
              ].map((s, i) => (
                <div key={s.label} style={{ flex: 1, padding: '16px 0', textAlign: 'center', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.07)' : 'none', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: '#fff' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3, letterSpacing: 0.5 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Cases */}
            {MOCK_CASES.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 20px' }}>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', marginBottom: 20 }}>No cases yet</div>
                <Link href="/app/job-case/new" className="jc-btn-primary">Build your first Job Case</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {MOCK_CASES.map((jc, i) => (
                  <div key={jc.id} className="jc-card" style={{ animationDelay: `${i * 0.06}s` }}>

                    {/* Top row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 14 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 3, letterSpacing: -0.2 }}>
                          {jc.jobTitle}
                        </div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginBottom: 10 }}>
                          {jc.company} · Created {jc.createdAt}
                        </div>
                        <StatusPill status={jc.status} viewCount={jc.viewCount} />
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: jc.matchScore >= 80 ? c.success : c.accent, lineHeight: 1 }}>
                          {jc.matchScore}%
                        </div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 3, letterSpacing: 0.5 }}>MATCH</div>
                      </div>
                    </div>

                    {/* Viewer domains */}
                    {jc.viewerDomains.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Viewed by</span>
                        {jc.viewerDomains.map(d => (
                          <span key={d} style={{ padding: '2px 9px', background: 'rgba(29,158,117,0.1)', color: c.success, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                            @{d}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Expiry */}
                    <ExpiryBar daysLeft={jc.daysLeft} />

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                      <Link href={`/case/${jc.slug}`} className="jc-btn-ghost">
                        Preview →
                      </Link>
                      <button onClick={() => copyLink(jc.slug)} className="jc-btn-ghost">
                        {copied === jc.slug ? 'Copied!' : 'Copy link'}
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </>
    </AdminGate>
  )
}
