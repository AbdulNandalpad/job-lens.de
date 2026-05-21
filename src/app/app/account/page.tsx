'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'
import { createClient } from '@/lib/supabase'
import { theme } from '@/lib/theme'
import { useLanguage } from '@/lib/i18n'

const { colors: c, gradients: g, fonts: f } = theme

const PACKS = [
  { label: 'Starter', credits: 20, price: '€4.99', desc: 'A quick CV + a few cover letters', itemName: 'Job-Lens AI — Starter Pack (20 Credits)', amount: '4.99' },
  { label: 'Job Hunt', credits: 60, price: '€12.99', desc: '1–2 month active job search', itemName: 'Job-Lens AI — Job Hunt Pack (60 Credits)', amount: '12.99', popular: true },
  { label: 'Full Sprint', credits: 150, price: '€24.99', desc: 'Heavy Auto Apply user', itemName: 'Job-Lens AI — Full Sprint Pack (150 Credits)', amount: '24.99' },
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
  member_since: string
  usage: { action: string; credits_used: number; created_at: string }[]
}

export default function AccountPage() {
  const router = useRouter()
  const { t, lang } = useLanguage()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [creditInput, setCreditInput] = useState<Record<string, number>>({})
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
          <div style={{ textAlign: 'center', color: c.textMuted, paddingTop: 80, fontSize: 14 }}>{t.account.loading}</div>
        ) : !profile ? (
          <div style={{ textAlign: 'center', color: c.danger, paddingTop: 80 }}>{t.account.failedLoad}</div>
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
                    {t.account.connectedVia} {providerLabel}
                  </span>
                  {memberYear && <span style={{ fontSize: 11, color: c.textFaint }}>{t.account.memberSince} {memberYear}</span>}
                </div>
                <div style={{ fontSize: 11, color: c.textFaint, marginTop: 4 }}>
                  {t.account.updateNote(providerLabel)}
                </div>
              </div>
            </div>

            {/* ── Credits Card ── */}
            <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: '24px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontFamily: f.heading, fontSize: 15, fontWeight: 700, color: c.primary }}>{t.account.aiCredits}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontFamily: f.heading, fontSize: 36, fontWeight: 700, color: creditsColor }}>{profile.credits}</span>
                  <span style={{ fontSize: 13, color: c.textMuted }}>{t.account.creditsRemaining}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: 6, background: c.borderLight, borderRadius: 3, marginBottom: 10 }}>
                <div style={{ height: '100%', width: `${creditsPercent}%`, background: creditsColor, borderRadius: 3, transition: 'width 0.4s' }} />
              </div>

              {/* Credit pool breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
                {[
                  { label: 'Free credits', value: profile.commonCredits ?? 0 },
                  { label: 'EU credits (PayPal)', value: profile.euCredits ?? 0 },
                  { label: 'India credits', value: profile.inCredits ?? 0 },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 10px', background: c.bgSubtle, borderRadius: 6, border: `1px solid ${c.border}` }}>
                    <span style={{ fontSize: 12, color: c.textMuted }}>{row.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: c.primary }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Cost table */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 20 }}>
                {[
                  { label: t.account.costTable.careerScan, cost: '2 credits' },
                  { label: t.account.costTable.cvTailoring, cost: '1 credit' },
                  { label: t.account.costTable.coverLetter, cost: '1 credit' },
                  { label: t.account.costTable.autoApply, cost: '3 credits' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: c.bgSubtle, borderRadius: 7, border: `1px solid ${c.border}` }}>
                    <span style={{ fontSize: 12, color: c.textMuted }}>{item.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: c.primary }}>{item.cost}</span>
                  </div>
                ))}
              </div>

              {/* Buy packs */}
              <div style={{ fontSize: 13, fontWeight: 700, color: c.primary, fontFamily: f.heading, marginBottom: 12 }}>{t.account.buyCredits}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {PACKS.map(pack => (
                  <div key={pack.label} style={{ position: 'relative', border: `1.5px solid ${pack.popular ? c.accent : c.border}`, borderRadius: 12, padding: '14px 12px', background: pack.popular ? `${c.accent}08` : c.bgSubtle }}>
                    {pack.popular && (
                      <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: c.accent, color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap' }}>
                        {t.account.mostPopular}
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
                        {t.account.buyNow}
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Usage Log ── */}
            {profile.usage.length > 0 && (() => {
              const actionLabels = t.account.actionLabels as Record<string, string>
              const actionIcons: Record<string, string> = {
                career_scan: '◎', tailor_cv: '📄', cover_letter: '✉', auto_apply: '⚡', india_ats_scan: '◎',
              }
              const now = new Date()
              const todayStr = now.toDateString()
              const yesterdayStr = new Date(now.getTime() - 86400000).toDateString()
              function dayLabel(dateStr: string) {
                const d = new Date(dateStr)
                if (d.toDateString() === todayStr) return lang === 'DE' ? 'Heute' : 'Today'
                if (d.toDateString() === yesterdayStr) return lang === 'DE' ? 'Gestern' : 'Yesterday'
                return d.toLocaleDateString(lang === 'DE' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'short', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
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
                <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: '20px', marginBottom: 16 }}>
                  <div style={{ fontFamily: f.heading, fontSize: 15, fontWeight: 700, color: c.primary, marginBottom: 16 }}>{t.account.recentActivity}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {grouped.map(group => (
                      <div key={group.key}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: c.textFaint, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 }}>{group.label}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {group.events.map((ev, i) => {
                            const refund = isRefund(ev.action)
                            const baseAction = refund ? ev.action.replace('refund_', '') : ev.action
                            const label = refund
                              ? `${actionLabels[baseAction] || baseAction} (refund)`
                              : (actionLabels[ev.action] || ev.action)
                            const icon = actionIcons[baseAction] || '·'
                            const time = new Date(ev.created_at).toLocaleTimeString(lang === 'DE' ? 'de-DE' : 'en-GB', { hour: '2-digit', minute: '2-digit' })
                            return (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: c.bgSubtle, borderRadius: 8, border: `1px solid ${c.border}` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span style={{ fontSize: 14, width: 20, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
                                  <div>
                                    <div style={{ fontSize: 12, color: c.primary, fontWeight: 600 }}>{label}</div>
                                    <div style={{ fontSize: 11, color: c.textFaint, marginTop: 1 }}>{time}</div>
                                  </div>
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 700, color: refund ? c.success : c.danger, flexShrink: 0 }}>
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

            {/* ── Region ── */}
            <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: '20px', marginBottom: 16 }}>
              <div style={{ fontFamily: f.heading, fontSize: 15, fontWeight: 700, color: c.primary, marginBottom: 12 }}>Region</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: c.primary }}>DACH — Germany, Switzerland, Austria</div>
                  <div style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>Jobs across the DACH region · EUR pricing</div>
                </div>
                <button onClick={() => { localStorage.setItem('joblens_country', 'in'); router.push('/in') }}
                  style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${c.border}`, background: c.bgSubtle, color: c.textMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: f.heading }}>
                  Switch to India →
                </button>
              </div>
            </div>

            {/* ── AI Profile Data ── */}
            <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: '20px', marginBottom: 16 }}>
              <div style={{ fontFamily: f.heading, fontSize: 15, fontWeight: 700, color: c.primary, marginBottom: 6 }}>Kira AI Profile Data</div>
              <p style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.6, margin: '0 0 14px' }}>
                Kira stores a structured career profile extracted from your CV — name, title, skills, and target roles — to personalise job searches across sessions. This data is held in the EU (Ireland) and is covered by GDPR.
              </p>
              {kiraDataDeleted ? (
                <div style={{ fontSize: 13, color: c.success, fontWeight: 600 }}>✓ AI profile data deleted. Kira will no longer remember you across sessions.</div>
              ) : !showDeleteKiraConfirm ? (
                <button onClick={() => setShowDeleteKiraConfirm(true)}
                  style={{ padding: '9px 18px', borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', color: c.textMuted, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: f.heading }}>
                  Delete Kira&apos;s memory of me
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: c.danger }}>This removes your saved career profile. Cannot be undone.</span>
                  <button onClick={async () => {
                    setDeletingKiraData(true)
                    await fetch('/api/profile/career', { method: 'DELETE' })
                    ;['jl_cv_text', 'jl_scan_result', 'jl_ai_messages'].forEach(k => sessionStorage.removeItem(k))
                    localStorage.removeItem('jl_cv_consent')
                    setDeletingKiraData(false)
                    setShowDeleteKiraConfirm(false)
                    setKiraDataDeleted(true)
                  }} disabled={deletingKiraData}
                    style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: c.danger, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: f.heading }}>
                    {deletingKiraData ? 'Deleting...' : 'Yes, delete it'}
                  </button>
                  <button onClick={() => setShowDeleteKiraConfirm(false)}
                    style={{ padding: '9px 16px', borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', color: c.textMuted, fontSize: 13, cursor: 'pointer', fontFamily: f.heading }}>
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* ── Danger Zone ── */}
            <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: '20px' }}>
              <div style={{ fontFamily: f.heading, fontSize: 15, fontWeight: 700, color: c.primary, marginBottom: 12 }}>{t.account.accountSection}</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={signOut}
                  style={{ padding: '9px 20px', borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', color: c.textMuted, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: f.heading }}>
                  {t.account.signOut}
                </button>
                {!showDeleteConfirm ? (
                  <button onClick={() => setShowDeleteConfirm(true)}
                    style={{ padding: '9px 20px', borderRadius: 8, border: `1px solid ${c.danger}`, background: 'transparent', color: c.danger, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: f.heading }}>
                    {t.account.deleteAccount}
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: c.danger }}>{t.account.deleteConfirm}</span>
                    <button onClick={deleteAccount} disabled={deleting}
                      style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: c.danger, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: f.heading }}>
                      {deleting ? t.account.deleting : t.account.yesDelete}
                    </button>
                    <button onClick={() => setShowDeleteConfirm(false)}
                      style={{ padding: '9px 16px', borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', color: c.textMuted, fontSize: 13, cursor: 'pointer', fontFamily: f.heading }}>
                      {t.common.cancel}
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
