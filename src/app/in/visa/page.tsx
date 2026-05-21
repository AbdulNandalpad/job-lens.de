'use client'

import { useState, useEffect } from 'react'
import { SS } from '@/lib/constants'

const accent = '#FF9933'
const navy   = '#042C53'
const green  = '#1D9E75'
const red    = '#E24B4A'
const amber  = '#f59e0b'
const purple = '#8b5cf6'

// ── Types ────────────────────────────────────────────────────────────────────
interface VisaOption {
  id: string
  title: string
  emoji: string
  eligibility: 'eligible' | 'partial' | 'not_eligible'
  matchScore: number
  headline: string
  metRequirements: string[]
  missingRequirements: string[]
  timeline: string
  keyAdvantage: string
  nextStep: string
}

interface VisaDoc {
  category: string
  items: string[]
}

interface VisaResult {
  isEU: boolean
  euNote?: string
  visaOptions: VisaOption[]
  recommendedPath: string
  chancenkartePoints: number | null
  qualificationRecognitionNeeded: boolean
  recognitionBody?: string
  documents: VisaDoc[]
  urgentWarnings: string[]
  usefulLinks: { label: string; url: string }[]
  summary: string
  creditsRemaining: number
}

interface FormData {
  citizenship: string
  isEU: boolean
  qualification: string
  qualificationField: string
  qualificationCountry: string
  germanLevel: string
  experience: string
  hasJobOffer: string
  offeredSalary: string
  targetField: string
  germanyConnection: string
  age: string
}

// ── Options ──────────────────────────────────────────────────────────────────
const EU_COUNTRIES = ['Austria','Belgium','Bulgaria','Croatia','Cyprus','Czech Republic','Denmark','Estonia','Finland','France','Germany','Greece','Hungary','Ireland','Italy','Latvia','Lithuania','Luxembourg','Malta','Netherlands','Poland','Portugal','Romania','Slovakia','Slovenia','Spain','Sweden','Iceland','Liechtenstein','Norway','Switzerland']

const QUALIFICATIONS = [
  { value: 'phd',        label: 'PhD / Doctorate' },
  { value: 'masters',    label: "Master's Degree" },
  { value: 'bachelors',  label: "Bachelor's Degree" },
  { value: 'vocational', label: 'Vocational Training / Ausbildung' },
  { value: 'diploma',    label: 'Diploma / HND' },
  { value: 'none',       label: 'No formal qualification' },
]

const FIELDS = [
  'IT & Software','Engineering','Healthcare & Medicine','Natural Sciences','Mathematics',
  'Teaching & Education','Finance & Banking','Architecture','Law','Marketing & Sales',
  'Logistics & Supply Chain','Construction & Trades','Other',
]

const GERMAN_LEVELS = [
  { value: 'none', label: 'None' },
  { value: 'A1',   label: 'A1 — Beginner' },
  { value: 'A2',   label: 'A2 — Elementary' },
  { value: 'B1',   label: 'B1 — Intermediate' },
  { value: 'B2',   label: 'B2 — Upper Intermediate' },
  { value: 'C1',   label: 'C1 — Advanced' },
  { value: 'C2',   label: 'C2 — Proficient' },
]

const ELIGIBILITY_CONFIG = {
  eligible:     { color: green, bg: '#1D9E7512', label: 'Eligible',           icon: '✓' },
  partial:      { color: amber, bg: '#f59e0b12', label: 'Partially Eligible', icon: '◑' },
  not_eligible: { color: red,   bg: '#E24B4A12', label: 'Not Eligible',       icon: '✗' },
}

const EMPTY_FORM: FormData = {
  citizenship: '', isEU: false, qualification: '', qualificationField: '',
  qualificationCountry: '', germanLevel: 'none', experience: '',
  hasJobOffer: 'no', offeredSalary: '', targetField: '', germanyConnection: 'none', age: '',
}

// ── Step indicator ────────────────────────────────────────────────────────────
function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, background: done ? green : active ? accent : '#dce4ef', color: done || active ? '#fff' : '#9aafbc', transition: 'all .2s' }}>
        {done ? '✓' : n}
      </div>
    </div>
  )
}

// ── Download helper ──────────────────────────────────────────────────────────
function downloadVisaReport(result: VisaResult, form: FormData) {
  const eligible = result.visaOptions.filter(v => v.eligibility === 'eligible')
  const partial  = result.visaOptions.filter(v => v.eligibility === 'partial')
  const notElig  = result.visaOptions.filter(v => v.eligibility === 'not_eligible')

  const renderOptions = (opts: VisaOption[]) => opts.sort((a, b) => b.matchScore - a.matchScore).map(opt => `
    <div class="visa-card ${opt.eligibility}">
      <div class="visa-head">${opt.emoji} ${opt.title} <span class="score">${opt.matchScore}%</span></div>
      <div class="visa-timeline">⏱ ${opt.timeline}</div>
      <p>${opt.headline}</p>
      ${opt.metRequirements.length ? `<div class="req-block"><strong>✓ Met:</strong> ${opt.metRequirements.map(r => `<span>${r}</span>`).join('')}</div>` : ''}
      ${opt.missingRequirements.length ? `<div class="req-block"><strong>○ Needed:</strong> ${opt.missingRequirements.map(r => `<span>${r}</span>`).join('')}</div>` : ''}
      <div class="next-step">→ Next step: ${opt.nextStep}</div>
    </div>`).join('')

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>Work Visa Guide — Job-Lens AI</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 820px; margin: 40px auto; padding: 0 24px; color: #1a2332; }
  h1 { color: #042C53; font-size: 22px; margin-bottom: 4px; }
  .sub { color: #6b7c93; font-size: 13px; margin-bottom: 28px; }
  .profile-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 28px; }
  .profile-item { background: #f8fafc; border-radius: 8px; padding: 10px 12px; }
  .profile-label { font-size: 10px; font-weight: 700; color: #9aafbc; text-transform: uppercase; letter-spacing: 0.5px; }
  .profile-val { font-size: 13px; font-weight: 600; color: #1a2332; margin-top: 2px; }
  .summary { background: #fff8ee; border: 1px solid #fed7aa; border-radius: 10px; padding: 16px 18px; margin-bottom: 24px; font-size: 13px; line-height: 1.7; }
  h2 { font-size: 15px; color: #042C53; border-bottom: 2px solid #edf1f6; padding-bottom: 6px; margin: 24px 0 12px; }
  .visa-card { border-radius: 10px; padding: 16px 18px; margin-bottom: 12px; }
  .visa-card.eligible { background: #f0fdf4; border: 1px solid #bbf7d0; }
  .visa-card.partial { background: #fef9ec; border: 1px solid #fde68a; }
  .visa-card.not_eligible { background: #fef2f2; border: 1px solid #fca5a5; opacity: 0.7; }
  .visa-head { font-size: 15px; font-weight: 700; color: #042C53; }
  .score { font-size: 12px; font-weight: 700; background: #ffedd5; color: #c2410c; padding: 2px 8px; border-radius: 20px; margin-left: 8px; }
  .visa-timeline { font-size: 11px; color: #9aafbc; margin: 3px 0 8px; }
  .req-block { font-size: 12px; margin: 6px 0; }
  .req-block span { display: inline-block; background: #f3f4f6; border-radius: 4px; padding: 1px 6px; margin: 2px 3px 2px 0; }
  .next-step { font-size: 12px; color: #FF9933; font-weight: 600; margin-top: 8px; }
  .doc-category { font-weight: 700; font-size: 13px; color: #042C53; margin: 12px 0 6px; }
  .doc-item { font-size: 12px; color: #374151; padding: 3px 0; }
  .warning { background: #fff0f0; border: 1px solid #fca5a5; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #991b1b; margin-bottom: 8px; }
  .footer { margin-top: 40px; font-size: 11px; color: #9aafbc; text-align: center; border-top: 1px solid #edf1f6; padding-top: 16px; }
  @media print { body { margin: 20px; } }
</style></head><body>
<h1>Work Visa Guide — Germany 🇩🇪</h1>
<div class="sub">Generated by Job-Lens AI · ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>

<div class="profile-grid">
  <div class="profile-item"><div class="profile-label">Citizenship</div><div class="profile-val">${form.citizenship}</div></div>
  <div class="profile-item"><div class="profile-label">Qualification</div><div class="profile-val">${form.qualification}</div></div>
  <div class="profile-item"><div class="profile-label">Field</div><div class="profile-val">${form.qualificationField}</div></div>
  <div class="profile-item"><div class="profile-label">German Level</div><div class="profile-val">${form.germanLevel === 'none' ? 'None' : form.germanLevel}</div></div>
  <div class="profile-item"><div class="profile-label">Experience</div><div class="profile-val">${form.experience}+ years</div></div>
  <div class="profile-item"><div class="profile-label">Job Offer</div><div class="profile-val">${form.hasJobOffer === 'yes' ? `Yes — €${form.offeredSalary}/yr` : form.hasJobOffer === 'process' ? 'In progress' : 'No'}</div></div>
</div>

<div class="summary">${result.summary}</div>
${result.chancenkartePoints !== null ? `<p>⭐ <strong>Chancenkarte points:</strong> ${result.chancenkartePoints}/6${result.chancenkartePoints >= 6 ? ' ✓ Eligible' : ' — need more points'}</p>` : ''}

${result.urgentWarnings?.length ? `<h2>⚠️ Important Warnings</h2>${result.urgentWarnings.map(w => `<div class="warning">${w}</div>`).join('')}` : ''}

${eligible.length ? `<h2>✓ Eligible Visa Paths</h2>${renderOptions(eligible)}` : ''}
${partial.length ? `<h2>◑ Partially Eligible</h2>${renderOptions(partial)}` : ''}
${notElig.length ? `<h2>✗ Not Currently Eligible</h2>${renderOptions(notElig)}` : ''}

${result.qualificationRecognitionNeeded ? `<h2>📜 Qualification Recognition Required</h2><p>Your qualification needs official recognition (Anerkennung) in Germany. Authority: <strong>${result.recognitionBody || 'See anerkennung-in-deutschland.de'}</strong></p>` : ''}

${result.documents?.length ? `<h2>📁 Document Checklist</h2>${result.documents.map(d => `<div class="doc-category">${d.category}</div>${d.items.map(i => `<div class="doc-item">□ ${i}</div>`).join('')}`).join('')}` : ''}

<div class="footer">Job-Lens AI · Work Visa Guide · job-lens.de<br>This document is for information only and does not constitute legal advice. Consult a qualified immigration lawyer for your specific situation.</div>
</body></html>`

  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 400)
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function VisaPageIndia() {
  const [step,    setStep]    = useState<1 | 2 | 3>(1)
  const [form,    setForm]    = useState<FormData>(EMPTY_FORM)
  const [result,  setResult]  = useState<VisaResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [openDoc, setOpenDoc] = useState<string | null>(null)

  // Restore from session on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SS.visaResult)
      if (saved) {
        const parsed = JSON.parse(saved) as { result: VisaResult; form: FormData }
        setResult(parsed.result)
        setForm(parsed.form)
        setStep(3)
      }
    } catch {}
  }, [])

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.value
    setForm(p => ({
      ...p, [k]: val,
      ...(k === 'citizenship' ? { isEU: EU_COUNTRIES.includes(val) } : {}),
    }))
  }

  const canSubmit = form.citizenship && form.qualification && form.qualificationField && form.targetField && form.experience && form.age

  async function analyse() {
    if (!canSubmit) return
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/visa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong'); setLoading(false); return }
      setResult(data)
      setStep(3)
      try { sessionStorage.setItem(SS.visaResult, JSON.stringify({ result: data, form })) } catch {}
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 14, border: '1px solid #edf1f6', boxShadow: '0 2px 10px rgba(4,44,83,0.05)', padding: '22px 24px', marginBottom: 16 }
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #dce4ef', fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: 'none', color: '#1a2332', boxSizing: 'border-box', background: '#fff' }
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#6b7c93', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }
  const secLabel: React.CSSProperties   = { fontSize: 13, fontWeight: 700, color: navy, fontFamily: "'Outfit',sans-serif", marginBottom: 14, display: 'block' }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        .v-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .v-grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        .v-visa-card { transition: box-shadow .2s, border-color .2s; }
        .v-visa-card:hover { box-shadow: 0 4px 20px rgba(4,44,83,0.08) !important; }
        .v-link { color: ${accent}; text-decoration: none; font-weight: 600; }
        .v-link:hover { text-decoration: underline; }
        @media (max-width: 640px) {
          .v-grid2 { grid-template-columns: 1fr !important; }
          .v-grid3 { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 400px) {
          .v-grid3 { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ background: '#f0f4f8', minHeight: 'calc(100vh - 52px)', padding: '28px 16px', fontFamily: "'DM Sans',sans-serif" }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: 24, paddingLeft: 14, borderLeft: `3px solid ${accent}` }}>
            <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 700, color: navy, margin: 0 }}>
              Work Visa Guide — Germany 🇩🇪
            </h1>
            <p style={{ fontSize: 13, color: '#6b7c93', margin: '4px 0 0' }}>
              Fachkräfteeinwanderungsgesetz 2023 · Find your fastest path to working in Germany
            </p>
          </div>

          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
            {(['Your Profile', 'Review', 'Results'] as const).map((label, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <StepDot n={i + 1} active={step === i + 1} done={step > i + 1} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: step === i + 1 ? accent : step > i + 1 ? green : '#9aafbc', whiteSpace: 'nowrap' }}>{label}</span>
                </div>
                {i < 2 && <div style={{ flex: 1, height: 2, background: step > i + 1 ? green : '#dce4ef', margin: '0 8px', marginBottom: 18, transition: 'background .3s' }} />}
              </div>
            ))}
          </div>

          {/* ── STEP 1: Form ── */}
          {step === 1 && (
            <>
              <div style={cardStyle}>
                <span style={secLabel}>🌍 Citizenship & Background</span>
                <div className="v-grid2" style={{ marginBottom: 14 }}>
                  <div>
                    <label style={labelStyle}>Country of citizenship *</label>
                    <input list="countries-list" style={inputStyle} value={form.citizenship} onChange={set('citizenship')} placeholder="e.g. India, Nigeria, USA..." />
                    <datalist id="countries-list">
                      {['India','Nigeria','USA','Brazil','Turkey','China','Pakistan','Philippines','Vietnam','Morocco','Egypt','Bangladesh','Ukraine','Mexico','Kenya','Indonesia','Ghana','South Africa','Serbia','Bosnia'].map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                  <div>
                    <label style={labelStyle}>Age *</label>
                    <input type="number" style={inputStyle} value={form.age} onChange={set('age')} placeholder="e.g. 28" min="18" max="65" />
                  </div>
                </div>
                {form.isEU && (
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 13, color: '#166534' }}>
                    ✓ As an EU/EEA/Swiss citizen you have free movement rights — no work visa needed for Germany. See Step 3 for practical next steps.
                  </div>
                )}
              </div>

              <div style={cardStyle}>
                <span style={secLabel}>🎓 Qualifications</span>
                <div className="v-grid2" style={{ marginBottom: 14 }}>
                  <div>
                    <label style={labelStyle}>Highest qualification *</label>
                    <select style={inputStyle} value={form.qualification} onChange={set('qualification')}>
                      <option value="">Select...</option>
                      {QUALIFICATIONS.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Field of study / training *</label>
                    <select style={inputStyle} value={form.qualificationField} onChange={set('qualificationField')}>
                      <option value="">Select field...</option>
                      {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Country where you got your qualification *</label>
                    <input style={inputStyle} value={form.qualificationCountry} onChange={set('qualificationCountry')} placeholder="e.g. India, USA, Nigeria..." />
                  </div>
                  <div>
                    <label style={labelStyle}>Years of relevant work experience *</label>
                    <select style={inputStyle} value={form.experience} onChange={set('experience')}>
                      <option value="">Select...</option>
                      <option value="0">Less than 1 year</option>
                      <option value="1">1–2 years</option>
                      <option value="3">3–4 years</option>
                      <option value="5">5+ years</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={cardStyle}>
                <span style={secLabel}>🇩🇪 Germany Specifics</span>
                <div className="v-grid2" style={{ marginBottom: 14 }}>
                  <div>
                    <label style={labelStyle}>German language level</label>
                    <select style={inputStyle} value={form.germanLevel} onChange={set('germanLevel')}>
                      {GERMAN_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Target field in Germany *</label>
                    <select style={inputStyle} value={form.targetField} onChange={set('targetField')}>
                      <option value="">Select field...</option>
                      {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Job offer in Germany?</label>
                    <select style={inputStyle} value={form.hasJobOffer} onChange={set('hasJobOffer')}>
                      <option value="no">No — still searching</option>
                      <option value="yes">Yes — I have an offer</option>
                      <option value="process">In process / interviews</option>
                    </select>
                  </div>
                  {form.hasJobOffer === 'yes' && (
                    <div>
                      <label style={labelStyle}>Offered gross salary (€/year)</label>
                      <input type="number" style={inputStyle} value={form.offeredSalary} onChange={set('offeredSalary')} placeholder="e.g. 55000" />
                    </div>
                  )}
                  <div>
                    <label style={labelStyle}>Previous connection to Germany</label>
                    <select style={inputStyle} value={form.germanyConnection} onChange={set('germanyConnection')}>
                      <option value="none">None</option>
                      <option value="studied">Studied in Germany</option>
                      <option value="worked">Worked in Germany before</option>
                      <option value="family">Have family in Germany</option>
                      <option value="lived">Lived in Germany before</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => canSubmit && setStep(2)} disabled={!canSubmit}
                  style={{ padding: '12px 32px', borderRadius: 10, background: !canSubmit ? '#ccc' : `linear-gradient(135deg,${accent},#e67300)`, color: !canSubmit ? '#888' : '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: !canSubmit ? 'not-allowed' : 'pointer', fontFamily: "'Outfit',sans-serif" }}>
                  Review answers →
                </button>
              </div>
            </>
          )}

          {/* ── STEP 2: Review ── */}
          {step === 2 && (
            <>
              <div style={cardStyle}>
                <div style={{ fontSize: 14, fontWeight: 700, color: navy, marginBottom: 16, fontFamily: "'Outfit',sans-serif" }}>Review your profile before analysis</div>
                <div className="v-grid2" style={{ gap: 10 }}>
                  {[
                    ['Citizenship', form.citizenship + (form.isEU ? ' 🇪🇺 EU' : '')],
                    ['Age', form.age],
                    ['Qualification', QUALIFICATIONS.find(q => q.value === form.qualification)?.label || ''],
                    ['Field of Study', form.qualificationField],
                    ['Qualified In', form.qualificationCountry],
                    ['Experience', form.experience === '5' ? '5+ years' : `${form.experience} year(s)`],
                    ['German Level', form.germanLevel === 'none' ? 'None' : form.germanLevel],
                    ['Target Field', form.targetField],
                    ['Job Offer', form.hasJobOffer === 'yes' ? `Yes — €${form.offeredSalary || '?'}/yr` : form.hasJobOffer === 'process' ? 'In progress' : 'No'],
                    ['Germany Link', form.germanyConnection === 'none' ? 'None' : form.germanyConnection],
                  ].map(([k, v]) => (
                    <div key={k} style={{ padding: '10px 12px', borderRadius: 8, background: '#f8fafc', border: '1px solid #edf1f6' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#9aafbc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{k}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2332' }}>{v || '—'}</div>
                    </div>
                  ))}
                </div>
                {error && <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: '#fff0f0', border: '1px solid #fca5a5', color: red, fontSize: 13 }}>{error}</div>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <button onClick={() => setStep(1)}
                  style={{ padding: '11px 24px', borderRadius: 10, border: '1px solid #dce4ef', background: '#fff', color: '#6b7c93', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ← Edit
                </button>
                <button onClick={analyse} disabled={loading}
                  style={{ padding: '11px 32px', borderRadius: 10, background: loading ? '#ccc' : `linear-gradient(135deg,${accent},#e67300)`, color: loading ? '#888' : '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Outfit',sans-serif" }}>
                  {loading ? '🔍 Analysing...' : '🔍 Check Eligibility (1 credit) →'}
                </button>
              </div>
            </>
          )}

          {/* ── STEP 3: Results ── */}
          {step === 3 && result && (
            <>
              {/* Session banner + download */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderRadius: 10, background: '#fff8ee', border: '1px solid #fed7aa', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#92400e', fontWeight: 500 }}>💾 Results saved for this session — they'll be here if you navigate away and come back.</span>
                <button onClick={() => downloadVisaReport(result, form)}
                  style={{ padding: '7px 16px', borderRadius: 8, background: `linear-gradient(135deg,${accent},#e67300)`, color: '#fff', fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'Outfit',sans-serif" }}>
                  ↓ Download PDF Report
                </button>
              </div>

              {/* EU fast-track */}
              {result.isEU && (
                <div style={{ ...cardStyle, borderLeft: `4px solid ${green}`, background: '#f0fdf4' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: green, marginBottom: 6, fontFamily: "'Outfit',sans-serif" }}>🇪🇺 Free Movement — No Visa Required</div>
                  <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.65 }}>{result.euNote}</p>
                </div>
              )}

              {/* Summary */}
              <div style={{ ...cardStyle, borderLeft: `4px solid ${accent}` }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: navy, marginBottom: 8, fontFamily: "'Outfit',sans-serif" }}>📋 Your situation — plain English</div>
                <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, margin: 0 }}>{result.summary}</p>
                {result.chancenkartePoints !== null && (
                  <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: result.chancenkartePoints >= 6 ? '#f0fdf4' : '#fef9ec', border: `1px solid ${result.chancenkartePoints >= 6 ? '#bbf7d0' : '#fde68a'}` }}>
                    <span style={{ fontSize: 18 }}>⭐</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: result.chancenkartePoints >= 6 ? green : amber }}>
                      Chancenkarte: {result.chancenkartePoints} / 6+ points {result.chancenkartePoints >= 6 ? '✓ Eligible' : '— need more points'}
                    </span>
                  </div>
                )}
              </div>

              {/* Urgent warnings */}
              {result.urgentWarnings?.length > 0 && (
                <div style={{ ...cardStyle, borderLeft: `4px solid ${red}`, background: '#fff8f8' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: red, marginBottom: 8, fontFamily: "'Outfit',sans-serif" }}>⚠️ Important — read before proceeding</div>
                  {result.urgentWarnings.map((w, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', fontSize: 13, color: '#374151' }}>
                      <span style={{ flexShrink: 0, color: red }}>!</span>{w}
                    </div>
                  ))}
                </div>
              )}

              {/* Visa options */}
              <div style={{ fontSize: 14, fontWeight: 700, color: navy, fontFamily: "'Outfit',sans-serif", marginBottom: 12 }}>Visa paths — ranked by match</div>
              {[...result.visaOptions].sort((a, b) => b.matchScore - a.matchScore).map(opt => {
                const cfg = ELIGIBILITY_CONFIG[opt.eligibility]
                const isRec = opt.id === result.recommendedPath
                return (
                  <div key={opt.id} className="v-visa-card" style={{ ...cardStyle, borderLeft: `4px solid ${cfg.color}`, position: 'relative', ...(isRec ? { border: `2px solid ${accent}`, boxShadow: `0 4px 20px rgba(255,153,51,0.15)` } : {}) }}>
                    {isRec && (
                      <div style={{ position: 'absolute', top: 14, right: 16, fontSize: 10, fontWeight: 700, color: accent, background: accent + '20', padding: '3px 10px', borderRadius: 20 }}>
                        ⭐ Recommended path
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 28, flexShrink: 0 }}>{opt.emoji}</div>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, color: navy }}>{opt.title}</div>
                          <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontWeight: 700 }}>
                            {cfg.icon} {cfg.label}
                          </span>
                          <span style={{ fontSize: 11, color: '#9aafbc' }}>⏱ {opt.timeline}</span>
                        </div>
                        <p style={{ fontSize: 13, color: '#374151', margin: '0 0 10px', lineHeight: 1.6 }}>{opt.headline}</p>

                        {/* Score bar */}
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: '#9aafbc' }}>Match score</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>{opt.matchScore}%</span>
                          </div>
                          <div style={{ height: 6, background: '#f0f4f8', borderRadius: 3 }}>
                            <div style={{ height: '100%', width: `${opt.matchScore}%`, background: cfg.color, borderRadius: 3, transition: 'width .5s' }} />
                          </div>
                        </div>

                        <div className="v-grid2" style={{ gap: 10, marginBottom: 10 }}>
                          {opt.metRequirements.length > 0 && (
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: green, marginBottom: 5 }}>✓ Requirements met</div>
                              {opt.metRequirements.map((r, i) => <div key={i} style={{ fontSize: 12, color: '#374151', padding: '2px 0' }}>• {r}</div>)}
                            </div>
                          )}
                          {opt.missingRequirements.length > 0 && (
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: amber, marginBottom: 5 }}>○ Still needed</div>
                              {opt.missingRequirements.map((r, i) => <div key={i} style={{ fontSize: 12, color: '#374151', padding: '2px 0' }}>• {r}</div>)}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12 }}>
                          <div style={{ padding: '6px 12px', borderRadius: 8, background: purple + '10', color: purple, fontWeight: 600 }}>💡 {opt.keyAdvantage}</div>
                          <div style={{ padding: '6px 12px', borderRadius: 8, background: accent + '15', color: '#c2410c', fontWeight: 600 }}>→ Next: {opt.nextStep}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Qualification recognition */}
              {result.qualificationRecognitionNeeded && (
                <div style={{ ...cardStyle, borderLeft: `4px solid ${amber}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: amber, marginBottom: 6, fontFamily: "'Outfit',sans-serif" }}>📜 Qualification Recognition (Anerkennung) Required</div>
                  <p style={{ fontSize: 13, color: '#374151', margin: '0 0 8px', lineHeight: 1.6 }}>
                    Your qualification needs to be officially recognised in Germany before most visa types can be granted. This is a key first step and can run in parallel with your job search.
                  </p>
                  {result.recognitionBody && (
                    <div style={{ fontSize: 13, color: '#374151' }}>
                      Relevant authority: <strong>{result.recognitionBody}</strong>
                    </div>
                  )}
                  <a href="https://www.anerkennung-in-deutschland.de/html/en/index.php" target="_blank" rel="noopener noreferrer" className="v-link" style={{ display: 'inline-block', marginTop: 8, fontSize: 12 }}>
                    → Check recognition on anerkennung-in-deutschland.de ↗
                  </a>
                </div>
              )}

              {/* Document checklist */}
              {result.documents?.length > 0 && (
                <div style={cardStyle}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: navy, marginBottom: 14, fontFamily: "'Outfit',sans-serif" }}>📁 Your personalised document checklist</div>
                  {result.documents.map(doc => (
                    <div key={doc.category} style={{ marginBottom: 8, border: '1px solid #edf1f6', borderRadius: 10, overflow: 'hidden' }}>
                      <button onClick={() => setOpenDoc(openDoc === doc.category ? null : doc.category)}
                        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: openDoc === doc.category ? accent + '10' : '#f8fafc', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: navy }}>{doc.category}</span>
                        <span style={{ fontSize: 12, color: '#9aafbc' }}>{openDoc === doc.category ? '▲' : `${doc.items.length} items ▼`}</span>
                      </button>
                      {openDoc === doc.category && (
                        <div style={{ padding: '10px 16px 14px' }}>
                          {doc.items.map((item, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '5px 0', fontSize: 13, color: '#374151' }}>
                              <span style={{ color: '#dce4ef', fontSize: 16, flexShrink: 0 }}>□</span>{item}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Useful links */}
              {result.usefulLinks?.length > 0 && (
                <div style={cardStyle}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: navy, marginBottom: 12, fontFamily: "'Outfit',sans-serif" }}>🔗 Official resources</div>
                  <div className="v-grid2" style={{ gap: 8 }}>
                    {result.usefulLinks.map(link => (
                      <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 9, border: '1px solid #edf1f6', background: '#f8fafc', textDecoration: 'none', color: navy, fontSize: 12, fontWeight: 600, transition: 'all .15s' }}>
                        <span style={{ fontSize: 16 }}>↗</span>{link.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Start again */}
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <button onClick={() => { try { sessionStorage.removeItem(SS.visaResult) } catch {} setStep(1); setForm(EMPTY_FORM); setResult(null) }}
                  style={{ fontSize: 12, color: '#9aafbc', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                  Start a new check
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
