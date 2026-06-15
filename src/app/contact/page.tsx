'use client'

import { useState } from 'react'
import Link from 'next/link'
import { c, f, g, sh } from '@/lib/theme'
import { API } from '@/lib/constants'

export default function ContactPage() {
  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      const res = await fetch(API.contact, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong — please try again.'); return }
      setDone(true)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setSending(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: '#f8fafc', border: `1px solid ${c.border}`,
    borderRadius: 8, padding: '11px 14px',
    fontSize: 14, fontFamily: f.body, color: c.text,
    outline: 'none',
  }

  return (
    <>
      <style>{`
        @keyframes cfFadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .cf-fade { animation: cfFadeUp 0.35s ease; }
        .cf-inp:focus { border-color: ${c.accent} !important; box-shadow: 0 0 0 3px rgba(55,138,221,0.12); }
      `}</style>

      <div style={{ minHeight: '100vh', background: c.bg, fontFamily: f.body }}>

        {/* Header */}
        <div style={{ padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${c.border}`, background: '#fff', position: 'sticky', top: 0, zIndex: 50 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
            <svg width="20" height="20" viewBox="0 0 44 44">
              <circle cx="20" cy="20" r="13" fill="none" stroke={c.accent} strokeWidth="2.5"/>
              <circle cx="20" cy="20" r="8"  fill="none" stroke={c.accentLight} strokeWidth="1.2"/>
              <circle cx="20" cy="20" r="3"  fill={c.accent}/>
              <line x1="28" y1="28" x2="36" y2="36" stroke={c.accent} strokeWidth="3" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: f.heading, fontSize: 14, fontWeight: 700, color: c.primary }}>
              Job-Lens <span style={{ color: c.accent }}>AI</span>
            </span>
          </Link>
          <Link href="/" style={{ fontSize: 13, color: c.accent, textDecoration: 'none', fontWeight: 500 }}>← Back</Link>
        </div>

        <div style={{ maxWidth: 560, margin: '0 auto', padding: '52px 20px 80px' }}>

          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: c.accent, margin: '0 0 8px' }}>
              Support
            </p>
            <h1 style={{ fontFamily: f.heading, fontSize: 26, fontWeight: 700, color: c.primary, margin: '0 0 8px' }}>
              Contact us
            </h1>
            <p style={{ fontSize: 14, color: c.textMuted, margin: 0, lineHeight: 1.7 }}>
              Something not working? Have a question? We usually reply within 1–2 business days.
            </p>
          </div>

          {done ? (
            <div className="cf-fade" style={{ textAlign: 'center', padding: '48px 24px', background: '#fff', border: `1px solid ${c.border}`, borderRadius: 14, boxShadow: sh.card }}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>✅</div>
              <h2 style={{ fontFamily: f.heading, fontSize: 20, fontWeight: 700, color: c.primary, margin: '0 0 10px' }}>Message sent!</h2>
              <p style={{ fontSize: 14, color: c.textMuted, lineHeight: 1.7, margin: '0 0 20px' }}>
                We've received your message and will get back to you at <strong>{email}</strong>.
              </p>
              <Link href="/" style={{ fontSize: 13, color: c.accent, textDecoration: 'none', fontWeight: 600 }}>← Back to Job-Lens</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="cf-fade" style={{ background: '#fff', border: `1px solid ${c.border}`, borderRadius: 14, padding: '28px 24px', boxShadow: sh.card, display: 'flex', flexDirection: 'column', gap: 16 }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, display: 'block', marginBottom: 5 }}>Name *</label>
                  <input className="cf-inp" required value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, display: 'block', marginBottom: 5 }}>Email *</label>
                  <input className="cf-inp" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inp} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, display: 'block', marginBottom: 5 }}>Subject</label>
                <input className="cf-inp" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Payment issue, feature request…" style={inp} />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, display: 'block', marginBottom: 5 }}>Message *</label>
                <textarea
                  className="cf-inp"
                  required
                  rows={6}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Describe the issue or question in as much detail as possible…"
                  style={{ ...inp, resize: 'vertical', minHeight: 130, lineHeight: 1.65 }}
                />
                <div style={{ fontSize: 11, color: c.textFaint, marginTop: 4, textAlign: 'right' }}>{message.length}/2000</div>
              </div>

              {error && (
                <p style={{ fontSize: 13, color: c.danger, margin: 0, padding: '10px 14px', background: 'rgba(226,75,74,0.06)', borderRadius: 7, border: '1px solid rgba(226,75,74,0.15)' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={sending}
                style={{ background: g.button, color: '#fff', border: 'none', borderRadius: 9, padding: '13px 0', fontSize: 14, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', fontFamily: f.heading, boxShadow: sh.glow, opacity: sending ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {sending ? (
                  <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Sending…</>
                ) : 'Send message →'}
              </button>

              <p style={{ fontSize: 11, color: c.textFaint, margin: 0, textAlign: 'center' }}>
                Or email us directly at{' '}
                <a href="mailto:munira.nandalpad@job-lens.de" style={{ color: c.accent, textDecoration: 'none' }}>
                  munira.nandalpad@job-lens.de
                </a>
              </p>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
