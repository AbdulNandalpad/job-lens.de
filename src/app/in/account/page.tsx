'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { MARKET, API } from '@/lib/constants'
import SvgIcon, { getIcon } from '@/components/SvgIcon'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RazorpayCtor = new (opts: any) => { open: () => void }
declare global { interface Window { Razorpay?: RazorpayCtor } }

const orange = '#FF9933'
const navy = '#042C53'
const green = '#1D9E75'
const red = '#e53e3e'

const PACKS = [
  { label: 'Starter',    credits: 10, price: '₹149', desc: '~2–3 full applications',        amount: '149' },
  { label: 'Job Hunt',   credits: 35, price: '₹499', desc: '~8 full applications',          amount: '499', popular: true },
  { label: 'Full Sprint',credits: 70, price: '₹999', desc: '~17 applications · best value', amount: '999' },
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
  const [buying, setBuying] = useState<string | null>(null)
  const [payMsg, setPayMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [addrPack, setAddrPack] = useState<string | null>(null)   // pack amount awaiting address
  const [addr, setAddr] = useState({ name: '', contact: '', line1: '', line2: '', city: '', state: '', zipcode: '' })


  useEffect(() => {
    fetch('/api/user/profile')
      .then(r => r.json())
      .then(data => { setProfile(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function loadRazorpayScript(): Promise<boolean> {
    return new Promise(resolve => {
      if (typeof window === 'undefined') return resolve(false)
      if (window.Razorpay) return resolve(true)
      const s = document.createElement('script')
      s.src = 'https://checkout.razorpay.com/v1/checkout.js'
      s.onload = () => resolve(true)
      s.onerror = () => resolve(false)
      document.body.appendChild(s)
    })
  }

  // Step 1 — open the billing-address modal (Import Flow requires a shipping address)
  function buyPack(amount: string) {
    if (buying) return
    setPayMsg(null)
    setAddr(a => ({ ...a, name: a.name || profile?.full_name || '' }))
    setAddrPack(amount)
  }

  // Step 2 — create the order with the address, then open Razorpay checkout
  async function submitPurchase() {
    const amount = addrPack
    if (!amount) return
    for (const f of ['name', 'contact', 'line1', 'city', 'state', 'zipcode'] as const) {
      if (!addr[f].trim()) { setPayMsg({ ok: false, text: 'Please fill all required address fields.' }); return }
    }
    setBuying(amount)
    setAddrPack(null)
    try {
      const loaded = await loadRazorpayScript()
      if (!loaded || !window.Razorpay) {
        setPayMsg({ ok: false, text: 'Could not load the payment gateway. Please try again.' })
        setBuying(null); return
      }

      const res = await fetch(API.razorpayOrder, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, customer: { ...addr, email: profile?.email || '' } }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        setPayMsg({ ok: false, text: e.error || 'Could not start payment.' })
        setBuying(null); return
      }
      const order = await res.json()

      const rzp = new window.Razorpay({
        key:         order.keyId,
        amount:      order.amount,
        currency:    order.currency,
        name:        'Job-Lens',
        description: `${order.credits} credits`,
        order_id:    order.orderId,
        customer_id: order.customerId,
        prefill:     { name: addr.name, email: profile?.email || '', contact: addr.contact },
        notes:       { invoice_number: order.invoiceNumber, goods_description: `${order.credits} credits` },
        theme:       { color: orange },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async (resp: any) => {
          const vr = await fetch(API.razorpayVerify, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resp),
          })
          if (vr.ok) {
            const p = await fetch('/api/user/profile').then(r => r.json())
            setProfile(p)
            setPayMsg({ ok: true, text: 'Payment successful — credits added!' })
          } else {
            setPayMsg({ ok: true, text: 'Payment received — credits will appear shortly.' })
          }
          setBuying(null)
        },
        modal: { ondismiss: () => setBuying(null) },
      })
      rzp.open()
    } catch {
      setPayMsg({ ok: false, text: 'Something went wrong. Please try again.' })
      setBuying(null)
    }
  }

  function clearSessionData() {
    Object.keys(sessionStorage).filter(k => k.startsWith('jl_')).forEach(k => sessionStorage.removeItem(k))
  }
  function clearAllJLData() {
    clearSessionData()
    Object.keys(localStorage).filter(k => k.startsWith('jl_')).forEach(k => localStorage.removeItem(k))
  }

  async function signOut() {
    clearSessionData()
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/in')
  }

  async function deleteAccount() {
    setDeleting(true)
    clearAllJLData()
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700, color: navy, marginBottom: 18 }}><SvgIcon name="lightning" size={16} color={orange} /> AI Credits</div>

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
                      { label: 'Free Credits', sub: 'Signup bonus & promotions', value: profile.commonCredits ?? 0, color: orange, icon: 'sparkle' },
                      { label: 'India Credits', sub: 'Purchased via Razorpay (₹)', value: profile.inCredits ?? 0, color: '#138808', icon: 'flag-in' },
                      { label: 'EU Credits', sub: 'Purchased via PayPal (€)', value: profile.euCredits ?? 0, color: '#378ADD', icon: 'flag-de' },
                    ].map(pool => (
                      <div key={pool.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: pool.value > 0 ? `${pool.color}08` : '#f8fafc', borderRadius: 10, border: `1px solid ${pool.value > 0 ? `${pool.color}25` : '#edf1f6'}` }}>
                        <span style={{ flexShrink: 0, display: 'flex' }}>{getIcon(pool.icon, 20, pool.color)}</span>
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
                      { label: 'ATS Scan', cost: 2 },
                      { label: 'CV Tailoring', cost: 1 },
                      { label: 'Cover Letter', cost: 1 },
                      { label: 'Auto Apply', cost: 3 },
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
                      <button
                        onClick={() => isAdmin && buyPack(pack.amount)}
                        disabled={!isAdmin || buying !== null}
                        style={{ width: '100%', padding: '8px 0', borderRadius: 7, border: 'none', background: !isAdmin ? '#edf1f6' : pack.popular ? `linear-gradient(135deg, ${orange}, #e67300)` : '#edf1f6', color: !isAdmin ? '#94a3b8' : pack.popular ? '#fff' : navy, fontSize: 12, fontWeight: 700, cursor: !isAdmin ? 'not-allowed' : buying ? 'wait' : 'pointer', opacity: buying && buying !== pack.amount ? .5 : 1, fontFamily: "'Outfit', sans-serif" }}>
                        {!isAdmin ? 'Coming soon' : buying === pack.amount ? 'Processing…' : 'Buy credits'}
                      </button>
                    </div>
                  ))}
                </div>
                {isAdmin && payMsg && (
                  <div style={{ fontSize: 12, fontWeight: 600, color: payMsg.ok ? green : red, marginTop: 10 }}>{payMsg.text}</div>
                )}
                <div style={{ fontSize: 11, color: '#9aafbc', marginTop: 10 }}>{isAdmin ? 'Secure payments via Razorpay. Credits are added instantly after payment.' : 'Razorpay payments coming soon. Contact us to top up credits manually.'}</div>
              </div>

              {/* Usage log */}
              {profile.usage.length > 0 && (() => {
                const actionIcons: Record<string, string> = {
                  career_scan: 'target', india_ats_scan: 'target', tailor_cv: 'document', cover_letter: 'email', auto_apply: 'bot',
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
                              const iconKey = actionIcons[baseAction] || 'document'
                              const time = new Date(ev.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                              return (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #edf1f6' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ width: 20, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>{getIcon(iconKey, 14, orange)}</span>
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
                      ;['jl_cv_text', 'jl_scan_result'].forEach(k => sessionStorage.removeItem(k))
                      localStorage.removeItem('jl_cv_consent')
                      localStorage.removeItem('jl_ai_messages')
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

      {/* Billing-address modal — required by Razorpay Import Flow */}
      {addrPack && (
        <div onClick={() => setAddrPack(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(4,44,83,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(4,44,83,.25)' }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 17, fontWeight: 700, color: navy, marginBottom: 4 }}>Billing details</div>
            <div style={{ fontSize: 12, color: '#6b7c93', marginBottom: 16 }}>Required for international payment processing.</div>

            {([
              { k: 'name',    label: 'Full name *',      ph: 'e.g. your full name' },
              { k: 'contact', label: 'Phone *',          ph: 'e.g. 9876543210' },
              { k: 'line1',   label: 'Address line 1 *', ph: 'e.g. flat / building, street' },
              { k: 'line2',   label: 'Address line 2',   ph: 'e.g. area (optional)' },
              { k: 'city',    label: 'City *',           ph: 'e.g. Bengaluru' },
              { k: 'state',   label: 'State *',          ph: 'e.g. Karnataka' },
              { k: 'zipcode', label: 'PIN code *',       ph: 'e.g. 560032' },
            ] as const).map(f => (
              <div key={f.k} style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7c93', marginBottom: 4 }}>{f.label}</label>
                <input
                  value={addr[f.k]}
                  onChange={e => setAddr(a => ({ ...a, [f.k]: e.target.value }))}
                  placeholder={f.ph}
                  style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid #d6dee8', fontSize: 13, fontFamily: "'Outfit', sans-serif", boxSizing: 'border-box', color: navy, background: '#fff' }}
                />
              </div>
            ))}
            <div style={{ fontSize: 11, color: '#9aafbc', margin: '4px 0 16px' }}>Country: India</div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={submitPurchase} style={{ flex: 1, padding: '11px 0', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${orange}, #e67300)`, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                Continue to payment
              </button>
              <button onClick={() => setAddrPack(null)} style={{ padding: '11px 16px', borderRadius: 8, border: '1px solid #edf1f6', background: 'transparent', color: '#6b7c93', fontSize: 13, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
