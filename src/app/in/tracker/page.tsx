'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const accent = '#FF9933'
const navy   = '#042C53'
const green  = '#138808'
const f = { body: "'DM Sans', sans-serif", heading: "'Outfit', sans-serif" }

interface Application {
  id: number
  role: string
  company: string
  date: string
  notes: string
  source: 'Job-Lens' | 'Manual'
}

export default function IndiaTrackerPage() {
  const router = useRouter()
  const [apps, setApps]       = useState<Application[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm]       = useState({ role: '', company: '', notes: '' })

  useEffect(() => {
    const saved = localStorage.getItem('jl_tracker_in')
    if (saved) { try { setApps(JSON.parse(saved)) } catch { } }
  }, [])

  function save(updated: Application[]) {
    setApps(updated)
    localStorage.setItem('jl_tracker_in', JSON.stringify(updated))
  }

  function addManual() {
    if (!form.role.trim() || !form.company.trim()) return
    save([{
      id: Date.now(),
      role: form.role,
      company: form.company,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      notes: form.notes,
      source: 'Manual',
    }, ...apps])
    setForm({ role: '', company: '', notes: '' })
    setShowAdd(false)
  }

  function remove(id: number) { save(apps.filter(a => a.id !== id)) }

  const stats = [
    { value: apps.length,                                              label: 'Total applied',  color: accent },
    { value: apps.filter(a => a.source === 'Job-Lens').length,        label: 'Via Job-Lens',   color: navy },
    { value: apps.filter(a => a.source === 'Manual').length,          label: 'Added manually', color: '#6b7c93' },
  ]

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid #dce4ef', fontSize: 13, fontFamily: f.body,
    outline: 'none', color: '#1a2332', boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: f.body }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        .tr-stats   { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px; }
        .tr-form    { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 14px; }
        .tr-table   { display: grid; grid-template-columns: 2fr 1.5fr 1fr 2fr 1fr 40px; padding: 10px 20px; }
        .tr-row     { display: grid; grid-template-columns: 2fr 1.5fr 1fr 2fr 1fr 40px; padding: 14px 20px; align-items: center; }
        .tr-mob-card { display: none; }
        .tr-desktop-table { display: block; }
        @media (max-width: 768px) {
          .tr-stats  { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .tr-form   { grid-template-columns: 1fr; }
          .tr-mob-card { display: flex; flex-direction: column; gap: 10px; }
          .tr-desktop-table { display: none; }
        }
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
          <div style={{ paddingLeft: 14, borderLeft: `3px solid ${accent}` }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: navy, fontFamily: f.heading }}>Application Tracker</div>
            <div style={{ fontSize: 13, color: '#6b7c93', marginTop: 3 }}>Every application in one place</div>
          </div>
          <button onClick={() => setShowAdd(p => !p)}
            style={{ padding: '9px 20px', borderRadius: 8, background: `linear-gradient(135deg, ${accent}, #e67300)`, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: f.heading, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
            + Add manually
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div style={{ background: '#fff', border: '1px solid #edf1f6', borderRadius: 14, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: navy, marginBottom: 14, fontFamily: f.heading }}>Log a new application</div>
            <div className="tr-form">
              <input placeholder="Job title *" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={inputStyle} />
              <input placeholder="Company *" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} style={inputStyle} />
              <input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={addManual} style={{ padding: '9px 24px', borderRadius: 8, background: `linear-gradient(135deg, ${accent}, #e67300)`, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: f.heading, fontSize: 13, fontWeight: 700 }}>Save</button>
              <button onClick={() => setShowAdd(false)} style={{ padding: '9px 20px', borderRadius: 8, background: '#f0f4f8', color: '#6b7c93', border: '1px solid #dce4ef', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="tr-stats">
          {stats.map(s => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid #edf1f6', borderRadius: 14, padding: '20px 24px', borderTop: `3px solid ${s.color}` }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: s.color, fontFamily: f.heading, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: '#6b7c93', marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {apps.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #edf1f6', borderRadius: 14, padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.4 }}>📄</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: navy, marginBottom: 8, fontFamily: f.heading }}>No applications yet</div>
            <div style={{ fontSize: 13, color: '#6b7c93', marginBottom: 24 }}>Log applications you send via Job-Lens India or add them manually.</div>
            <button onClick={() => router.push('/in/jobs')}
              style={{ padding: '10px 24px', borderRadius: 8, background: `linear-gradient(135deg, ${accent}, #e67300)`, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: f.heading, fontSize: 13, fontWeight: 700 }}>
              Find jobs in India
            </button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="tr-desktop-table" style={{ background: '#fff', border: '1px solid #edf1f6', borderRadius: 14, overflow: 'hidden' }}>
              <div className="tr-table" style={{ borderBottom: '1px solid #edf1f6', background: '#fafbfd' }}>
                {['Role', 'Company', 'Date', 'Notes', 'Source', ''].map(h => (
                  <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#8fa3b8', letterSpacing: 0.5, textTransform: 'uppercase' as const }}>{h}</div>
                ))}
              </div>
              {apps.map((a, i) => (
                <div key={a.id} className="tr-row" style={{ borderBottom: i < apps.length - 1 ? '1px solid #f5f7fa' : 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2332' }}>{a.role}</div>
                  <div style={{ fontSize: 13, color: '#6b7c93' }}>{a.company}</div>
                  <div style={{ fontSize: 13, color: '#6b7c93' }}>{a.date}</div>
                  <div style={{ fontSize: 13, color: a.notes ? '#6b7c93' : '#edf1f6' }}>{a.notes || '--'}</div>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600, background: a.source === 'Job-Lens' ? 'rgba(255,153,51,0.12)' : '#f0f4f8', color: a.source === 'Job-Lens' ? accent : '#6b7c93', display: 'inline-block' }}>{a.source}</span>
                  <button onClick={() => remove(a.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dce4ef', fontSize: 16, padding: 4, borderRadius: 4 }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#E24B4A')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#dce4ef')}>
                    &times;
                  </button>
                </div>
              ))}
            </div>

            {/* Mobile cards */}
            <div className="tr-mob-card">
              {apps.map(a => (
                <div key={a.id} style={{ background: '#fff', border: '1px solid #edf1f6', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1a2332' }}>{a.role}</div>
                      <div style={{ fontSize: 13, color: '#6b7c93', marginTop: 2 }}>{a.company}</div>
                    </div>
                    <button onClick={() => remove(a.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dce4ef', fontSize: 18, padding: 4, borderRadius: 4, flexShrink: 0 }}>
                      &times;
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: '#9aafbc' }}>{a.date}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: a.source === 'Job-Lens' ? 'rgba(255,153,51,0.12)' : '#f0f4f8', color: a.source === 'Job-Lens' ? accent : '#6b7c93' }}>{a.source}</span>
                    {a.notes && <span style={{ fontSize: 11, color: '#6b7c93' }}>{a.notes}</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
