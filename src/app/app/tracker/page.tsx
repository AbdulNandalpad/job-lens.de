'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'
import { theme } from '@/lib/theme'

const { colors: c, gradients: g, fonts: f } = theme

interface Application {
  id: number
  role: string
  company: string
  date: string
  notes: string
  source: 'Job-Lens' | 'Manual' | 'Auto Apply'
}

export default function TrackerPage() {
  const router = useRouter()
  const [apps, setApps] = useState<Application[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ role: '', company: '', notes: '' })

  useEffect(() => {
    const saved = localStorage.getItem('jl_tracker')
    if (saved) { try { setApps(JSON.parse(saved)) } catch { } }
  }, [])

  function save(updated: Application[]) {
    setApps(updated)
    localStorage.setItem('jl_tracker', JSON.stringify(updated))
  }

  function addManual() {
    if (!form.role.trim() || !form.company.trim()) return
    save([{
      id: Date.now(),
      role: form.role,
      company: form.company,
      date: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }),
      notes: form.notes,
      source: 'Manual',
    }, ...apps])
    setForm({ role: '', company: '', notes: '' })
    setShowAdd(false)
  }

  function remove(id: number) {
    save(apps.filter(a => a.id !== id))
  }

  const total = apps.length
  const viaJobLens = apps.filter(a => a.source === 'Job-Lens').length
  const autoApplied = apps.filter(a => a.source === 'Auto Apply').length
  const manual = apps.filter(a => a.source === 'Manual').length

  const stats = [
    { value: total,       label: 'Total applied',  accent: c.accent },
    { value: viaJobLens,  label: 'Via Job-Lens',    accent: c.navy },
    { value: autoApplied, label: 'Auto Applied',    accent: c.success },
    { value: manual,      label: 'Added manually',  accent: c.textMuted },
  ]

  const sourceBadge = (source: Application['source']) => {
    const map: Record<Application['source'], { bg: string; color: string }> = {
      'Job-Lens':   { bg: c.primaryLight, color: c.navy },
      'Auto Apply': { bg: c.successLight, color: c.success },
      'Manual':     { bg: c.bg,           color: c.textMuted },
    }
    const s = map[source]
    return <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600, background: s.bg, color: s.color }}>{source}</span>
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: `1px solid ${c.borderLight}`, fontSize: 13,
    fontFamily: f.body, outline: 'none', color: c.text, boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', background: c.bg, fontFamily: f.body }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');`}</style>
      <Navbar />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ paddingLeft: 14, borderLeft: `3px solid ${c.accent}` }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.primary, fontFamily: f.heading }}>Application Tracker</div>
            <div style={{ fontSize: 13, color: c.textMuted, marginTop: 3 }}>Every application in one place</div>
          </div>
          <button onClick={() => setShowAdd(p => !p)}
            style={{ padding: '9px 20px', borderRadius: 8, background: g.primaryBtn, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: f.heading, fontSize: 13, fontWeight: 700 }}>
            + Add manually
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: c.primary, marginBottom: 14, fontFamily: f.heading }}>Log a new application</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              <input placeholder="Job title *" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={inputStyle} />
              <input placeholder="Company *" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} style={inputStyle} />
              <input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={addManual} style={{ padding: '9px 24px', borderRadius: 8, background: g.primaryBtn, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: f.heading, fontSize: 13, fontWeight: 700 }}>Save</button>
              <button onClick={() => setShowAdd(false)} style={{ padding: '9px 20px', borderRadius: 8, background: c.bg, color: c.textMuted, border: `1px solid ${c.borderLight}`, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {stats.map(s => (
            <div key={s.label} style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, padding: '20px 24px', borderTop: `3px solid ${s.accent}` }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: s.accent, fontFamily: f.heading, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: c.textMuted, marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {apps.length === 0 ? (
          <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>&#128196;</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: c.primary, marginBottom: 8, fontFamily: f.heading }}>No applications yet</div>
            <div style={{ fontSize: 13, color: c.textMuted, marginBottom: 24 }}>
              Applications you send via Job-Lens or add manually will appear here.
            </div>
            <button onClick={() => router.push('/app/smart-apply')}
              style={{ padding: '10px 24px', borderRadius: 8, background: g.primaryBtn, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: f.heading, fontSize: 13, fontWeight: 700 }}>
              Find jobs to apply to
            </button>
          </div>
        ) : (
          <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 2fr 1fr 40px', padding: '10px 20px', borderBottom: `1px solid ${c.border}`, background: c.bgSubtle }}>
              {['Role', 'Company', 'Date', 'Notes', 'Source', ''].map(h => (
                <div key={h} style={{ fontSize: 11, fontWeight: 700, color: c.textFaint, letterSpacing: 0.5, textTransform: 'uppercase' as const }}>{h}</div>
              ))}
            </div>
            {apps.map((a, i) => (
              <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 2fr 1fr 40px', padding: '14px 20px', borderBottom: i < apps.length - 1 ? `1px solid #f5f7fa` : 'none', alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{a.role}</div>
                <div style={{ fontSize: 13, color: c.textMuted }}>{a.company}</div>
                <div style={{ fontSize: 13, color: c.textMuted }}>{a.date}</div>
                <div style={{ fontSize: 13, color: a.notes ? c.textMuted : c.border }}>{a.notes || '--'}</div>
                <div>{sourceBadge(a.source)}</div>
                <button onClick={() => remove(a.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.border, fontSize: 16, padding: 4, borderRadius: 4, lineHeight: 1 }}
                  onMouseEnter={e => (e.currentTarget.style.color = c.danger)}
                  onMouseLeave={e => (e.currentTarget.style.color = c.border)}>
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
