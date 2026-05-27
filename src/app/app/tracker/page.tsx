'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'
import { theme } from '@/lib/theme'
import { useLanguage } from '@/lib/i18n'
import { API } from '@/lib/constants'
import SvgIcon from '@/components/SvgIcon'

const { colors: c, gradients: g, fonts: f } = theme

type Status = 'saved' | 'applied' | 'interview' | 'offer' | 'rejected'

interface Application {
  id: string
  company: string
  role: string
  status: Status
  location: string | null
  job_url: string | null
  notes: string | null
  applied_at: string
  created_at: string
}

const STATUS_CONFIG: Record<Status, { label: string; bg: string; color: string; border: string }> = {
  saved:     { label: 'Saved',     bg: '#f0f4f8',          color: '#6b7c93',  border: '#dce4ef' },
  applied:   { label: 'Applied',   bg: 'rgba(55,138,221,0.1)',  color: '#378ADD',  border: 'rgba(55,138,221,0.3)' },
  interview: { label: 'Interview', bg: 'rgba(237,137,54,0.12)', color: '#c05c00',  border: 'rgba(237,137,54,0.3)' },
  offer:     { label: 'Offer',     bg: 'rgba(56,161,105,0.12)', color: '#276749',  border: 'rgba(56,161,105,0.3)' },
  rejected:  { label: 'Rejected',  bg: 'rgba(229,62,62,0.08)',  color: '#c53030',  border: 'rgba(229,62,62,0.2)'  },
}

const ALL_STATUSES = Object.keys(STATUS_CONFIG) as Status[]

export default function TrackerPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [apps, setApps]         = useState<Application[]>([])
  const [loading, setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState<Status | 'all'>('all')
  const [showAdd, setShowAdd]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [form, setForm] = useState({ role: '', company: '', location: '', job_url: '', notes: '', status: 'applied' as Status })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(API.applications)
      const data = await res.json()
      setApps(data.applications ?? [])
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function addApplication() {
    if (!form.role.trim() || !form.company.trim()) return
    setSaving(true)
    try {
      const res = await fetch(API.applications, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.application) {
        setApps(prev => [data.application, ...prev])
        setForm({ role: '', company: '', location: '', job_url: '', notes: '', status: 'applied' })
        setShowAdd(false)
      }
    } catch { }
    setSaving(false)
  }

  async function updateStatus(id: string, status: Status) {
    setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a))
    await fetch(`${API.applications}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  }

  async function remove(id: string) {
    setApps(prev => prev.filter(a => a.id !== id))
    await fetch(`${API.applications}/${id}`, { method: 'DELETE' })
  }

  const filtered = activeTab === 'all' ? apps : apps.filter(a => a.status === activeTab)
  const total      = apps.length
  const interviews = apps.filter(a => a.status === 'interview').length
  const offers     = apps.filter(a => a.status === 'offer').length
  const interviewRate = total > 0 ? Math.round((interviews / total) * 100) : 0
  const offerRate     = total > 0 ? Math.round((offers / total) * 100) : 0

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: `1px solid ${c.borderLight}`, fontSize: 13,
    fontFamily: f.body, outline: 'none', color: c.text,
    background: c.bg, boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', background: c.bg, fontFamily: f.body }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        .tr-stats  { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
        .tr-form   { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
        .tr-form-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 14px; }
        .tr-cols   { display: grid; grid-template-columns: 2fr 1.5fr 130px 1.5fr 40px; padding: 10px 20px; }
        .tr-row    { display: grid; grid-template-columns: 2fr 1.5fr 130px 1.5fr 40px; padding: 13px 20px; align-items: center; }
        .tr-mob    { display: none; }
        .tr-desk   { display: block; }
        @media (max-width: 768px) {
          .tr-stats  { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .tr-form   { grid-template-columns: 1fr; }
          .tr-form-3 { grid-template-columns: 1fr; }
          .tr-mob    { display: flex; flex-direction: column; gap: 10px; }
          .tr-desk   { display: none; }
        }
      `}</style>
      <Navbar />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' as const }}>
          <div style={{ paddingLeft: 14, borderLeft: `3px solid ${c.accent}` }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.primary, fontFamily: f.heading }}>{t.tracker.title}</div>
            <div style={{ fontSize: 13, color: c.textMuted, marginTop: 3 }}>{t.tracker.subtitle}</div>
          </div>
          <button onClick={() => setShowAdd(p => !p)}
            style={{ padding: '9px 20px', borderRadius: 8, background: g.primaryBtn, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: f.heading, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
            + {t.tracker.addManually}
          </button>
        </div>

        {/* Stats */}
        <div className="tr-stats">
          {[
            { value: total,            label: 'Total tracked',    accent: c.accent },
            { value: interviews,       label: 'Interviews',       accent: '#c05c00' },
            { value: offers,           label: 'Offers',           accent: '#276749' },
            { value: `${interviewRate}%`, label: 'Interview rate', accent: c.navy },
          ].map(s => (
            <div key={s.label} style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, padding: '18px 20px', borderTop: `3px solid ${s.accent}` }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.accent, fontFamily: f.heading, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: c.textMuted, marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Add form */}
        {showAdd && (
          <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: c.primary, marginBottom: 14, fontFamily: f.heading }}>Log new application</div>
            <div className="tr-form">
              <input placeholder="Job title *" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={inputStyle} />
              <input placeholder="Company *" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} style={inputStyle} />
            </div>
            <div className="tr-form-3">
              <input placeholder="Location (optional)" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} style={inputStyle} />
              <input placeholder="Job URL (optional)" value={form.job_url} onChange={e => setForm(p => ({ ...p, job_url: e.target.value }))} style={inputStyle} />
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as Status }))}
                style={{ ...inputStyle, appearance: 'none' as const }}>
                {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
              </select>
            </div>
            <textarea placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              style={{ ...inputStyle, height: 70, resize: 'vertical' as const, marginBottom: 14 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={addApplication} disabled={saving}
                style={{ padding: '9px 24px', borderRadius: 8, background: saving ? c.border : g.primaryBtn, color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: f.heading, fontSize: 13, fontWeight: 700 }}>
                {saving ? 'Saving…' : t.tracker.save}
              </button>
              <button onClick={() => setShowAdd(false)}
                style={{ padding: '9px 20px', borderRadius: 8, background: c.bg, color: c.textMuted, border: `1px solid ${c.borderLight}`, cursor: 'pointer', fontSize: 13 }}>
                {t.tracker.cancel}
              </button>
            </div>
          </div>
        )}

        {/* Status filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' as const }}>
          {(['all', ...ALL_STATUSES] as const).map(tab => {
            const count = tab === 'all' ? apps.length : apps.filter(a => a.status === tab).length
            const active = activeTab === tab
            const cfg = tab !== 'all' ? STATUS_CONFIG[tab] : null
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${active ? c.accent : c.borderLight}`, background: active ? c.accent : c.bgCard, color: active ? '#fff' : c.textMuted, fontSize: 12, fontWeight: active ? 700 : 400, cursor: 'pointer', fontFamily: f.body }}>
                {tab === 'all' ? 'All' : STATUS_CONFIG[tab as Status].label} <span style={{ opacity: 0.7 }}>({count})</span>
              </button>
            )
          })}
        </div>

        {/* Empty state */}
        {loading ? (
          <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, padding: '60px 20px', textAlign: 'center', color: c.textMuted, fontSize: 13 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}><SvgIcon name="clipboard" size={32} color={c.textMuted} /></div>
            <div style={{ fontSize: 15, fontWeight: 600, color: c.primary, marginBottom: 8, fontFamily: f.heading }}>
              {activeTab === 'all' ? t.tracker.empty.title : `No ${STATUS_CONFIG[activeTab as Status]?.label} applications`}
            </div>
            <div style={{ fontSize: 13, color: c.textMuted, marginBottom: 24 }}>{t.tracker.empty.desc}</div>
            {activeTab === 'all' && (
              <button onClick={() => router.push('/app/jobs')}
                style={{ padding: '10px 24px', borderRadius: 8, background: g.primaryBtn, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: f.heading, fontSize: 13, fontWeight: 700 }}>
                Find jobs
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="tr-desk" style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden' }}>
              <div className="tr-cols" style={{ borderBottom: `1px solid ${c.border}`, background: c.bgSubtle }}>
                {['Role / Company', 'Location', 'Status', 'Notes', ''].map(h => (
                  <div key={h} style={{ fontSize: 11, fontWeight: 700, color: c.textFaint, letterSpacing: 0.5, textTransform: 'uppercase' as const }}>{h}</div>
                ))}
              </div>
              {filtered.map((a, i) => {
                const cfg = STATUS_CONFIG[a.status]
                return (
                  <div key={a.id} className="tr-row" style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${c.bgSubtle}` : 'none' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>
                        {a.job_url ? <a href={a.job_url} target="_blank" rel="noopener noreferrer" style={{ color: c.accent, textDecoration: 'none' }}>{a.role}</a> : a.role}
                      </div>
                      <div style={{ fontSize: 12, color: c.textMuted }}>{a.company}</div>
                    </div>
                    <div style={{ fontSize: 12, color: c.textMuted }}>{a.location || '—'}</div>
                    <div>
                      <select value={a.status} onChange={e => updateStatus(a.id, e.target.value as Status)}
                        style={{ fontSize: 11, padding: '4px 8px', borderRadius: 20, border: `1px solid ${cfg.border}`, background: cfg.bg, color: cfg.color, cursor: 'pointer', fontWeight: 600, appearance: 'none' as const, fontFamily: f.body }}>
                        {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                      </select>
                    </div>
                    <div style={{ fontSize: 12, color: a.notes ? c.textMuted : c.border, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{a.notes || '—'}</div>
                    <button onClick={() => remove(a.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.border, fontSize: 16, padding: 4, borderRadius: 4, lineHeight: 1 }}
                      onMouseEnter={e => (e.currentTarget.style.color = c.danger)}
                      onMouseLeave={e => (e.currentTarget.style.color = c.border)}>
                      &times;
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Mobile cards */}
            <div className="tr-mob">
              {filtered.map(a => {
                const cfg = STATUS_CONFIG[a.status]
                return (
                  <div key={a.id} style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: c.text }}>
                          {a.job_url ? <a href={a.job_url} target="_blank" rel="noopener noreferrer" style={{ color: c.accent, textDecoration: 'none' }}>{a.role}</a> : a.role}
                        </div>
                        <div style={{ fontSize: 13, color: c.textMuted, marginTop: 2 }}>{a.company}{a.location ? ` · ${a.location}` : ''}</div>
                      </div>
                      <button onClick={() => remove(a.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.border, fontSize: 18, padding: 4, flexShrink: 0, lineHeight: 1 }}
                        onMouseEnter={e => (e.currentTarget.style.color = c.danger)}
                        onMouseLeave={e => (e.currentTarget.style.color = c.border)}>
                        &times;
                      </button>
                    </div>
                    <select value={a.status} onChange={e => updateStatus(a.id, e.target.value as Status)}
                      style={{ fontSize: 12, padding: '5px 10px', borderRadius: 20, border: `1px solid ${cfg.border}`, background: cfg.bg, color: cfg.color, cursor: 'pointer', fontWeight: 600, appearance: 'none' as const, fontFamily: f.body, width: '100%' }}>
                      {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                    </select>
                    {a.notes && <div style={{ fontSize: 12, color: c.textMuted, marginTop: 8 }}>{a.notes}</div>}
                  </div>
                )
              })}
            </div>
          </>
        )}

      </div>
    </div>
  )
}
