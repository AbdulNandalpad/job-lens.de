'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { theme } from '@/lib/theme'

const { colors: c, fonts: f } = theme

interface AdminUser {
  id: string
  email: string
  name: string
  provider: string
  credits: number       // free pool (editable)
  euCredits: number     // EU paid pool
  inCredits: number     // India paid pool
  totalCredits: number  // sum of all 3
  status: string
  credits_spent: number
  isAdmin: boolean
  created_at: string
  last_sign_in: string
  signup_country: string | null
}

interface Purchase {
  id: string
  user_id: string
  user_email: string
  paypal_txn_id: string | null
  paypal_payer_email: string | null
  amount_eur: number
  credits_added: number
  created_at: string
}

type Tab = 'users' | 'purchases'

// grid columns: User | Provider | Country | Free | IN | EU | Spent | Status | Actions
const COLS = '2fr 100px 52px 60px 60px 60px 60px 80px 110px'

// Convert ISO 3166-1 alpha-2 code (or market string) to flag emoji
const toFlag = (code: string | null) => {
  if (!code) return '🌍'
  // Map market identifiers to country codes
  const normalised = code.toLowerCase() === 'eu' ? 'DE' : code.toLowerCase() === 'in' ? 'IN' : code.toUpperCase()
  if (normalised.length !== 2) return '🌍'
  return String.fromCodePoint(...[...normalised].map(c => 0x1F1E0 + c.charCodeAt(0) - 65))
}

export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('users')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [missingTable, setMissingTable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [purchasesLoading, setPurchasesLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [creditEdits, setCreditEdits] = useState<Record<string, string>>({})

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      loadUsers()
    })
  }, [])

  useEffect(() => {
    if (tab === 'purchases' && purchases.length === 0 && !purchasesLoading) {
      loadPurchases()
    }
  }, [tab])

  async function loadUsers() {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    if (res.status === 403) { router.replace('/app/career-scan'); return }
    const data = await res.json()
    if (data.error) { setError(data.error); setLoading(false); return }
    setUsers(data.users || [])
    setLoading(false)
  }

  async function loadPurchases() {
    setPurchasesLoading(true)
    const res = await fetch('/api/admin/purchases')
    const data = await res.json()
    setPurchases(data.purchases || [])
    setMissingTable(!!data.missing_table)
    setPurchasesLoading(false)
  }

  async function updateUser(id: string, updates: Record<string, unknown>) {
    setUpdating(id)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        alert(`Save failed: ${data.error || 'unknown error'}`)
        setUpdating(null)
        return
      }
      // Success — clear local edit state so input shows the fresh server value
      setCreditEdits(prev => { const next = { ...prev }; delete next[id]; return next })
      await loadUsers()
    } catch (e) {
      alert('Save failed: network error')
    }
    setUpdating(null)
  }

  const filtered = users.filter(u =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.name?.toLowerCase().includes(search.toLowerCase())
  )

  const totalUsers = users.length
  const activeUsers = users.filter(u => u.status === 'active').length
  const blockedUsers = users.filter(u => u.status === 'blocked').length
  const totalCreditsSpent = users.reduce((s, u) => s + (u.credits_spent || 0), 0)
  const totalRevenue = purchases.reduce((s, p) => s + (p.amount_eur || 0), 0)

  const fmtDate = (d: string) => d ? new Date(d).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
  const fmtShort = (d: string) => d ? new Date(d).toLocaleDateString('de-DE') : '—'

  return (
    <div style={{ minHeight: '100vh', background: c.bg, fontFamily: f.body }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');

        .adm-stats { display:grid; grid-template-columns:repeat(5,1fr); gap:12px; margin-bottom:24px; }
        .adm-thead { display:grid; grid-template-columns:${COLS}; padding:10px 16px; border-bottom:1px solid ${c.border}; background:${c.bgSubtle}; }
        .adm-trow  { display:grid; grid-template-columns:${COLS}; padding:12px 16px; border-bottom:1px solid ${c.border}; align-items:center; }
        .adm-phead { display:grid; grid-template-columns:2fr 1fr 80px 90px 120px; padding:10px 16px; border-bottom:1px solid ${c.border}; background:${c.bgSubtle}; min-width:600px; }
        .adm-prow  { display:grid; grid-template-columns:2fr 1fr 80px 90px 120px; padding:12px 16px; border-bottom:1px solid ${c.border}; align-items:center; min-width:600px; }
        .adm-card  { display:none; }

        @media(max-width:900px){
          .adm-thead, .adm-trow { display:none!important; }
          .adm-card  { display:flex!important; }
        }
        @media(max-width:768px){
          .adm-stats { grid-template-columns:repeat(2,1fr)!important; gap:8px!important; }
          .adm-phead, .adm-prow { display:none!important; }
        }
        @media(max-width:480px){
          .adm-stats { grid-template-columns:1fr 1fr!important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ background: c.primary, padding: '0 24px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, borderBottom: `1px solid rgba(255,255,255,0.1)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: f.heading, fontSize: 15, fontWeight: 700, color: '#E6F1FB' }}>Job-Lens <span style={{ color: '#378ADD' }}>Admin</span></span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#378ADD', background: 'rgba(55,138,221,0.15)', padding: '2px 8px', borderRadius: 10, border: '1px solid rgba(55,138,221,0.3)' }}>INTERNAL</span>
        </div>
        <button onClick={() => router.push('/app/career-scan')} style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>
          ← Back to App
        </button>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px' }}>

        {error ? (
          <div style={{ background: `${c.danger}15`, border: `1px solid ${c.danger}40`, borderRadius: 12, padding: 24, color: c.danger, textAlign: 'center' }}>{error}</div>
        ) : loading ? (
          <div style={{ textAlign: 'center', color: c.textMuted, paddingTop: 80 }}>Loading…</div>
        ) : (
          <>
            {/* Stats row */}
            <div className="adm-stats">
              {[
                { label: 'Total Users', value: totalUsers, color: c.accent },
                { label: 'Active', value: activeUsers, color: c.success },
                { label: 'Blocked', value: blockedUsers, color: c.danger },
                { label: 'AI Calls Made', value: totalCreditsSpent, color: c.warning },
                { label: 'Revenue (EUR)', value: `€${totalRevenue.toFixed(2)}`, color: '#10b981' },
              ].map(stat => (
                <div key={stat.label} style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 12, padding: '16px 20px' }}>
                  <div style={{ fontSize: 11, color: c.textMuted, marginBottom: 4 }}>{stat.label}</div>
                  <div style={{ fontFamily: f.heading, fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Tab nav */}
            <div style={{ display: 'flex', gap: 4, background: c.bgSubtle, borderRadius: 10, padding: 4, marginBottom: 20, width: 'fit-content', border: `1px solid ${c.border}` }}>
              {(['users', 'purchases'] as Tab[]).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 20px', borderRadius: 8, border: 'none', background: tab === t ? c.bgCard : 'transparent', color: tab === t ? c.primary : c.textMuted, fontWeight: tab === t ? 700 : 400, fontSize: 13, cursor: 'pointer', fontFamily: f.body, boxShadow: tab === t ? `0 1px 4px rgba(0,0,0,0.08)` : 'none', transition: 'all 0.15s' }}>
                  {t === 'users' ? `Users (${totalUsers})` : `Purchases (${purchases.length})`}
                </button>
              ))}
            </div>

            {/* USERS TAB */}
            {tab === 'users' && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <input type="text" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)}
                    style={{ width: '100%', padding: '10px 16px', borderRadius: 9, border: `1px solid ${c.border}`, background: c.bgCard, color: c.primary, fontSize: 13, fontFamily: f.body, outline: 'none', boxSizing: 'border-box' as const }} />
                </div>

                <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden' }}>

                  {/* Desktop header */}
                  <div className="adm-thead">
                    {['User', 'Provider', 'Country', 'Free', 'IN', 'EU', 'Spent', 'Status', 'Actions'].map(h => (
                      <div key={h} style={{ fontSize: 10, fontWeight: 700, color: c.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>{h}</div>
                    ))}
                  </div>

                  {filtered.map(user => (
                    <>
                      {/* Desktop row */}
                      <div key={user.id} className="adm-trow" style={{ opacity: user.status === 'blocked' ? 0.6 : 1, background: user.isAdmin ? `${c.accent}08` : 'transparent' }}>
                        {/* User */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: c.primary }}>{user.name || '—'}</span>
                            {user.isAdmin && <span style={{ fontSize: 10, fontWeight: 700, color: c.accent, background: `${c.accent}18`, padding: '1px 6px', borderRadius: 8 }}>👑 ADMIN</span>}
                          </div>
                          <div style={{ fontSize: 11, color: c.textMuted }}>{user.email}</div>
                          <div style={{ fontSize: 10, color: c.textFaint }}>Joined: {fmtShort(user.created_at)}</div>
                          <div style={{ fontSize: 10, color: c.textFaint }}>Last in: {user.last_sign_in ? fmtShort(user.last_sign_in) : '—'}</div>
                        </div>
                        {/* Provider */}
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: user.provider === 'google' ? '#EA4335' : '#0A66C2', background: user.provider === 'google' ? '#EA433515' : '#0A66C215', padding: '3px 8px', borderRadius: 10 }}>
                            {user.provider === 'linkedin_oidc' ? 'LinkedIn' : 'Google'}
                          </span>
                        </div>
                        {/* Country */}
                        <div title={user.signup_country ?? 'Unknown'} style={{ fontSize: 18, lineHeight: 1 }}>
                          {toFlag(user.signup_country)}
                        </div>
                        {/* Free credits (editable) */}
                        <div>
                          {user.isAdmin ? (
                            <span style={{ fontSize: 12, color: c.accent, fontWeight: 700 }}>∞</span>
                          ) : (
                            <input type="number" value={creditEdits[user.id] ?? user.credits}
                              onChange={e => setCreditEdits(prev => ({ ...prev, [user.id]: e.target.value }))}
                              style={{ width: 44, padding: '3px 4px', borderRadius: 6, border: `1px solid ${creditEdits[user.id] !== undefined ? c.accent : c.border}`, background: c.bg, color: c.primary, fontSize: 12, textAlign: 'center' as const }} />
                          )}
                        </div>
                        {/* India credits (read-only) */}
                        <div style={{ fontSize: 13, fontWeight: 600, color: user.inCredits > 0 ? '#138808' : c.textFaint }}>{user.isAdmin ? '∞' : user.inCredits}</div>
                        {/* EU credits (read-only) */}
                        <div style={{ fontSize: 13, fontWeight: 600, color: user.euCredits > 0 ? '#0A66C2' : c.textFaint }}>{user.isAdmin ? '∞' : user.euCredits}</div>
                        {/* Spent */}
                        <div style={{ fontSize: 13, color: c.textMuted }}>{user.credits_spent}</div>
                        {/* Status */}
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: user.isAdmin ? c.accent : user.status === 'active' ? c.success : c.danger, background: user.isAdmin ? `${c.accent}15` : user.status === 'active' ? c.successLight : `${c.danger}15`, padding: '3px 8px', borderRadius: 10 }}>
                            {user.isAdmin ? 'admin' : user.status}
                          </span>
                        </div>
                        {/* Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {/* Save credits button — only shown when value has been edited */}
                          {!user.isAdmin && creditEdits[user.id] !== undefined && (
                            <button
                              onClick={() => { const val = parseInt(creditEdits[user.id]); if (!isNaN(val)) updateUser(user.id, { credits: val }) }}
                              disabled={updating === user.id}
                              style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${c.accent}60`, background: `${c.accent}15`, color: c.accent, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                              {updating === user.id ? '…' : '💾 Save'}
                            </button>
                          )}
                          {user.isAdmin ? (
                            <span style={{ fontSize: 11, color: c.textFaint }}>—</span>
                          ) : user.status === 'active' ? (
                            <button onClick={() => updateUser(user.id, { status: 'blocked' })} disabled={updating === user.id}
                              style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${c.danger}40`, background: `${c.danger}10`, color: c.danger, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                              {updating === user.id ? '…' : 'Block'}
                            </button>
                          ) : (
                            <button onClick={() => updateUser(user.id, { status: 'active' })} disabled={updating === user.id}
                              style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${c.success}40`, background: `${c.success}10`, color: c.success, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                              {updating === user.id ? '…' : 'Unblock'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Mobile card */}
                      <div key={user.id + '-card'} className="adm-card" style={{ flexDirection: 'column', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${c.border}`, opacity: user.status === 'blocked' ? 0.6 : 1, background: user.isAdmin ? `${c.accent}08` : 'transparent' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: c.primary }}>{user.name || '—'}</span>
                            {user.isAdmin && <span style={{ fontSize: 10, fontWeight: 700, color: c.accent, background: `${c.accent}18`, padding: '1px 6px', borderRadius: 8 }}>👑 ADMIN</span>}
                          </div>
                          <div style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>{user.email}</div>
                          <div style={{ fontSize: 11, color: c.textFaint, marginTop: 2 }}>Joined: {fmtShort(user.created_at)}</div>
                          <div style={{ fontSize: 11, color: c.textFaint }}>Last in: {user.last_sign_in ? fmtShort(user.last_sign_in) : '—'}</div>
                        </div>
                        {/* Badges row */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: user.provider === 'google' ? '#EA4335' : '#0A66C2', background: user.provider === 'google' ? '#EA433515' : '#0A66C215', padding: '3px 8px', borderRadius: 10 }}>
                            {user.provider === 'linkedin_oidc' ? 'LinkedIn' : 'Google'}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: user.isAdmin ? c.accent : user.status === 'active' ? c.success : c.danger, background: user.isAdmin ? `${c.accent}15` : user.status === 'active' ? c.successLight : `${c.danger}15`, padding: '3px 8px', borderRadius: 10 }}>
                            {user.isAdmin ? 'admin' : user.status}
                          </span>
                          {user.signup_country && (
                            <span title={user.signup_country} style={{ fontSize: 16, lineHeight: 1 }}>
                              {toFlag(user.signup_country)}
                            </span>
                          )}
                        </div>
                        {/* Credit pools */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                          <div style={{ background: c.bgSubtle, borderRadius: 8, padding: '8px 10px', textAlign: 'center' as const }}>
                            <div style={{ fontSize: 10, color: c.textMuted, fontWeight: 600, marginBottom: 4 }}>🎁 FREE</div>
                            {user.isAdmin ? (
                              <div style={{ fontSize: 16, fontWeight: 800, color: c.accent }}>∞</div>
                            ) : (
                              <input type="number" value={creditEdits[user.id] ?? user.credits}
                                onChange={e => setCreditEdits(prev => ({ ...prev, [user.id]: e.target.value }))}
                                style={{ width: '100%', padding: '2px 4px', borderRadius: 6, border: `1px solid ${creditEdits[user.id] !== undefined ? c.accent : c.border}`, background: c.bg, color: c.primary, fontSize: 14, fontWeight: 700, textAlign: 'center' as const }} />
                            )}
                          </div>
                          <div style={{ background: '#13880808', border: '1px solid #13880820', borderRadius: 8, padding: '8px 10px', textAlign: 'center' as const }}>
                            <div style={{ fontSize: 10, color: '#138808', fontWeight: 600, marginBottom: 4 }}>🇮🇳 IN</div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: user.inCredits > 0 ? '#138808' : c.textFaint }}>{user.isAdmin ? '∞' : user.inCredits}</div>
                          </div>
                          <div style={{ background: '#0A66C208', border: '1px solid #0A66C220', borderRadius: 8, padding: '8px 10px', textAlign: 'center' as const }}>
                            <div style={{ fontSize: 10, color: '#0A66C2', fontWeight: 600, marginBottom: 4 }}>🇪🇺 EU</div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: user.euCredits > 0 ? '#0A66C2' : c.textFaint }}>{user.isAdmin ? '∞' : user.euCredits}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: c.textMuted }}>
                          AI calls made: <strong style={{ color: c.primary }}>{user.credits_spent}</strong>
                        </div>
                        {!user.isAdmin && creditEdits[user.id] !== undefined && (
                          <button
                            onClick={() => { const val = parseInt(creditEdits[user.id]); if (!isNaN(val)) updateUser(user.id, { credits: val }) }}
                            disabled={updating === user.id}
                            style={{ width: '100%', padding: '9px 0', borderRadius: 8, border: `1px solid ${c.accent}60`, background: `${c.accent}15`, color: c.accent, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: f.body }}>
                            {updating === user.id ? '…' : '💾 Save Credits'}
                          </button>
                        )}
                        {!user.isAdmin && (
                          <button
                            onClick={() => updateUser(user.id, { status: user.status === 'active' ? 'blocked' : 'active' })}
                            disabled={updating === user.id}
                            style={{ width: '100%', padding: '9px 0', borderRadius: 8, border: `1px solid ${user.status === 'active' ? c.danger : c.success}40`, background: user.status === 'active' ? `${c.danger}10` : `${c.success}10`, color: user.status === 'active' ? c.danger : c.success, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: f.body }}>
                            {updating === user.id ? '…' : user.status === 'active' ? '🚫 Block User' : '✅ Unblock User'}
                          </button>
                        )}
                      </div>
                    </>
                  ))}

                  {filtered.length === 0 && (
                    <div style={{ padding: 32, textAlign: 'center', color: c.textMuted, fontSize: 13 }}>No users found.</div>
                  )}
                </div>
              </>
            )}

            {/* PURCHASES TAB */}
            {tab === 'purchases' && (
              <>
                {missingTable && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fcd98a', borderRadius: 10, padding: '14px 18px', marginBottom: 16, fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>
                    <strong>purchase_events table not found.</strong> Run the SQL migration in your Supabase dashboard to enable purchase tracking.
                    <pre style={{ marginTop: 10, background: '#fff', padding: '10px 14px', borderRadius: 8, fontSize: 12, overflowX: 'auto', border: '1px solid #fcd98a', color: '#374151' }}>{`CREATE TABLE purchase_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  paypal_txn_id text UNIQUE,
  paypal_payer_email text,
  amount_eur numeric(8,2),
  credits_added integer,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE purchase_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only" ON purchase_events FOR ALL USING (false);`}</pre>
                  </div>
                )}

                {purchasesLoading ? (
                  <div style={{ textAlign: 'center', padding: 48, color: c.textMuted }}>Loading purchases…</div>
                ) : purchases.length === 0 && !missingTable ? (
                  <div style={{ textAlign: 'center', padding: 48, color: c.textMuted, fontSize: 13 }}>No purchases recorded yet.</div>
                ) : (
                  <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'auto' }}>
                    <div className="adm-phead">
                      {['User / Payer', 'PayPal Txn', 'Amount', 'Credits', 'Date'].map(h => (
                        <div key={h} style={{ fontSize: 10, fontWeight: 700, color: c.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>{h}</div>
                      ))}
                    </div>
                    {purchases.map(p => (
                      <>
                        <div key={p.id} className="adm-prow">
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: c.primary }}>{p.user_email}</div>
                            {p.paypal_payer_email && p.paypal_payer_email !== p.user_email && (
                              <div style={{ fontSize: 11, color: c.textMuted }}>PayPal: {p.paypal_payer_email}</div>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: c.textFaint, fontFamily: 'monospace' }}>{p.paypal_txn_id || '—'}</div>
                          <div style={{ fontFamily: f.heading, fontSize: 14, fontWeight: 700, color: '#10b981' }}>€{p.amount_eur?.toFixed(2)}</div>
                          <div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: c.accent, background: c.primaryLight, padding: '3px 10px', borderRadius: 8 }}>+{p.credits_added}</span>
                          </div>
                          <div style={{ fontSize: 11, color: c.textMuted }}>{fmtDate(p.created_at)}</div>
                        </div>
                        <div key={p.id + '-card'} className="adm-card" style={{ flexDirection: 'column', gap: 8, padding: '14px 16px', borderBottom: `1px solid ${c.border}` }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: c.primary }}>{p.user_email}</div>
                            {p.paypal_payer_email && p.paypal_payer_email !== p.user_email && (
                              <div style={{ fontSize: 11, color: c.textMuted }}>PayPal: {p.paypal_payer_email}</div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' as const }}>
                            <span style={{ fontFamily: f.heading, fontSize: 18, fontWeight: 700, color: '#10b981' }}>€{p.amount_eur?.toFixed(2)}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: c.accent, background: c.primaryLight, padding: '4px 12px', borderRadius: 8 }}>+{p.credits_added} credits</span>
                          </div>
                          <div style={{ fontSize: 11, color: c.textFaint, fontFamily: 'monospace', wordBreak: 'break-all' as const }}>{p.paypal_txn_id || '—'}</div>
                          <div style={{ fontSize: 11, color: c.textMuted }}>{fmtDate(p.created_at)}</div>
                        </div>
                      </>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
