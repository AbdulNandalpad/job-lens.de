'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { theme } from '@/lib/theme'
import { JOB_CASE } from '@/lib/constants'
import AdminGate from '@/components/AdminGate'

const { colors: c, fonts: f, shadow: sh } = theme

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
  expiresAt: string
  daysLeft: number
}

// Mock data for local preview
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
    createdAt: '2026-06-10',
    expiresAt: '2026-07-10',
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
    createdAt: '2026-06-12',
    expiresAt: '2026-07-12',
    daysLeft: 29,
  },
]

function StatusBadge({ status, viewCount }: { status: CaseStatus; viewCount: number }) {
  if (status === 'viewed') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: 'rgba(29,158,117,0.12)', color: c.success, fontSize: 11, fontWeight: 700 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.success, display: 'inline-block' }} />
      {viewCount} view{viewCount !== 1 ? 's' : ''}
    </span>
  )
  if (status === 'expired') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 700 }}>
      Expired
    </span>
  )
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: 'rgba(55,138,221,0.1)', color: c.accent, fontSize: 11, fontWeight: 700 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.accent, display: 'inline-block', animation: 'jcPulse 2s ease infinite' }} />
      Live · No views yet
    </span>
  )
}

function ExpiryBar({ daysLeft }: { daysLeft: number }) {
  const pct = Math.max(0, Math.min(100, (daysLeft / JOB_CASE.expiryDays) * 100))
  const color = daysLeft <= 7 ? c.danger : daysLeft <= 14 ? c.warning : c.success
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Expires in</span>
        <span style={{ fontSize: 11, color, fontWeight: 700 }}>{daysLeft} days</span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.5s' }} />
      </div>
    </div>
  )
}

export default function MyJobCasesPage() {
  const router = useRouter()
  const [credits] = useState(34) // mock

  return (
    <AdminGate>
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes jcPulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
        .jc-card { animation: fadeIn 0.35s ease; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); border-radius: 14px; padding: 22px 24px; transition: border-color 0.2s, box-shadow 0.2s; }
        .jc-card:hover { border-color: rgba(55,138,221,0.3); box-shadow: 0 8px 32px rgba(4,44,83,0.3); }
        .jc-btn { background: linear-gradient(135deg,#378ADD,#185FA5); color:#fff; border:none; border-radius:10px; padding:11px 22px; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; transition:opacity 0.15s; text-decoration:none; display:inline-flex; align-items:center; gap:6px; }
        .jc-btn:hover { opacity:0.88; }
        .jc-btn-sm { background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.6); border:1px solid rgba(255,255,255,0.12); border-radius:8px; padding:7px 14px; font-size:12px; cursor:pointer; font-family:inherit; text-decoration:none; display:inline-flex; align-items:center; gap:5px; transition:all 0.15s; }
        .jc-btn-sm:hover { background:rgba(255,255,255,0.11); color:#fff; }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0d1e30 0%, #091525 100%)', padding: '32px 20px 80px', fontFamily: f.body }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: -0.5 }}>
                My Job Cases
              </h1>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                Each case is a verified, job-specific proof package — not a CV.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <div style={{ padding: '8px 16px', background: 'rgba(55,138,221,0.1)', border: '1px solid rgba(55,138,221,0.2)', borderRadius: 10, fontSize: 13, color: c.accent, fontWeight: 700 }}>
                {credits} credits
              </div>
              <Link href="/app/job-case/new" className="jc-btn">
                + New Job Case
              </Link>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
            {[
              { label: 'Active cases', value: '2' },
              { label: 'Recruiter views', value: '2' },
              { label: 'Credits per case', value: `${JOB_CASE.creditCost}` },
              { label: 'Auto-delete', value: `${JOB_CASE.expiryDays} days` },
            ].map(stat => (
              <div key={stat.label} style={{ flex: '1 1 120px', padding: '14px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: "'Syne', sans-serif" }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Cases list */}
          {MOCK_CASES.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: 'rgba(255,255,255,0.3)' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>No Job Cases yet</div>
              <p style={{ fontSize: 14, marginBottom: 24 }}>Build your first case — it takes about 15 minutes.</p>
              <Link href="/app/job-case/new" className="jc-btn">Create your first Job Case</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {MOCK_CASES.map(jc => (
                <div key={jc.id} className="jc-card">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{jc.jobTitle}</span>
                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>@ {jc.company}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <StatusBadge status={jc.status} viewCount={jc.viewCount} />
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Created {jc.createdAt}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Match score</div>
                      <div style={{ fontSize: 26, fontWeight: 800, color: c.accent, fontFamily: "'Syne', sans-serif" }}>{jc.matchScore}%</div>
                    </div>
                  </div>

                  {/* Viewer domains */}
                  {jc.viewerDomains.length > 0 && (
                    <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(29,158,117,0.07)', border: '1px solid rgba(29,158,117,0.15)', borderRadius: 8 }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginRight: 8 }}>Viewed by:</span>
                      {jc.viewerDomains.map(d => (
                        <span key={d} style={{ display: 'inline-block', padding: '2px 8px', background: 'rgba(29,158,117,0.12)', color: c.success, borderRadius: 10, fontSize: 11, fontWeight: 700, marginRight: 6 }}>@{d}</span>
                      ))}
                    </div>
                  )}

                  <ExpiryBar daysLeft={jc.daysLeft} />

                  <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                    <Link href={`/case/${jc.slug}`} className="jc-btn-sm">
                      Preview as recruiter →
                    </Link>
                    <button
                      onClick={() => navigator.clipboard?.writeText(`https://job-lens.de/case/${jc.slug}`)}
                      className="jc-btn-sm"
                    >
                      Copy link
                    </button>
                    <Link href={`/app/job-case/${jc.id}`} className="jc-btn-sm">
                      Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Credit purchase nudge */}
          <div style={{ marginTop: 32, padding: '20px 24px', background: 'rgba(55,138,221,0.06)', border: '1px solid rgba(55,138,221,0.15)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Running low on credits?</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>50 credits for €4.99 · Never expire · No subscription</div>
            </div>
            <Link href="/app/credits" className="jc-btn" style={{ fontSize: 12, padding: '9px 18px' }}>
              Buy credits
            </Link>
          </div>

        </div>
      </div>
    </>
    </AdminGate>
  )
}
