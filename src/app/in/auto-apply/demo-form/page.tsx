'use client'

import { useState } from 'react'

export default function InAutoApplyDemoForm() {
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', currentCtc: '', expectedCtc: '', noticePeriod: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.id]: e.target.value }))
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: 24 }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Outfit:wght@600;700&display=swap');`}</style>
        <div style={{ textAlign: 'center', maxWidth: 440 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#dcfce7', border: '2px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 32 }}>
            ✓
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', fontFamily: "'Outfit', sans-serif", marginBottom: 10 }}>
            Application Submitted!
          </div>
          <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 24 }}>
            This was a sandbox demo form. No data was stored. Auto Apply successfully navigated, read the fields, mapped your profile and submitted — exactly what it does on real job applications.
          </div>
          <div style={{ fontSize: 13, padding: '12px 16px', background: '#fff3e0', borderRadius: 10, color: '#92400e', lineHeight: 1.6 }}>
            🎉 Ready to use Auto Apply on a real job? Go back to Job-Lens India and paste any live application URL.
          </div>
        </div>
      </div>
    )
  }

  const field: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1.5px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box', color: '#0f172a',
    background: '#fff', transition: 'border-color 0.15s',
  }
  const label: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff8f0', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Outfit:wght@600;700&display=swap');
        .df-input:focus { border-color: #FF9933 !important; }
        .df-input::placeholder { color: #94a3b8; }
      `}</style>

      {/* Demo banner */}
      <div style={{ background: '#7c2d12', color: '#fed7aa', fontSize: 12, fontWeight: 600, textAlign: 'center', padding: '8px 16px', letterSpacing: 0.5 }}>
        🧪 SANDBOX DEMO FORM — No data is stored. This form exists only for Auto Apply testing.
      </div>

      {/* ATS-style header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '20px 0' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, #FF9933, #e07020)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>
            I
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
              Senior Software Engineer — Bangalore
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Infosys · Full-time · Bangalore, Karnataka</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 11, padding: '4px 12px', borderRadius: 20, background: '#fff3e0', color: '#c2410c', fontWeight: 600 }}>
            Apply Now
          </div>
        </div>
      </div>

      {/* Form */}
      <div style={{ maxWidth: 700, margin: '32px auto', padding: '0 24px 48px' }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>

          <div style={{ padding: '20px 28px', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
              Personal Information
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>Fields marked * are required</div>
          </div>

          <form onSubmit={e => { e.preventDefault(); setSubmitted(true) }} style={{ padding: '28px' }}>

            <div style={{ marginBottom: 20 }}>
              <label htmlFor="fullName" style={label}>Full Name *</label>
              <input id="fullName" className="df-input" style={field} placeholder="Priya Sharma" value={form.fullName} onChange={handleChange} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div>
                <label htmlFor="email" style={label}>Email Address *</label>
                <input id="email" type="email" className="df-input" style={field} placeholder="priya.sharma@gmail.com" value={form.email} onChange={handleChange} required />
              </div>
              <div>
                <label htmlFor="phone" style={label}>Phone Number *</label>
                <input id="phone" type="tel" className="df-input" style={field} placeholder="+91 98765 43210" value={form.phone} onChange={handleChange} required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div>
                <label htmlFor="currentCtc" style={label}>Current CTC (LPA) *</label>
                <input id="currentCtc" className="df-input" style={field} placeholder="12" value={form.currentCtc} onChange={handleChange} required />
              </div>
              <div>
                <label htmlFor="expectedCtc" style={label}>Expected CTC (LPA) *</label>
                <input id="expectedCtc" className="df-input" style={field} placeholder="18" value={form.expectedCtc} onChange={handleChange} required />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label htmlFor="noticePeriod" style={label}>Notice Period *</label>
              <select id="noticePeriod" className="df-input" style={{ ...field, cursor: 'pointer' }} value={form.noticePeriod} onChange={handleChange} required>
                <option value="">-- Select notice period --</option>
                <option value="Immediately">Immediately</option>
                <option value="15 days">15 days</option>
                <option value="30 days">30 days</option>
                <option value="45 days">45 days</option>
                <option value="60 days">60 days</option>
                <option value="90 days">90 days</option>
              </select>
            </div>

            <div style={{ marginBottom: 28 }}>
              <label htmlFor="resume" style={label}>Resume *</label>
              <input id="resume" type="file" accept=".pdf,.doc,.docx" className="df-input" style={{ ...field, padding: '8px 14px', cursor: 'pointer' }} required />
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>PDF or DOC · max 5 MB</div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="submit"
                style={{ padding: '12px 32px', borderRadius: 10, background: 'linear-gradient(135deg, #FF9933, #e07020)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: "'Outfit', sans-serif" }}
              >
                Submit Application →
              </button>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                By applying you agree to our demo privacy policy.
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
