'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface CareerProfile {
  name:             string | null
  current_title:    string | null
  experience_years: number | null
  skills:           string[]
  education:        string | null
  target_roles:     string[]
  languages:        string[]
  summary:          string | null
  strengths:        string[]
  location:         string | null
  market:           'eu' | 'in'
  updated_at:       string
}

const RING_R = 40
const CIRC   = 2 * Math.PI * RING_R  // ≈ 251.3

function profileScore(p: CareerProfile): number {
  let s = 0
  if (p.name)                       s += 10
  if (p.current_title)              s += 15
  if (p.experience_years != null)   s += 10
  if (p.skills?.length)             s += 20
  if (p.education)                  s += 10
  if (p.target_roles?.length)       s += 15
  if (p.languages?.length)          s += 5
  if (p.summary)                    s += 10
  if (p.strengths?.length)          s += 5
  return s  // 0–100
}

function getInsight(p: CareerProfile, market: 'eu' | 'in'): { text: string; cta: string; href: string } {
  const jobsHref = market === 'in' ? '/in/jobs' : '/app/jobs'

  if (!p.skills?.length || !p.current_title) {
    return {
      text:  'Upload a detailed CV to unlock match scoring on every job card and get personalised salary benchmarks.',
      cta:   'Upload CV to Kira',
      href:  market === 'in' ? '/in' : '/app',
    }
  }
  if (!p.target_roles?.length) {
    return {
      text:  'Tell Kira what roles you\'re targeting and it will score every job listing against your profile automatically.',
      cta:   'Chat with Kira',
      href:  market === 'in' ? '/in' : '/app',
    }
  }
  const role    = p.target_roles[0]
  const expLine = p.experience_years ? `${p.experience_years}yr exp · ` : ''
  const top3    = p.skills.slice(0, 3).join(', ')
  return {
    text:  `${expLine}Targeting ${role}. Strong in ${top3}. Kira is ready to score job matches — start searching and every card will show your % fit.`,
    cta:   'Find Jobs',
    href:  jobsHref,
  }
}

function scoreLabel(s: number) {
  if (s >= 80) return 'Excellent profile'
  if (s >= 60) return 'Strong profile'
  if (s >= 40) return 'Good start — add more'
  return 'Upload a full CV'
}

function scoreColor(s: number, accent: string) {
  if (s >= 70) return '#10b981'
  if (s >= 40) return accent
  return '#f59e0b'
}

export default function CareerIntelPanel({ accentColor, market }: { accentColor: string; market: 'eu' | 'in' }) {
  const router  = useRouter()
  const [profile,  setProfile]  = useState<CareerProfile | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    fetch('/api/profile/career')
      .then(r => r.json())
      .then(d => {
        setProfile(d.profile ?? null)
        setLoading(false)
        setTimeout(() => setAnimated(true), 180)
      })
      .catch(() => setLoading(false))
  }, [])

  const score  = profile ? profileScore(profile) : 0
  const color  = scoreColor(score, accentColor)
  const offset = CIRC * (1 - (animated ? score / 100 : 0))
  const insight = profile ? getInsight(profile, market) : null

  return (
    <>
      <style>{`
        @keyframes ciPanel-shimmer {
          0%   { background-position: 200% 0 }
          100% { background-position: -200% 0 }
        }
        @keyframes ciPanel-fadeUp {
          from { opacity:0; transform:translateY(10px) }
          to   { opacity:1; transform:none }
        }
        .ci-panel-grid {
          display: grid;
          grid-template-columns: 160px 1fr 1fr;
          gap: 14px;
          margin-bottom: 24px;
          animation: ciPanel-fadeUp .4s ease both;
        }
        .ci-card {
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 18px;
          padding: 20px 22px;
        }
        .ci-shimmer {
          border-radius: 16px;
          background: linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 75%);
          background-size: 200% 100%;
          animation: ciPanel-shimmer 1.5s infinite;
        }
        @media (max-width: 800px) {
          .ci-panel-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 520px) {
          .ci-panel-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {loading ? (
        <div className="ci-panel-grid">
          <div className="ci-shimmer" style={{ height: 160 }} />
          <div className="ci-shimmer" style={{ height: 160 }} />
          <div className="ci-shimmer" style={{ height: 160 }} />
        </div>
      ) : !profile ? (
        /* ── No profile yet ── */
        <div className="ci-panel-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div style={{
            background: `linear-gradient(135deg,${accentColor}10,rgba(255,255,255,.04))`,
            border: `1px solid ${accentColor}28`, borderRadius: 18,
            padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
          }}>
            {/* Dimmed ring */}
            <svg width="80" height="80" style={{ flexShrink: 0 }}>
              <circle cx="40" cy="40" r={RING_R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="7" />
              <text x="40" y="45" textAnchor="middle" fontSize="14" fontWeight="700" fill="rgba(255,255,255,.25)" fontFamily="Outfit,sans-serif">0%</text>
            </svg>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Career profile not set up yet</div>
              <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 13, lineHeight: 1.55 }}>
                Chat with Kira and upload your CV to unlock profile strength scoring, personalised job matches, and career insights.
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', flexShrink: 0 }}>
              Click the <strong style={{ color: accentColor }}>Ki</strong> button in the bottom-right corner →
            </div>
          </div>
        </div>
      ) : (
        /* ── Full panel ── */
        <div className="ci-panel-grid">

          {/* Zone 1 — CV Strength Ring */}
          <div className="ci-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <svg width="100" height="100">
              {/* Track */}
              <circle cx="50" cy="50" r={RING_R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="7" />
              {/* Filled arc */}
              <circle
                cx="50" cy="50" r={RING_R}
                fill="none"
                stroke={color}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={offset}
                transform="rotate(-90 50 50)"
                style={{
                  transition: 'stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)',
                  filter: `drop-shadow(0 0 7px ${color}80)`,
                }}
              />
              {/* Score text */}
              <text x="50" y="53" textAnchor="middle" fontSize="18" fontWeight="800" fill="#fff" fontFamily="Outfit,sans-serif">
                {score}%
              </text>
            </svg>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>Profile Strength</div>
              <div style={{ color: color, fontSize: 11, marginTop: 3, fontWeight: 600 }}>{scoreLabel(score)}</div>
            </div>
          </div>

          {/* Zone 2 — Profile Snapshot */}
          <div className="ci-card">
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.35)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>Your Profile</div>

            {profile.name && (
              <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{profile.name}</div>
            )}
            {profile.current_title && (
              <div style={{ color: 'rgba(255,255,255,.55)', fontSize: 12, marginBottom: 10 }}>
                {profile.current_title}
                {profile.experience_years ? ` · ${profile.experience_years} yrs exp` : ''}
                {profile.location ? ` · ${profile.location}` : ''}
              </div>
            )}

            {profile.skills?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                {profile.skills.slice(0, 6).map(skill => (
                  <span key={skill} style={{
                    fontSize: 11, padding: '3px 9px', borderRadius: 20,
                    background: `${accentColor}18`, border: `1px solid ${accentColor}30`,
                    color: accentColor, fontWeight: 600,
                  }}>{skill}</span>
                ))}
                {profile.skills.length > 6 && (
                  <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.4)' }}>
                    +{profile.skills.length - 6} more
                  </span>
                )}
              </div>
            )}

            {profile.target_roles?.length > 0 && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', lineHeight: 1.5 }}>
                Targeting: <span style={{ color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>
                  {profile.target_roles.slice(0, 2).join(', ')}
                </span>
              </div>
            )}
            {profile.education && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>
                {profile.education}
              </div>
            )}
          </div>

          {/* Zone 3 — Kira Insight */}
          {insight && (
            <div className="ci-card" style={{
              background: `linear-gradient(135deg,${accentColor}10,rgba(255,255,255,.04))`,
              borderColor: `${accentColor}30`,
              display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: `linear-gradient(135deg,#8b5cf6,${accentColor})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800, color: '#fff',
                  boxShadow: `0 0 12px ${accentColor}60`,
                }}>Ki</div>
                <span style={{ fontSize: 10, fontWeight: 700, color: accentColor, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  Kira Insight
                </span>
              </div>

              <p style={{ margin: 0, color: 'rgba(255,255,255,.75)', fontSize: 13, lineHeight: 1.65, flex: 1 }}>
                {insight.text}
              </p>

              <button
                onClick={() => router.push(insight.href)}
                style={{
                  padding: '9px 0', borderRadius: 9, cursor: 'pointer', textAlign: 'center',
                  border: `1px solid ${accentColor}45`,
                  background: `${accentColor}18`,
                  color: accentColor, fontSize: 12, fontWeight: 700,
                  transition: 'background .15s',
                  fontFamily: "'DM Sans',sans-serif",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = `${accentColor}30`)}
                onMouseLeave={e => (e.currentTarget.style.background = `${accentColor}18`)}
              >
                {insight.cta} →
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
