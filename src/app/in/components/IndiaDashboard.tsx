'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MarketSnapshot } from '@/app/api/india/market-snapshot/route'

const saffron = '#FF9933'
const indiaGreen = '#138808'
const navy = '#042C53'
const white = '#FFFFFF'
const bg = '#f4f7fb'
const cardBg = '#ffffff'
const border = '#e8edf4'
const textMuted = '#6b7c93'

interface UserProfile {
  full_name: string
  credits: number
  commonCredits: number
  inCredits: number
  usage: { action: string; credits_used: number; created_at: string }[]
}

const ACTION_LABELS: Record<string, string> = {
  career_scan: 'Career Scan',
  tailor_cv: 'CV Tailored',
  cover_letter: 'Cover Letter',
  india_ats_scan: 'ATS Scan',
  auto_apply: 'Auto Apply',
}

const ACTION_ICONS: Record<string, string> = {
  career_scan: '📊',
  tailor_cv: '📄',
  cover_letter: '✉️',
  india_ats_scan: '🎯',
  auto_apply: '🚀',
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

function formatCount(n: number): string {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`
  return n.toString()
}

export default function IndiaDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [market, setMarket] = useState<MarketSnapshot | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadingMarket, setLoadingMarket] = useState(true)

  useEffect(() => {
    fetch('/api/user/profile')
      .then(r => r.json())
      .then(d => setProfile(d))
      .finally(() => setLoadingProfile(false))

    fetch('/api/india/market-snapshot')
      .then(r => r.json())
      .then(d => setMarket(d))
      .finally(() => setLoadingMarket(false))
  }, [])

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const firstName = profile?.full_name?.split(' ')[0] ?? ''
  const maxCategory = market?.categories?.[0]?.count ?? 1

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        .in-dash-actions { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .in-dash-bottom { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
        .in-action-card { background: ${cardBg}; border: 1px solid ${border}; border-radius: 14px; padding: 20px 16px; cursor: pointer; transition: all 0.18s; display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; }
        .in-action-card:hover { border-color: ${saffron}; box-shadow: 0 6px 24px rgba(255,153,51,0.12); transform: translateY(-2px); }
        .in-action-card.disabled { opacity: 0.5; cursor: not-allowed; }
        .in-action-card.disabled:hover { transform: none; box-shadow: none; border-color: ${border}; }
        @media (max-width: 768px) {
          .in-dash-actions { grid-template-columns: repeat(2, 1fr) !important; }
          .in-dash-bottom { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Header bar */}
      <div style={{ background: navy, padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="22" height="22" viewBox="0 0 44 44">
            <circle cx="20" cy="20" r="13" fill="none" stroke={saffron} strokeWidth="2.5"/>
            <circle cx="20" cy="20" r="8" fill="none" stroke="rgba(255,153,51,0.4)" strokeWidth="1.2"/>
            <circle cx="20" cy="20" r="3" fill={saffron}/>
            <line x1="28" y1="28" x2="36" y2="36" stroke={saffron} strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, color: white }}>
            Job-Lens <span style={{ color: saffron }}>India</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!loadingProfile && profile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,153,51,0.12)', border: '1px solid rgba(255,153,51,0.25)', borderRadius: 20, padding: '4px 12px' }}>
              <span style={{ fontSize: 13, color: saffron }}>⚡</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: saffron }}>{profile.credits}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,153,51,0.6)' }}>credits</span>
            </div>
          )}
          <button
            onClick={() => router.push('/in/jobs')}
            style={{ padding: '6px 16px', borderRadius: 8, background: saffron, color: white, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
            Go to App →
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* Welcome */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 26, fontWeight: 800, color: navy, margin: '0 0 6px' }}>
            {greeting}{firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p style={{ fontSize: 14, color: textMuted, margin: 0 }}>
            India's job market is active — here's what's happening today.
          </p>
        </div>

        {/* Quick actions */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Quick Actions</div>
          <div className="in-dash-actions">
            {[
              { icon: '🔍', label: 'Find Jobs', sub: 'Browse live openings', href: '/in/jobs', color: saffron, disabled: false },
              { icon: '📄', label: 'Build CV', sub: 'AI-tailored for the role', href: '/in/cv-builder', color: '#378ADD', disabled: false },
              { icon: '✉️', label: 'Cover Letter', sub: 'In your voice, in minutes', href: '/in/cover-letter', color: indiaGreen, disabled: false },
              { icon: '📊', label: 'ATS Scan', sub: 'Coming soon', href: '#', color: textMuted, disabled: true },
            ].map(a => (
              <div
                key={a.label}
                className={`in-action-card${a.disabled ? ' disabled' : ''}`}
                onClick={() => !a.disabled && router.push(a.href)}
              >
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `${a.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                  {a.icon}
                </div>
                <div>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, color: a.disabled ? textMuted : navy }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>{a.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Market pulse */}
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 16, padding: '24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 700, color: navy }}>India Job Market Pulse</div>
              <div style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>Live data · refreshed every 4 hours</div>
            </div>
            {market?.fetchedAt && (
              <div style={{ fontSize: 11, color: textMuted, background: bg, padding: '4px 10px', borderRadius: 8 }}>
                {timeAgo(market.fetchedAt)}
              </div>
            )}
          </div>

          {loadingMarket ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ height: 36, borderRadius: 8, background: bg, animation: 'pulse 1.5s ease-in-out infinite' }} />
              ))}
            </div>
          ) : market ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {market.categories.map((cat) => {
                const pct = Math.round((cat.count / maxCategory) * 100)
                return (
                  <div key={cat.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 120, fontSize: 13, fontWeight: 500, color: navy, flexShrink: 0 }}>{cat.label}</div>
                    <div style={{ flex: 1, height: 10, borderRadius: 6, background: '#edf1f6', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${cat.color}, ${cat.color}99)`, borderRadius: 6, transition: 'width 0.8s ease' }} />
                    </div>
                    <div style={{ width: 56, fontSize: 13, fontWeight: 700, color: cat.color, textAlign: 'right', flexShrink: 0 }}>
                      {cat.count > 0 ? formatCount(cat.count) : '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: textMuted }}>Could not load market data.</div>
          )}
        </div>

        {/* Bottom row: Trending roles, Top cities, Recent activity */}
        <div className="in-dash-bottom">

          {/* Trending roles */}
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 16, padding: '20px 22px' }}>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, color: navy, marginBottom: 16 }}>🔥 Trending Roles</div>
            {loadingMarket ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3,4,5].map(i => <div key={i} style={{ height: 28, borderRadius: 6, background: bg }} />)}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(market?.trendingRoles ?? []).map((role, i) => (
                  <div key={role.title} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 8, background: i === 0 ? `${saffron}0d` : bg, border: `1px solid ${i === 0 ? `${saffron}30` : 'transparent'}` }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? saffron : textMuted, width: 16 }}>#{i + 1}</span>
                    <span style={{ fontSize: 13, color: navy, fontWeight: i === 0 ? 600 : 400 }}>{role.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top cities */}
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 16, padding: '20px 22px' }}>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, color: navy, marginBottom: 16 }}>📍 Top Hiring Cities</div>
            {loadingMarket ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3,4,5].map(i => <div key={i} style={{ height: 28, borderRadius: 6, background: bg }} />)}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(market?.topCities ?? []).map((city, i) => (
                  <div key={city.city} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: 8, background: i === 0 ? `${indiaGreen}0d` : bg, border: `1px solid ${i === 0 ? `${indiaGreen}30` : 'transparent'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? indiaGreen : textMuted, width: 16 }}>#{i + 1}</span>
                      <span style={{ fontSize: 13, color: navy, fontWeight: i === 0 ? 600 : 400 }}>{city.city}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? indiaGreen : textMuted }}>
                      {city.count > 0 ? formatCount(city.count) : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 16, padding: '20px 22px' }}>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, color: navy, marginBottom: 16 }}>🕐 Your Recent Activity</div>
            {loadingProfile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3].map(i => <div key={i} style={{ height: 36, borderRadius: 6, background: bg }} />)}
              </div>
            ) : profile?.usage?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {profile.usage.slice(0, 5).map((event, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: bg }}>
                    <span style={{ fontSize: 18 }}>{ACTION_ICONS[event.action] ?? '⚡'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: navy }}>{ACTION_LABELS[event.action] ?? event.action}</div>
                      <div style={{ fontSize: 11, color: textMuted }}>{timeAgo(event.created_at)}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: saffron }}>-{event.credits_used}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>🚀</div>
                <div style={{ fontSize: 13, color: textMuted, lineHeight: 1.5 }}>No activity yet.<br />Start with a job search!</div>
                <button onClick={() => router.push('/in/jobs')} style={{ marginTop: 14, padding: '8px 18px', borderRadius: 8, background: saffron, color: white, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                  Find Jobs →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Credits low nudge */}
        {!loadingProfile && profile && profile.credits <= 3 && profile.credits > 0 && (
          <div style={{ marginTop: 16, padding: '14px 20px', background: `${saffron}10`, border: `1px solid ${saffron}30`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: navy }}>⚡ Running low on credits</span>
              <span style={{ fontSize: 13, color: textMuted }}> — you have {profile.credits} left</span>
            </div>
            <button onClick={() => router.push('/in/account')} style={{ padding: '6px 16px', borderRadius: 8, background: saffron, color: white, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
              Top Up ₹149+
            </button>
          </div>
        )}
        {!loadingProfile && profile && profile.credits === 0 && (
          <div style={{ marginTop: 16, padding: '14px 20px', background: '#fee2e210', border: '1px solid #fca5a530', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#dc2626' }}>⛔ No credits remaining</span>
              <span style={{ fontSize: 13, color: textMuted }}> — top up to continue using AI features</span>
            </div>
            <button onClick={() => router.push('/in/account')} style={{ padding: '6px 16px', borderRadius: 8, background: '#dc2626', color: white, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
              Top Up Now
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
