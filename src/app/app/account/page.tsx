'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'
import { createClient } from '@/lib/supabase'
import { theme } from '@/lib/theme'

const { colors: c, gradients: g, fonts: f } = theme

const PACKS = [
  { label: 'Starter', credits: 20, price: '€4.99', desc: 'A quick CV + a few cover letters', itemName: 'Job-Lens AI — Starter Pack (20 Credits)', amount: '4.99' },
  { label: 'Job Hunt', credits: 60, price: '€12.99', desc: '1–2 month active job search', itemName: 'Job-Lens AI — Job Hunt Pack (60 Credits)', amount: '12.99', popular: true },
  { label: 'Full Sprint', credits: 150, price: '€24.99', desc: 'Heavy Auto Apply user', itemName: 'Job-Lens AI — Full Sprint Pack (150 Credits)', amount: '24.99' },
]

const ACTION_LABELS: Record<string, string> = {
  career_scan:  'Career Scan',
  tailor_cv:    'CV Tailoring',
  cover_letter: 'Cover Letter',
  auto_apply:   'Auto Apply',
}

interface ProfileData {
  id: string
  email: string
  full_name: string
  avatar_url: string
  provider: string
  credits: number
  member_since: string
  usage: { action: string; credits_used: number; created_at: string }[]
}

export default function AccountPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [creditInput, setCreditInput] = useState<Record<string, number>>({})

  useEffect(() => {
    fetch('/api/user/profile')
      .then(r => r.json())
      .then(data => { setProfile(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  async function deleteAccount() {
    setDeleting(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const providerLabel = profile?.provider === 'linkedin_oidc' ? 'LinkedIn' : 'Google'
  const providerColor = profile?.provider === 'linkedin_oidc' ? '#0A66C2' : '#EA4335'
  const initials = profile?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'
  const memberYear = profile?.member_since ? new Date(profile.member_since).getFullYear() : ''

  const creditsPercent = Math.min(100, ((profile?.credits ?? 0) / 150) * 100)
  const creditsColor = (profile?.credits ?? 0) <= 3 ? c.danger : (profile?.credits ?? 0) <= 10 ? c.warning : c.success

  return (
    <div style={{ minHeight: '100vh', background: c.bg, fontFamily: f.body }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');`}</style>
      <Navbar />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 60px' }}>

        {loading ? (
          <div style={{ textAlign: 'center', color: c.textMuted, paddingTop: 80, fontSize: 14 }}>Loading…</div>
        ) : !profile ? (
          <div style={{ textAlign: 'center', color: c.danger, paddingTop: 80 }}>Failed to load profile.</div>
        ) : (
          <>
            {/* ── Profile Card ── */}
            <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: '24px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${c.border}` }} />
              ) : (
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: c.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {initials}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: c.primary, fontFamily: f.heading }}>{profile.full_name || 'User'}</div>
                <div style={{ fontSize: 13, color: c.textMuted, marginTop: 2 }}>{profile.email}</div>
                <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: providerColor, padding: '3px 10px', borderRadius: 20 }}>
                    Connected via {providerLabel}
                  </span>
                  {memberYear && <span style={{ fontSize: 11, color: c.textFaint }}>Member since {memberYear}</span>}
                </div>
                <div style={{ fontSize: 11, color: c.textFaint, marginTop: 4 }}>
                  To update your name or photo, change it in your {providerLabel} account.
                </div>
              </div>
            </div>

            {/* ── Credits Card ── */}
            <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: '24px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontFamily: f.heading, fontSize: 15, fontWeight: 700, color: c.primary }}>AI Credits</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontFamily: f.heading, fontSize: 36, fontWeight: 700, color: creditsColor }}>{profile.credits}</span>
                  <span style={{ fontSize: 13, color: c.textMuted }}>credits remaining</span>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: 6, background: c.borderLight, borderRadius: 3, marginBottom: 10 }}>
                <div style={{ height: '100%', width: `${creditsPercent}%`, background: creditsColor, borderRadius: 3, transition: 'width 0.4s' }} />
              </div>

              {/* Cost table */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 20 }}>
                {[
                  { label: 'Career Scan', cost: '2 credits' },
                  { label: 'CV Tailoring', cost: '1 credit' },
                  { label: 'Cover Letter', cost: '1 credit' },
                  { label: 'Auto Apply', cost: '3 credits' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: c.bgSubtle, borderRadius: 7, border: `1px solid ${c.border}` }}>
                    <span style={{ fontSize: 12, color: c.textMuted }}>{item.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: c.primary }}>{item.cost}</span>
                  </div>
                ))}
              </div>

              {/* Buy packs */}
              <div style={{ fontSize: 13, fontWeight: 700, color: c.primary, fontFamily: f.heading, marginBottom: 12 }}>Buy more credits</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {PACKS.map(pack => (
                  <div key={pack.label} style={{ position: 'relative', border: `1.5px solid ${pack.popular ? c.accent : c.border}`, borderRadius: 12, padding: '14px 12px', background: pack.popular ? `${c.accent}08` : c.bgSubtle }}>
                    {pack.popular && (
                      <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: c.accent, color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap' }}>
                        MOST POPULAR
                      </div>
                    )}
                    <div style={{ fontFamily: f.heading, fontSize: 13, fontWeight: 700, color: c.primary, marginBottom: 2 }}>{pack.label}</div>
                    <div style={{ fontSize: 11, color: c.textMuted, marginBottom: 8, lineHeight: 1.4 }}>{pack.desc}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: c.accent, fontFamily: f.heading, marginBottom: 2 }}>{pack.price}</div>
                    <div style={{ fontSize: 11, color: c.textMuted, marginBottom: 12 }}>{pack.credits} credits</div>
                    <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_blank">
                      <input type="hidden" name="cmd" value="_xclick" />
                      <input type="hidden" name="business" value={process.env.NEXT_PUBLIC_PAYPAL_EMAIL || 'your@paypal.com'} />
                      <input type="hidden" name="item_name" value={pack.itemName} />
                      <input type="hidden" name="amount" value={pack.amount} />
                      <input type="hidden" name="currency_code" value="EUR" />
                      <input type="hidden" name="notify_url" value={`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/paypal/webhook`} />
                      <input type="hidden" name="custom" value={profile.id} />
                      <input type="hidden" name="no_shipping" value="1" />
                      <button type="submit" style={{ width: '100%', padding: '8px 0', borderRadius: 7, border: 'none', background: pack.popular ? g.primaryBtn : c.primaryLight, color: pack.popular ? '#fff' : c.navy, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: f.heading }}>
                        Buy Now
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Usage Log ── */}
            {profile.usage.length > 0 && (
              <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: '20px', marginBottom: 16 }}>
                <div style={{ fontFamily: f.heading, fontSize: 15, fontWeight: 700, color: c.primary, marginBottom: 12 }}>Recent activity</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {profile.usage.map((event, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: c.bgSubtle, borderRadius: 7, border: `1px solid ${c.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 12, color: c.primary, fontWeight: 500 }}>{ACTION_LABELS[event.action] || event.action}</span>
                        <span style={{ fontSize: 11, color: c.textFaint }}>{new Date(event.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: c.danger }}>−{event.credits_used}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Danger Zone ── */}
            <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: '20px' }}>
              <div style={{ fontFamily: f.heading, fontSize: 15, fontWeight: 700, color: c.primary, marginBottom: 12 }}>Account</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={signOut}
                  style={{ padding: '9px 20px', borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', color: c.textMuted, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: f.heading }}>
                  Sign out
                </button>
                {!showDeleteConfirm ? (
                  <button onClick={() => setShowDeleteConfirm(true)}
                    style={{ padding: '9px 20px', borderRadius: 8, border: `1px solid ${c.danger}`, background: 'transparent', color: c.danger, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: f.heading }}>
                    Delete account
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: c.danger }}>Are you sure? This cannot be undone.</span>
                    <button onClick={deleteAccount} disabled={deleting}
                      style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: c.danger, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: f.heading }}>
                      {deleting ? 'Deleting…' : 'Yes, delete'}
                    </button>
                    <button onClick={() => setShowDeleteConfirm(false)}
                      style={{ padding: '9px 16px', borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', color: c.textMuted, fontSize: 13, cursor: 'pointer', fontFamily: f.heading }}>
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
  )
}
