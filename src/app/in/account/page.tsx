'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const orange = '#FF9933'
const navy = '#042C53'
const green = '#1D9E75'
const red = '#e53e3e'

const PACKS = [
  { label: 'Starter', credits: 20, price: '₹149', desc: 'A quick CV + a few cover letters', amount: '149' },
  { label: 'Job Hunt', credits: 60, price: '₹399', desc: '1–2 month active job search', amount: '399', popular: true },
  { label: 'Full Sprint', credits: 150, price: '₹799', desc: 'Intensive job search', amount: '799' },
]

interface ProfileData {
  id: string
  email: string
  full_name: string
  avatar_url: string
  provider: string
  credits: number
  commonCredits: number
  euCredits: number
  inCredits: number
  totalUsed: number
  status: string
  member_since: string
  usage: { action: string; credits_used: number; created_at: string }[]
  isAdmin?: boolean
}

const ACTION_LABELS: Record<string, string> = {
  career_scan: 'ATS Scan',
  india_ats_scan: 'ATS Score',
  tailor_cv: 'CV Tailoring',
  cover_letter: 'Cover Letter',
  auto_apply: 'Auto Apply',
}

export default function IndiaAccountPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteKiraConfirm, setShowDeleteKiraConfirm] = useState(false)
  const [deletingKiraData, setDeletingKiraData] = useState(false)
  const [kiraDataDeleted, setKiraDataDeleted] = useState(false)

  useEffect(() => {
    fetch('/api/user/profile')
      .then(r => r.json())
      .then(data => { setProfile(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/in')
  }

  async function deleteAccount() {
    setDeleting(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/in')
  }

  const initials = profile?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'
  const memberYear = profile?.member_since ? new Date(profile.member_since).getFullYear() : ''
  const providerLabel = profile?.provider === 'linkedin_oidc' ? 'LinkedIn' : 'Google'
  const isAdmin = profile?.isAdmin ?? false
  const creditsColor = isAdmin ? green : (profile?.credits ?? 0) <= 3 ? red : (profile?.credits ?? 0) <= 10 ? orange : green
  const creditsPercent = isAdmin ? 100 : Math.min(100, ((profile?.credits ?? 0) / 150) * 100)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        .acc-packs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .acc-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
        @media (max-width: 768px) {
          .acc-packs { grid-template-columns: 1fr; }
          .acc-stats { grid-template-columns: 1fr; }
        }
      `}</style>
      <div style={{ background: '#f0f4f8', minHeight: 'calc(100vh - 52px)', padding: '28px 24px', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>

          <div style={{ marginBottom: 24, paddingLeft: 14, borderLeft: `3px solid ${orange}` }}>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 700, color: navy, margin: 0 }}>My Account</h1>
            <p style={{ fontSize: 13, color: '#6b7c93', margin: '4px 0 0' }}>Manage your profile and credits</p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', color: '#9aafbc', padding: 80, fontSize: 14 }}>Loading...</div>
          ) : !profile ? (
            <div style={{ textAlign: 'center', color: red, padding: 80 }}>Failed to load profile.</div>
          ) : (
            <>
              {/* Profile card */}
              <div style={{ background: '#fff', border: '1px solid #edf1f6', borderRadius: 16, padding: 24, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(4,44,83,0.05)' }}>
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid #edf1f6' }} />
                ) : (
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: orange, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {initials}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 700, color: navy }}>{profile.full_name || 'User'}</div>
                  <div style={{ fontSize: 13, color: '#6b7c93', marginTop: 2 }}>{profile.email}</div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: providerLabel === 'LinkedIn' ? '#0A66C2' : '#EA4335', padding: '3px 10px', borderRadius: 20 }}>
                      Connected via {providerLabel}
                    </span>
                    {memberYear && <span style={{ fontSize: 11, color: '#9aafbc' }}>Member since {memberYear}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#9aafbc', marginTop: 4 }}>
                    To update your name or photo, change it in {providerLabel}.
                  </div>
                </div>
              </div>

              {/* Credits card */}
              <div style={{ background: '#fff', border: '1px solid #edf1f6', borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: '0 2px 8px rgba(4,44,83,0.05)' }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700, color: navy, marginBottom: 18 }}>⚡ AI Credits</div>

                {/* Available vs Used */}
                <div className="acc-stats">
                  <div style={{ background: `${creditsColor}0f`, border: `1.5px solid ${creditsColor}30`, borderRadius: 12, padding: '16px 18px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: creditsColor, letterSpacing: .5, textTransform: 'uppercase', marginBottom: 6 }}>Credits Available</div>
                    <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: isAdmin ? 24 : 36, fontWeight: 800, color: creditsColor, lineHeight: 1 }}>{isAdmin ? '∞ Admin' : profile.credits}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{isAdmin ? 'no credit limits' : 'ready to use'}</div>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1.5px solid #e4eaf4', borderRadius: 12, padding: '16px 18px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: .5, textTransform: 'uppercase', marginBottom: 6 }}>Credits Used</div>
                    <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 36, fontWeight: 800, color: navy, lineHeight: 1 }}>{profile.totalUsed ?? 0}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>last 30 actions</div>
                  </div>
                </div>

                {/* Pool breakdown */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: .4, textTransform: 'uppercase', marginBottom: 10 }}>Credit Pools</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { label: 'Free Credits', sub: 'Signup bonus & promotions', value: profile.commonCredits ?? 0, color: orange, icon: '🎁' },
                      { label: 'India Credits', sub: 'Purchased via Razorpay (₹)', value: profile.inCredits ?? 0, color: '#138808', icon: '🇮🇳' },
                      { label: 'EU Credits', sub: 'Purchased via PayPal (€)', value: profile.euCredits ?? 0, color: '#378ADD', icon: '🇪🇺' },
                    ].map(pool => (
                      <div key={pool.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: pool.value > 0 ? `${pool.color}08` : '#f8fafc', borderRadius: 10, border: `1px solid ${pool.value > 0 ? `${pool.color}25` : '#edf1f6'}` }}>
                        <span style={{ fontSize: 18, flexShrink: 0 }}>{pool.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: navy }}>{pool.label}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{pool.sub}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 800, color: pool.value > 0 ? pool.color : '#cbd5e1' }}>{pool.value}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>credits</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cost table */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: .4, textTransform: 'uppercase', marginBottom: 10 }}>What Each Action Costs</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                    {[
                      { label: '🎯 ATS Scan', cost: 2 },
                      { label: '📄 CV Tailoring', cost: 1 },
                      { label: '✉️ Cover Letter', cost: 1 },
                      { label: '🚀 Auto Apply', cost: 3 },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #edf1f6' }}>
                        <span style={{ fontSize: 12, color: '#374151' }}>{item.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: orange }}>{item.cost} cr</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Buy packs */}
                <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: .4, textTransform: 'uppercase', marginBottom: 10 }}>Top Up Credits</div>
                <div className="acc-packs">
                  {PACKS.map(pack => (
                    <div key={pack.label} style={{ position: 'relative', border: `1.5px solid ${pack.popular ? orange : '#edf1f6'}`, borderRadius: 12, padding: '14px 12px', background: pack.popular ? `${orange}08` : '#f8fafc' }}>
                      {pack.popular && (
                        <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: orange, color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap' }}>
                          Most Popular
                        </div>
                      )}
                      <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, color: navy, marginBottom: 2 }}>{pack.label}</div>
                      <div style={{ fontSize: 11, color: '#6b7c93', marginBottom: 8, lineHeight: 1.4 }}>{pack.desc}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: orange, fontFamily: "'Outfit', sans-serif", marginBottom: 2 }}>{pack.price}</div>
                      <div style={{ fontSize: 11, color: '#6b7c93', marginBottom: 12 }}>{pack.credits} credits</div>
                      <button style={{ width: '100%', padding: '8px 0', borderRadius: 7, border: 'none', background: pack.popular ? `linear-gradient(135deg, ${orange}, #e67300)` : '#edf1f6', color: pack.popular ? '#fff' : navy, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                        Coming soon
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: '#9aafbc', marginTop: 10 }}>Razorpay payments coming soon. Contact us to top up credits manually.</div>
              </div>

              {/* Usage log */}
              {profile.usage.length > 0 && (() => {
                const actionIcons: Record<string, string> = {
                  career_scan: '◎', india_ats_scan: '◎', tailor_cv: '📄', cover_letter: '✉', auto_apply: '⚡',
                }
                const now = new Date()
                const todayStr = now.toDateString()
                const yesterdayStr = new Date(now.getTime() - 86400000).toDateString()
                function dayLabel(dateStr: string) {
                  const d = new Date(dateStr)
                  if (d.toDateString() === todayStr) return 'Today'
                  if (d.toDateString() === yesterdayStr) return 'Yesterday'
                  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
                }
                const grouped: { label: string; key: string; events: typeof profile.usage }[] = []
                for (const ev of profile.usage) {
                  const key = new Date(ev.created_at).toDateString()
                  const last = grouped[grouped.length - 1]
                  if (last && last.key === key) { last.events.push(ev) }
                  else { grouped.push({ label: dayLabel(ev.created_at), key, events: [ev] }) }
                }
                const isRefund = (action: string) => action.startsWith('refund_')
                return (
                  <div style={{ background: '#fff', border: '1px solid #edf1f6', borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: '0 2px 8px rgba(4,44,83,0.05)' }}>
                    <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700, color: navy, marginBottom: 16 }}>Recent Activity</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {grouped.map(group => (
                        <div key={group.key}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#9aafbc', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 }}>{group.label}</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {group.events.map((ev, i) => {
                              const refund = isRefund(ev.action)
                              const baseAction = refund ? ev.action.replace('refund_', '') : ev.action
                              const label = refund
                                ? `${ACTION_LABELS[baseAction] || baseAction} (refund)`
                                : (ACTION_LABELS[ev.action] || ev.action)
                              const icon = actionIcons[baseAction] || '·'
                              const time = new Date(ev.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                              return (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #edf1f6' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ fontSize: 14, width: 20, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
                                    <div>
                                      <div style={{ fontSize: 12, color: navy, fontWeight: 600 }}>{label}</div>
                                      <div style={{ fontSize: 11, color: '#9aafbc', marginTop: 1 }}>{time}</div>
                                    </div>
                                  </div>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: refund ? green : red, flexShrink: 0 }}>
                                    {refund ? '+' : '−'}{Math.abs(ev.credits_used)}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Region */}
              <div style={{ background: '#fff', border: '1px solid #edf1f6', borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: '0 2px 8px rgba(4,44,83,0.05)' }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700, color: navy, marginBottom: 12 }}>Region</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: navy }}>India</div>
                    <div style={{ fontSize: 11, color: '#9aafbc', marginTop: 2 }}>Jobs across India · INR pricing</div>
                  </div>
                  <button onClick={() => { localStorage.setItem('joblens_country', 'de'); router.push('/') }}
                    style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #dce4ef', background: '#f8fafc', color: '#6b7c93', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                    Switch to DACH →
                  </button>
                </div>
              </div>

              {/* Kira AI Profile Data */}
              <div style={{ background: '#fff', border: '1px solid #edf1f6', borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: '0 2px 8px rgba(4,44,83,0.05)' }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700, color: navy, marginBottom: 6 }}>Kira AI Profile Data</div>
                <p style={{ fontSize: 13, color: '#6b7c93', lineHeight: 1.6, margin: '0 0 14px' }}>
                  Kira stores a structured career profile extracted from your CV — name, title, skills, and target roles — to personalise job searches across sessions. This is covered by India&apos;s DPDP Act 2023.
                </p>
                {kiraDataDeleted ? (
                  <div style={{ fontSize: 13, color: green, fontWeight: 600 }}>✓ AI profile data deleted. Kira will no longer remember you across sessions.</div>
                ) : !showDeleteKiraConfirm ? (
                  <button onClick={() => setShowDeleteKiraConfirm(true)}
                    style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #dce4ef', background: 'transparent', color: '#6b7c93', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                    Delete Kira&apos;s memory of me
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: red }}>This removes your saved career profile. Cannot be undone.</span>
                    <button onClick={async () => {
                      setDeletingKiraData(true)
                      await fetch('/api/profile/career', { method: 'DELETE' })
                      ;['jl_cv_text', 'jl_scan_result', 'jl_ai_messages'].forEach(k => sessionStorage.removeItem(k))
                      localStorage.removeItem('jl_cv_consent')
                      setDeletingKiraData(false)
                      setShowDeleteKiraConfirm(false)
                      setKiraDataDeleted(true)
                    }} disabled={deletingKiraData}
                      style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: red, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                      {deletingKiraData ? 'Deleting...' : 'Yes, delete it'}
                    </button>
                    <button onClick={() => setShowDeleteKiraConfirm(false)}
                      style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #dce4ef', background: 'transparent', color: '#6b7c93', fontSize: 13, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Sign out / delete */}
              <div style={{ background: '#fff', border: '1px solid #edf1f6', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(4,44,83,0.05)' }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700, color: navy, marginBottom: 12 }}>Account</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={signOut} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #edf1f6', background: 'transparent', color: '#6b7c93', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                    Sign out
                  </button>
                  {!showDeleteConfirm ? (
                    <button onClick={() => setShowDeleteConfirm(true)} style={{ padding: '9px 20px', borderRadius: 8, border: `1px solid ${red}`, background: 'transparent', color: red, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                      Delete account
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: red }}>Are you sure? This cannot be undone.</span>
                      <button onClick={deleteAccount} disabled={deleting} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: red, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                        {deleting ? 'Deleting...' : 'Yes, delete'}
                      </button>
                      <button onClick={() => setShowDeleteConfirm(false)} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #edf1f6', background: 'transparent', color: '#6b7c93', fontSize: 13, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
