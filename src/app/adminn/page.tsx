'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { theme } from '@/lib/theme'

const { colors: c, fonts: f, gradients: g } = theme

interface AdminUser {
  id: string
  email: string
  name: string
  provider: string
  credits: number
  status: string
  credits_spent: number
  created_at: string
  last_sign_in: string
}

export default function AdminPage() {
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
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

  async function loadUsers() {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    if (res.status === 403) { router.replace('/app/career-scan'); return }
    const data = await res.json()
    if (data.error) { setError(data.error); setLoading(false); return }
    setUsers(data.users || [])
    setLoading(false)
  }

  async function updateUser(id: string, updates: Record<string, unknown>) {
    setUpdating(id)
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
    await loadUsers()
    setUpdating(null)
  }

  const filtered = users.filter(u =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.name?.toLowerCase().includes(search.toLowerCase())
  )

  const totalUsers = users.length
  const activeUsers = users.filter(u => u.status === 'active').length
  const blockedUsers = users.filter(u => u.status === 'blocked').length
  const totalCreditsSpent = users.reduce((s, u) => s + (u.credits_spent || 0), 0)

  return (
    <div style={{ minHeight: '100vh', background: c.bg, fontFamily: f.body }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');`}</style>

      {/* Header */}
      <div style={{ background: c.primary, padding: '0 24px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, borderBottom: `1px solid rgba(255,255,255,0.1)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: f.heading, fontSize: 15, fontWeight: 700, color: '#E6F1FB' }}>Job-Lens <span style={{ color: '#378ADD' }}>Admin</span></span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#378ADD', background: 'rgba(55,138,221,0.15)', padding: '2px 8px', borderRadius: 10, border: '1px solid rgba(55,138,221,0.3)' }}>INTERNAL</span>
        </div>
        <button onClick={() => router.push('/app/career-scan')}
          style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>
          ← Back to App
        </button>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>

        {error ? (
          <div style={{ background: `${c.danger}15`, border: `1px solid ${c.danger}40`, borderRadius: 12, padding: 24, color: c.danger, textAlign: 'center' }}>{error}</div>
        ) : loading ? (
          <div style={{ textAlign: 'center', color: c.textMuted, paddingTop: 80 }}>Loading users…</div>
        ) : (
          <>
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Total Users', value: totalUsers, color: c.accent },
                { label: 'Active', value: activeUsers, color: c.success },
                { label: 'Blocked', value: blockedUsers, color: c.danger },
                { label: 'AI Calls Made', value: totalCreditsSpent, color: c.warning },
              ].map(stat => (
                <div key={stat.label} style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 12, padding: '16px 20px' }}>
                  <div style={{ fontSize: 11, color: c.textMuted, marginBottom: 4 }}>{stat.label}</div>
                  <div style={{ fontFamily: f.heading, fontSize: 26, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Search */}
            <div style={{ marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Search by name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '10px 16px', borderRadius: 9, border: `1px solid ${c.border}`, background: c.bgCard, color: c.primary, fontSize: 13, fontFamily: f.body, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Users table */}
            <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px 90px 80px 130px', gap: 0, padding: '10px 16px', borderBottom: `1px solid ${c.border}`, background: c.bgSubtle }}>
                {['User', 'Provider', 'Credits', 'Spent', 'Status', 'Actions'].map(h => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 700, color: c.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>{h}</div>
                ))}
              </div>

              {filtered.map(user => (
                <div key={user.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px 90px 80px 130px', gap: 0, padding: '12px 16px', borderBottom: `1px solid ${c.border}`, alignItems: 'center', opacity: user.status === 'blocked' ? 0.6 : 1 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: c.primary }}>{user.name || '—'}</div>
                    <div style={{ fontSize: 11, color: c.textMuted }}>{user.email}</div>
                    <div style={{ fontSize: 10, color: c.textFaint }}>{user.last_sign_in ? `Last: ${new Date(user.last_sign_in).toLocaleDateString('de-DE')}` : 'Never signed in'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: user.provider === 'google' ? '#EA4335' : '#0A66C2', background: user.provider === 'google' ? '#EA433515' : '#0A66C215', padding: '3px 8px', borderRadius: 10 }}>
                      {user.provider === 'linkedin_oidc' ? 'LinkedIn' : 'Google'}
                    </span>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="number"
                        value={creditEdits[user.id] ?? user.credits}
                        onChange={e => setCreditEdits(prev => ({ ...prev, [user.id]: e.target.value }))}
                        onBlur={e => {
                          const val = parseInt(e.target.value)
                          if (!isNaN(val) && val !== user.credits) updateUser(user.id, { credits: val })
                        }}
                        style={{ width: 52, padding: '3px 6px', borderRadius: 6, border: `1px solid ${c.border}`, background: c.bg, color: c.primary, fontSize: 12, textAlign: 'center' as const }}
                      />
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: c.textMuted }}>{user.credits_spent}</div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: user.status === 'active' ? c.success : c.danger, background: user.status === 'active' ? c.successLight : `${c.danger}15`, padding: '3px 8px', borderRadius: 10 }}>
                      {user.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {user.status === 'active' ? (
                      <button
                        onClick={() => updateUser(user.id, { status: 'blocked' })}
                        disabled={updating === user.id}
                        style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${c.danger}40`, background: `${c.danger}10`, color: c.danger, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        {updating === user.id ? '…' : 'Block'}
                      </button>
                    ) : (
                      <button
                        onClick={() => updateUser(user.id, { status: 'active' })}
                        disabled={updating === user.id}
                        style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${c.success}40`, background: `${c.success}10`, color: c.success, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        {updating === user.id ? '…' : 'Unblock'}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {filtered.length === 0 && (
                <div style={{ padding: 32, textAlign: 'center', color: c.textMuted, fontSize: 13 }}>No users found.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
