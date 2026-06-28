'use client'

import { useState } from 'react'
import { useLanguage } from '@/lib/i18n'

export default function AutoApplyDemoForm() {
  const { lang } = useLanguage()
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    linkedin: '', coverLetter: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.id]: e.target.value }))
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: 24 }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Outfit:wght@600;700&display=swap');`}</style>
        <div style={{ textAlign: 'center', maxWidth: 440 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#dcfce7', border: '2px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 32 }}>
            ✓
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', fontFamily: "'Outfit', sans-serif", marginBottom: 10 }}>
            {lang === 'DE' ? 'Bewerbung eingereicht!' : 'Application Submitted!'}
          </div>
          <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 24 }}>
            {lang === 'DE'
              ? 'Dies war ein Sandbox-Demo-Formular. Es wurden keine Daten gespeichert. Auto-Bewerbung hat erfolgreich navigiert, die Felder gelesen, deinen Lebenslauf zugeordnet und abgesendet — genau wie bei echten Bewerbungen.'
              : 'This was a sandbox demo form. No data was stored. Auto Apply successfully navigated, read the fields, mapped your CV and submitted — exactly what it does on real job applications.'}
          </div>
          <div style={{ fontSize: 13, padding: '12px 16px', background: '#f1f5f9', borderRadius: 10, color: '#475569', lineHeight: 1.6 }}>
            {lang === 'DE'
              ? '🎉 Bereit, Auto-Bewerbung für einen echten Job zu nutzen? Gehe zurück zu Job-Lens und füge eine echte Bewerbungs-URL ein.'
              : '🎉 Ready to use Auto Apply on a real job? Go back to Job-Lens and paste any live application URL.'}
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
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Outfit:wght@600;700&display=swap');
        .df-input:focus { border-color: #378ADD !important; }
        .df-input::placeholder { color: #94a3b8; }
      `}</style>

      {/* Demo banner */}
      <div style={{ background: '#1e3a5f', color: '#93c5fd', fontSize: 12, fontWeight: 600, textAlign: 'center', padding: '8px 16px', letterSpacing: 0.5 }}>
        {lang === 'DE' ? '🧪 SANDBOX-DEMO-FORMULAR — Es werden keine Daten gespeichert. Dieses Formular dient nur zum Testen der Auto-Bewerbung.' : '🧪 SANDBOX DEMO FORM — No data is stored. This form exists only for Auto Apply testing.'}
      </div>

      {/* ATS-style header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '20px 0' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, #0070f3, #00c4cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>
            S
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
              Senior Software Engineer — Berlin
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Siemens AG · Full-time · Berlin, Germany</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 11, padding: '4px 12px', borderRadius: 20, background: '#dcfce7', color: '#15803d', fontWeight: 600 }}>
            {lang === 'DE' ? 'Jetzt bewerben' : 'Apply Now'}
          </div>
        </div>
      </div>

      {/* Form */}
      <div style={{ maxWidth: 700, margin: '32px auto', padding: '0 24px 48px' }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>

          <div style={{ padding: '20px 28px', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
              {lang === 'DE' ? 'Persönliche Angaben' : 'Personal Information'}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>{lang === 'DE' ? 'Pflichtfelder sind mit * markiert' : 'Fields marked * are required'}</div>
          </div>

          <form onSubmit={e => { e.preventDefault(); setSubmitted(true) }} style={{ padding: '28px' }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div>
                <label htmlFor="firstName" style={label}>{lang === 'DE' ? 'Vorname *' : 'First Name *'}</label>
                <input id="firstName" className="df-input" style={field} placeholder="Thomas" value={form.firstName} onChange={handleChange} required />
              </div>
              <div>
                <label htmlFor="lastName" style={label}>{lang === 'DE' ? 'Nachname *' : 'Last Name *'}</label>
                <input id="lastName" className="df-input" style={field} placeholder="Müller" value={form.lastName} onChange={handleChange} required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div>
                <label htmlFor="email" style={label}>{lang === 'DE' ? 'E-Mail-Adresse *' : 'Email Address *'}</label>
                <input id="email" type="email" className="df-input" style={field} placeholder="thomas@email.de" value={form.email} onChange={handleChange} required />
              </div>
              <div>
                <label htmlFor="phone" style={label}>{lang === 'DE' ? 'Telefonnummer' : 'Phone Number'}</label>
                <input id="phone" type="tel" className="df-input" style={field} placeholder="+49 89 1234 5678" value={form.phone} onChange={handleChange} />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label htmlFor="linkedin" style={label}>{lang === 'DE' ? 'LinkedIn-Profil-URL' : 'LinkedIn Profile URL'}</label>
              <input id="linkedin" type="url" className="df-input" style={field} placeholder="https://linkedin.com/in/yourname" value={form.linkedin} onChange={handleChange} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label htmlFor="resume" style={label}>{lang === 'DE' ? 'Lebenslauf *' : 'Resume / CV *'}</label>
              <input id="resume" type="file" accept=".pdf,.doc,.docx,.txt" className="df-input" style={{ ...field, padding: '8px 14px', cursor: 'pointer' }} required />
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{lang === 'DE' ? 'PDF, DOC, DOCX oder TXT · max. 10 MB' : 'PDF, DOC, DOCX or TXT · max 10 MB'}</div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <label htmlFor="coverLetter" style={label}>{lang === 'DE' ? 'Anschreiben' : 'Cover Letter'}</label>
              <textarea
                id="coverLetter" className="df-input" rows={5}
                style={{ ...field, resize: 'vertical', minHeight: 110 }}
                placeholder="Dear Siemens Team, I am excited to apply for this position…"
                value={form.coverLetter}
                onChange={handleChange}
              />
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="submit"
                style={{ padding: '12px 32px', borderRadius: 10, background: 'linear-gradient(135deg, #378ADD, #185FA5)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: "'Outfit', sans-serif" }}
              >
                {lang === 'DE' ? 'Bewerbung einreichen →' : 'Submit Application →'}
              </button>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                {lang === 'DE' ? 'Mit der Bewerbung stimmst du unserer Demo-Datenschutzerklärung zu.' : 'By applying you agree to our demo privacy policy.'}
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
