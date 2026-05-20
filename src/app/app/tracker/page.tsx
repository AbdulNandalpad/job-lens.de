'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'
import { theme } from '@/lib/theme'
import { useLanguage } from '@/lib/i18n'

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
  const { t } = useLanguage()
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
    { value: total,       label: t.tracker.stats.total,       accent: c.accent },
    { value: viaJobLens,  label: t.tracker.stats.viaJobLens,  accent: c.navy },
    { value: autoApplied, label: t.tracker.stats.autoApplied, accent: c.success },
    { value: manual,      label: t.tracker.stats.manual,      accent: c.textMuted },
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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        .tr-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
        .tr-form  { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 14px; }
        .tr-desktop-table { display: block; }
        .tr-mob-card { display: none; }
        @media (max-width: 768px) {
          .tr-stats { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .tr-form  { grid-template-columns: 1fr; }
          .tr-desktop-table { display: none; }
          .tr-mob-card { display: flex; flex-direction: column; gap: 10px; }
        }
      `}</style>
      <Navbar />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' as const }}>
          <div style={{ paddingLeft: 14, borderLeft: `3px solid ${c.accent}` }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.primary, fontFamily: f.heading }}>{t.tracker.title}</div>
            <div style={{ fontSize: 13, color: c.textMuted, marginTop: 3 }}>{t.tracker.subtitle}</div>
          </div>
          <button onClick={() => setShowAdd(p => !p)}
            style={{ padding: '9px 20px', borderRadius: 8, background: g.primaryBtn, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: f.heading, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
            {t.tracker.addManually}
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: c.primary, marginBottom: 14, fontFamily: f.heading }}>{t.tracker.logNew}</div>
            <div className="tr-form">
              <input placeholder={t.tracker.jobTitlePlaceholder} value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={inputStyle} />
              <input placeholder={t.tracker.companyPlaceholder} value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} style={inputStyle} />
              <input placeholder={t.tracker.notesPlaceholder} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={addManual} style={{ padding: '9px 24px', borderRadius: 8, background: g.primaryBtn, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: f.heading, fontSize: 13, fontWeight: 700 }}>{t.tracker.save}</button>
              <button onClick={() => setShowAdd(false)} style={{ padding: '9px 20px', borderRadius: 8, background: c.bg, color: c.textMuted, border: `1px solid ${c.borderLight}`, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>{t.tracker.cancel}</button>
            </div>
          </div>
        )}

        {/* Stat cards */}
        <div className="tr-stats">
          {stats.map(s => (
            <div key={s.label} style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, padding: '18px 20px', borderTop: `3px solid ${s.accent}` }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: s.accent, fontFamily: f.heading, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: c.textMuted, marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {apps.length === 0 ? (
          <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>&#128196;</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: c.primary, marginBottom: 8, fontFamily: f.heading }}>{t.tracker.empty.title}</div>
            <div style={{ fontSize: 13, color: c.textMuted, marginBottom: 24 }}>{t.tracker.empty.desc}</div>
            <button onClick={() => router.push('/app/smart-apply')}
              style={{ padding: '10px 24px', borderRadius: 8, background: g.primaryBtn, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: f.heading, fontSize: 13, fontWeight: 700 }}>
              {t.tracker.empty.cta}
            </button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="tr-desktop-table" style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 2fr 1fr 40px', padding: '10px 20px', borderBottom: `1px solid ${c.border}`, background: c.bgSubtle }}>
                {[t.tracker.columns.role, t.tracker.columns.company, t.tracker.columns.date, t.tracker.columns.notes, t.tracker.columns.source, ''].map(h => (
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

            {/* Mobile cards */}
            <div className="tr-mob-card">
              {apps.map(a => (
                <div key={a.id} style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{a.role}</div>
                      <div style={{ fontSize: 13, color: c.textMuted, marginTop: 2 }}>{a.company}</div>
                    </div>
                    <button onClick={() => remove(a.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.border, fontSize: 18, padding: 4, borderRadius: 4, flexShrink: 0, lineHeight: 1 }}
                      onMouseEnter={e => (e.currentTarget.style.color = c.danger)}
                      onMouseLeave={e => (e.currentTarget.style.color = c.border)}>
                      &times;
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const }}>
                    <span style={{ fontSize: 11, color: c.textFaint }}>{a.date}</span>
                    {sourceBadge(a.source)}
                    {a.notes && <span style={{ fontSize: 11, color: c.textMuted }}>{a.notes}</span>}
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
