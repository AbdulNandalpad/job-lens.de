'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import NavbarIndia from '../components/NavbarIndia'
import { c, f, sh } from '@/lib/theme'
import { JOB_CASE, API } from '@/lib/constants'
import { useCredits } from '@/lib/useCredits'
import AdminGate from '@/components/AdminGate'

const accent = '#FF9933'
const btnGrad = 'linear-gradient(135deg, #FF9933 0%, #e67300 100%)'

type CaseStatus = 'active' | 'viewed' | 'interested' | 'expired'

type JobCase = {
  id: string
  slug: string
  jobTitle: string
  company: string
  matchScore: number
  status: CaseStatus
  viewCount: number
  viewerDomains: string[]
  interestedRecruiter: { email: string; domain: string } | null
  createdAt: string
  daysLeft: number
}

function StatusPill({ status, viewCount }: { status: CaseStatus; viewCount: number }) {
  if (status === 'interested') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: 'rgba(186,117,23,0.1)', color: '#b47500', fontSize: 11, fontWeight: 600, border: '1px solid rgba(186,117,23,0.25)' }}>
      ★ Recruiter interested
    </span>
  )
  if (status === 'viewed') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: c.successLight, color: c.success, fontSize: 11, fontWeight: 600 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.success }} />
      {viewCount} recruiter view{viewCount !== 1 ? 's' : ''}
    </span>
  )
  if (status === 'expired') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: c.bg, color: c.textFaint, fontSize: 11, fontWeight: 600 }}>
      Expired
    </span>
  )
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,153,51,0.1)', color: accent, fontSize: 11, fontWeight: 600 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: accent, animation: 'jcPulse 2s ease infinite' }} />
      Live · awaiting views
    </span>
  )
}

function ExpiryBar({ daysLeft }: { daysLeft: number }) {
  const pct = Math.max(0, Math.min(100, (daysLeft / JOB_CASE.expiryDays) * 100))
  const color = daysLeft <= 7 ? c.danger : daysLeft <= 14 ? c.warning : c.success
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
      <div style={{ flex: 1, height: 3, background: c.border, borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.5s' }} />
      </div>
      <span style={{ fontSize: 11, color: daysLeft <= 14 ? color : c.textFaint, fontWeight: 600, flexShrink: 0 }}>
        {daysLeft} days left
      </span>
    </div>
  )
}

export default function MyJobCasesPageIndia() {
  const [cases, setCases]       = useState<JobCase[]>([])
  const [loading, setLoading]   = useState(true)
  const [copied, setCopied]     = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { inCredits } = useCredits()

  useEffect(() => {
    fetch(API.jobCaseList)
      .then(r => r.json())
      .then(d => { if (d.cases) setCases(d.cases) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function copyLink(slug: string) {
    navigator.clipboard?.writeText(`https://job-lens.de/case/${slug}`)
    setCopied(slug)
    setTimeout(() => setCopied(null), 1800)
  }

  async function deleteCase(id: string) {
    if (!confirm('Delete this Job Case? All data is permanently removed.')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/job-case/${id}`, { method: 'DELETE' })
      if (res.ok) setCases(prev => prev.filter(jc => jc.id !== id))
    } catch {}
    setDeleting(null)
  }

  const totalViews  = cases.reduce((s, jc) => s + jc.viewCount, 0)
  const activeCases = cases.filter(jc => jc.status !== 'expired').length

  return (
    <AdminGate>
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
          *, *::before, *::after { box-sizing: border-box; }
          @keyframes jcPulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
          @keyframes jcFadeUp { from{opacity:0;transform:translateY(6px);} to{opacity:1;transform:translateY(0);} }
          .jc-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
          @media (max-width: 600px) { .jc-stats { grid-template-columns: repeat(2, 1fr); } }
          .jc-card {
            background: ${c.bgCard};
            border: 1px solid ${c.border};
            border-radius: 12px;
            padding: 20px 22px;
            box-shadow: ${sh.card};
            transition: box-shadow 0.2s, border-color 0.2s;
            animation: jcFadeUp 0.3s ease both;
          }
          .jc-card:hover { box-shadow: ${sh.cardHover}; border-color: ${c.borderLight}; }
          .jc-btn {
            background: ${btnGrad};
            color: #fff; border: none; border-radius: 8px;
            padding: 9px 18px; font-size: 13px; font-weight: 700;
            cursor: pointer; font-family: ${f.heading};
            text-decoration: none; display: inline-flex; align-items: center; gap: 6px;
            transition: opacity 0.15s;
          }
          .jc-btn:hover { opacity: 0.88; }
          .jc-btn-ghost {
            background: transparent;
            color: ${c.textMuted};
            border: 1px solid ${c.border};
            border-radius: 8px; padding: 7px 14px; font-size: 12px;
            cursor: pointer; font-family: ${f.body}; text-decoration: none;
            display: inline-flex; align-items: center; gap: 5px;
            transition: all 0.15s; font-weight: 500;
          }
          .jc-btn-ghost:hover { background: ${c.bg}; color: ${c.text}; border-color: ${c.borderLight}; }
          .jc-btn-danger {
            background: transparent; color: ${c.danger};
            border: 1px solid rgba(226,75,74,0.25);
            border-radius: 8px; padding: 7px 14px; font-size: 12px;
            cursor: pointer; font-family: ${f.body};
            display: inline-flex; align-items: center; gap: 5px;
            transition: all 0.15s; font-weight: 500;
          }
          .jc-btn-danger:hover { background: rgba(226,75,74,0.06); border-color: ${c.danger}; }
        `}</style>

        <NavbarIndia />

        <div style={{ minHeight: 'calc(100vh - 52px)', background: c.bg, fontFamily: f.body }}>
          <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px 80px' }}>

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
              <div style={{ paddingLeft: 14, borderLeft: `3px solid ${accent}` }}>
                <h1 style={{ fontFamily: f.heading, fontSize: 20, fontWeight: 700, color: c.primary, margin: 0 }}>
                  Job Case
                </h1>
                <p style={{ fontSize: 13, color: c.textMuted, margin: '4px 0 0' }}>
                  Verified, job-specific proof packages — not a CV.
                </p>
              </div>
              <Link href="/in/job-case/new" className="jc-btn">
                + New Job Case
              </Link>
            </div>

            <div className="jc-stats">
              {[
                { value: loading ? '…' : String(activeCases),                    label: 'Active cases' },
                { value: loading ? '…' : String(totalViews),                     label: 'Recruiter views' },
                { value: inCredits === null ? '…' : String(inCredits),           label: 'Credits remaining' },
                { value: `${JOB_CASE.expiryDays}d`,                              label: 'Auto-delete' },
              ].map(stat => (
                <div key={stat.label} style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 10, padding: '14px 16px', boxShadow: sh.card }}>
                  <div style={{ fontFamily: f.heading, fontSize: 22, fontWeight: 700, color: c.primary }}>{stat.value}</div>
                  <div style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {loading && (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: c.textMuted, fontSize: 13 }}>
                Loading your cases…
              </div>
            )}

            {!loading && cases.length === 0 && (
              <div style={{ textAlign: 'center', padding: '64px 20px', background: c.bgCard, borderRadius: 12, border: `1px solid ${c.border}` }}>
                <div style={{ fontSize: 13, color: c.textMuted, marginBottom: 20 }}>No Job Cases yet</div>
                <Link href="/in/job-case/new" className="jc-btn">Build your first Job Case</Link>
              </div>
            )}

            {!loading && cases.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {cases.map((jc, i) => (
                  <div key={jc.id} className="jc-card" style={{ animationDelay: `${i * 0.07}s` }}>

                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: f.heading, fontSize: 16, fontWeight: 700, color: c.text, marginBottom: 3 }}>
                          {jc.jobTitle}
                        </div>
                        <div style={{ fontSize: 13, color: c.textMuted, marginBottom: 10 }}>
                          {jc.company} · Created {jc.createdAt}
                        </div>
                        <StatusPill status={jc.status} viewCount={jc.viewerDomains.length} />
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: f.heading, fontSize: 28, fontWeight: 700, color: jc.matchScore >= 80 ? c.success : accent, lineHeight: 1 }}>
                          {jc.matchScore}%
                        </div>
                        <div style={{ fontSize: 10, color: c.textFaint, marginTop: 2, letterSpacing: 0.5, textTransform: 'uppercase' }}>Match</div>
                      </div>
                    </div>

                    {jc.interestedRecruiter && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: '#b47500', fontWeight: 600 }}>★ Interested:</span>
                        <a href={`mailto:${jc.interestedRecruiter.email}`} style={{ padding: '2px 9px', background: 'rgba(186,117,23,0.08)', color: '#b47500', borderRadius: 20, fontSize: 11, fontWeight: 600, border: '1px solid rgba(186,117,23,0.2)', textDecoration: 'none' }}>
                          {jc.interestedRecruiter.email}
                        </a>
                      </div>
                    )}
                    {!jc.interestedRecruiter && jc.viewerDomains.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: c.textMuted }}>Viewed by</span>
                        {jc.viewerDomains.map(d => (
                          <span key={d} style={{ padding: '2px 9px', background: c.successLight, color: c.success, borderRadius: 20, fontSize: 11, fontWeight: 600, border: `1px solid ${c.successBorder}` }}>
                            @{d}
                          </span>
                        ))}
                      </div>
                    )}

                    <ExpiryBar daysLeft={jc.daysLeft} />

                    <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${c.border}`, flexWrap: 'wrap' }}>
                      <Link href={`/case/${jc.slug}`} className="jc-btn-ghost" target="_blank">Preview as recruiter →</Link>
                      <button
                        onClick={() => copyLink(jc.slug)}
                        className="jc-btn-ghost"
                        style={copied === jc.slug ? { borderColor: c.success, color: c.success, background: c.successLight } : undefined}
                      >
                        {copied === jc.slug ? '✓ Copied!' : '⎘ Copy link'}
                      </button>
                      <button
                        onClick={() => deleteCase(jc.id)}
                        disabled={deleting === jc.id}
                        className="jc-btn-danger"
                        style={{ marginLeft: 'auto', opacity: deleting === jc.id ? 0.5 : 1 }}
                      >
                        {deleting === jc.id ? 'Deleting…' : 'Delete'}
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
