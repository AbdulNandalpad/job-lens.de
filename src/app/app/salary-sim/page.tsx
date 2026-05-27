'use client'

import { useState, useRef, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { theme } from '@/lib/theme'
import { API, CREDIT_COST, MARKET } from '@/lib/constants'

const { colors: c, fonts: f, gradients: g } = theme

interface Msg { role: 'user' | 'assistant'; content: string }
interface Debrief {
  final_amount: number; improvement: number; improvement_pct: number
  outcome: 'win' | 'partial' | 'loss'; tactics_used: string[]
  what_worked: string[]; what_to_improve: string[]
  overall_score: number; verdict: string
}

const OUTCOME_CONFIG = {
  win:     { label: 'Strong Win',   color: '#1D9E75', bg: 'rgba(29,158,117,0.12)' },
  partial: { label: 'Partial Win',  color: '#D97706', bg: 'rgba(217,119,6,0.12)'  },
  loss:    { label: 'Held Firm',    color: '#DC2626', bg: 'rgba(220,38,38,0.12)'  },
}

function fmt(n: number, currency: string) {
  return `${currency}${Math.round(n).toLocaleString()}`
}

export default function SalarySimPage() {
  // Setup
  const [role,      setRole]    = useState('')
  const [company,   setCompany] = useState('')
  const [offer,     setOffer]   = useState('')
  const [target,    setTarget]  = useState('')
  const currency = '€'

  // Session
  const [phase,   setPhase]   = useState<'setup' | 'chat' | 'debrief'>('setup')
  const [msgs,    setMsgs]    = useState<Msg[]>([])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [debrief, setDebrief] = useState<Debrief | null>(null)
  const [debriefLoading, setDebriefLoading] = useState(false)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const isFirstRef = useRef(true)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])
  useEffect(() => { if (phase === 'chat') setTimeout(() => inputRef.current?.focus(), 100) }, [phase])

  async function startNegotiation() {
    if (!role.trim()) { setError('Please enter the role'); return }
    const offerNum  = parseFloat(offer.replace(/[^0-9.]/g, ''))
    const targetNum = parseFloat(target.replace(/[^0-9.]/g, ''))
    if (!offerNum || offerNum <= 0) { setError('Please enter a valid offer amount'); return }
    if (!targetNum || targetNum <= offerNum) { setError('Target must be higher than the current offer'); return }
    setError('')

    // Opening message from HR
    const opening: Msg = {
      role: 'assistant',
      content: `Hi! I'm Alex from HR at ${company || 'the company'}. Thanks for taking the time to discuss your offer. We're excited to bring you on as ${role}. We'd like to confirm the compensation package we discussed — ${fmt(offerNum, currency)} per year. How are you feeling about this?`,
    }
    setMsgs([opening])
    setPhase('chat')
  }

  async function send() {
    if (!input.trim() || loading) return
    const offerNum  = parseFloat(offer.replace(/[^0-9.]/g, ''))
    const targetNum = parseFloat(target.replace(/[^0-9.]/g, ''))

    const userMsg: Msg = { role: 'user', content: input.trim() }
    const history = [...msgs, userMsg]
    setMsgs(history)
    setInput('')
    setLoading(true)

    const idx = history.length
    setMsgs(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch(API.salarySim, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          role, company, offer: offerNum, target: targetNum, currency,
          market: MARKET.eu,
          isFirst: isFirstRef.current,
        }),
      })
      isFirstRef.current = false

      if (res.status === 402) {
        const d = await res.json()
        setMsgs(prev => { const cp = [...prev]; cp[idx] = { role: 'assistant', content: `Insufficient credits. You need ${CREDIT_COST.salarySim} credit to start a session.` }; return cp })
        setLoading(false); return
      }
      if (!res.ok || !res.body) throw new Error('Failed')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let assembled = '', buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (payload === '[DONE]') continue
          try {
            const evt = JSON.parse(payload)
            if (evt.text) {
              assembled += evt.text
              setMsgs(prev => { const cp = [...prev]; cp[idx] = { role: 'assistant', content: assembled }; return cp })
            }
          } catch { /* ignore */ }
        }
      }
    } catch {
      setMsgs(prev => { const cp = [...prev]; cp[idx] = { role: 'assistant', content: 'Connection error. Please try again.' }; return cp })
    }
    setLoading(false)
    inputRef.current?.focus()
  }

  async function getDebrief() {
    const offerNum  = parseFloat(offer.replace(/[^0-9.]/g, ''))
    const targetNum = parseFloat(target.replace(/[^0-9.]/g, ''))
    setDebriefLoading(true)
    try {
      const res = await fetch(API.salarySim, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: msgs.filter(m => m.content),
          role, company, offer: offerNum, target: targetNum, currency,
          market: MARKET.eu, isFirst: false, debrief: true,
        }),
      })
      const data = await res.json()
      if (res.ok) { setDebrief(data); setPhase('debrief') }
    } catch { /* ignore */ }
    setDebriefLoading(false)
  }

  const offerNum  = parseFloat(offer.replace(/[^0-9.]/g, '')) || 0
  const targetNum = parseFloat(target.replace(/[^0-9.]/g, '')) || 0

  return (
    <div style={{ minHeight: '100vh', background: c.bg, fontFamily: f.body }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        .ss-input:focus { outline: none; }
        .ss-send:hover:not(:disabled) { opacity: .85; }
        .ss-send:disabled { opacity: .4; cursor: not-allowed; }
        @keyframes ss-dot { 0%,60%,100%{opacity:.3;transform:translateY(0)} 30%{opacity:1;transform:translateY(-4px)} }
      `}</style>
      <Navbar />

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>

        {/* Page header */}
        <div style={{ paddingLeft: 14, borderLeft: `3px solid ${c.accent}`, marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: c.primary, fontFamily: f.heading }}>Salary Negotiation Simulator</div>
          <div style={{ fontSize: 13, color: c.textMuted, marginTop: 3 }}>
            Practice negotiating with an AI hiring manager · Real pushback · Instant debrief
            <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, color: c.accent, background: `${c.accent}18`, padding: '2px 8px', borderRadius: 20 }}>
              {CREDIT_COST.salarySim} credit
            </span>
          </div>
        </div>

        {/* ── SETUP PHASE ── */}
        {phase === 'setup' && (
          <div style={{ background: '#fff', border: `1px solid ${c.border}`, borderRadius: 16, padding: 28 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: c.primary, marginBottom: 20, fontFamily: f.heading }}>
              Set up your negotiation scenario
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, marginBottom: 6 }}>Role *</div>
                <input value={role} onChange={e => setRole(e.target.value)}
                  placeholder="e.g. Senior Software Engineer"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${c.borderLight}`, fontSize: 13, fontFamily: f.body, color: c.text, outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, marginBottom: 6 }}>Company (optional)</div>
                <input value={company} onChange={e => setCompany(e.target.value)}
                  placeholder="e.g. Zalando"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${c.borderLight}`, fontSize: 13, fontFamily: f.body, color: c.text, outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, marginBottom: 6 }}>Their offer (€ / year) *</div>
                <input type="number" value={offer} onChange={e => setOffer(e.target.value)}
                  placeholder="e.g. 75000"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${c.borderLight}`, fontSize: 13, fontFamily: f.body, color: c.text, outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, marginBottom: 6 }}>Your target (€ / year) *</div>
                <input type="number" value={target} onChange={e => setTarget(e.target.value)}
                  placeholder="e.g. 90000"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${c.borderLight}`, fontSize: 13, fontFamily: f.body, color: c.text, outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
            </div>

            {offerNum > 0 && targetNum > offerNum && (
              <div style={{ marginBottom: 20, padding: '12px 16px', background: c.primaryLight, borderRadius: 10, fontSize: 13, color: c.navy }}>
                Gap to close: <strong>{fmt(targetNum - offerNum, currency)}</strong> ({Math.round((targetNum - offerNum) / offerNum * 100)}% increase)
              </div>
            )}

            {error && <div style={{ fontSize: 12, color: c.danger, marginBottom: 14 }}>{error}</div>}

            <button onClick={startNegotiation}
              style={{ padding: '11px 32px', borderRadius: 10, background: g.primaryBtn, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: f.heading, fontSize: 14, fontWeight: 700 }}>
              Start Negotiation →
            </button>

            <div style={{ marginTop: 16, fontSize: 12, color: c.textMuted, lineHeight: 1.6 }}>
              💡 <strong>Tip:</strong> The AI hiring manager has a hidden budget ceiling — they can go higher than the initial offer, but you have to push for it. Try anchoring high, citing market data, or mentioning competing offers.
            </div>
          </div>
        )}

        {/* ── CHAT PHASE ── */}
        {phase === 'chat' && (
          <div style={{ background: '#fff', border: `1px solid ${c.border}`, borderRadius: 16, overflow: 'hidden' }}>

            {/* Chat header */}
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: c.primary }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: g.primaryBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>👔</div>
                <div>
                  <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: f.heading }}>Alex · HR Manager{company ? ` @ ${company}` : ''}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{role} · Offer: {fmt(offerNum, currency)}/yr · Your target: {fmt(targetNum, currency)}/yr</div>
                </div>
              </div>
              <button onClick={getDebrief} disabled={debriefLoading || msgs.length < 3}
                style={{ padding: '7px 16px', borderRadius: 8, background: debriefLoading ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: msgs.length < 3 ? 'not-allowed' : 'pointer', fontFamily: f.body, opacity: msgs.length < 3 ? 0.5 : 1 }}>
                {debriefLoading ? 'Analysing…' : 'End & Debrief'}
              </button>
            </div>

            {/* Messages */}
            <div style={{ height: 420, overflowY: 'auto', padding: '20px 20px 8px' }}>
              {msgs.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 14, gap: 8, alignItems: 'flex-end' }}>
                  {m.role === 'assistant' && (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: g.primaryBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>👔</div>
                  )}
                  <div style={{
                    maxWidth: '75%', padding: '10px 14px', fontSize: 14, lineHeight: 1.6,
                    borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                    background: m.role === 'user' ? g.primaryBtn : c.bgSubtle,
                    border: m.role === 'assistant' ? `1px solid ${c.border}` : 'none',
                    color: m.role === 'user' ? '#fff' : c.text,
                  }}>
                    {m.content === '' && i === msgs.length - 1
                      ? <span style={{ display: 'inline-flex', gap: 3 }}>
                          {[0,1,2].map(j => <span key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: c.accent, display: 'inline-block', animation: `ss-dot 1.2s ease-in-out ${j*.2}s infinite` }}/>)}
                        </span>
                      : <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
                    }
                  </div>
                </div>
              ))}
              <div ref={bottomRef}/>
            </div>

            {/* Input */}
            <div style={{ padding: '12px 16px 16px', borderTop: `1px solid ${c.border}` }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', background: c.bgSubtle, border: `1px solid ${c.borderLight}`, borderRadius: 12, padding: '8px 10px' }}>
                <textarea ref={inputRef} className="ss-input"
                  value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder="Make your counter-offer or respond to Alex…"
                  rows={2} disabled={loading}
                  style={{ flex: 1, resize: 'none', border: 'none', background: 'transparent', fontFamily: f.body, fontSize: 14, color: c.text, lineHeight: 1.5, maxHeight: 100, overflowY: 'auto' }} />
                <button className="ss-send" onClick={send} disabled={!input.trim() || loading}
                  style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: g.primaryBtn, color: '#fff', cursor: 'pointer', fontSize: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ↑
                </button>
              </div>
              <div style={{ marginTop: 6, textAlign: 'center', fontSize: 11, color: c.textFaint }}>
                Enter to send · Try: &quot;I have a competing offer at {fmt(Math.round(targetNum * 0.95), currency)}…&quot; · &quot;Based on market data for Berlin…&quot;
              </div>
            </div>
          </div>
        )}

        {/* ── DEBRIEF PHASE ── */}
        {phase === 'debrief' && debrief && (() => {
          const oc  = OUTCOME_CONFIG[debrief.outcome]
          const pct = debrief.improvement_pct
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Outcome hero */}
              <div style={{ background: '#fff', border: `1px solid ${c.border}`, borderRadius: 16, padding: 28, textAlign: 'center' }}>
                <div style={{ display: 'inline-block', padding: '6px 20px', borderRadius: 20, background: oc.bg, color: oc.color, fontSize: 13, fontWeight: 700, marginBottom: 16, fontFamily: f.heading }}>
                  {oc.label}
                </div>
                <div style={{ fontFamily: f.heading, fontSize: 28, fontWeight: 700, color: c.primary, marginBottom: 6 }}>
                  {debrief.overall_score}/10
                </div>
                <div style={{ fontSize: 14, color: c.textMuted, marginBottom: 20, maxWidth: 480, margin: '0 auto 20px' }}>{debrief.verdict}</div>

                {/* Score bar */}
                <div style={{ maxWidth: 340, margin: '0 auto 20px' }}>
                  <div style={{ height: 8, borderRadius: 4, background: c.borderLight }}>
                    <div style={{ height: 8, borderRadius: 4, background: oc.color, width: `${debrief.overall_score * 10}%`, transition: 'width .6s ease' }}/>
                  </div>
                </div>

                {/* Money summary */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Initial offer', value: fmt(offerNum, currency), color: c.textMuted },
                    { label: 'Estimated result', value: fmt(debrief.final_amount, currency), color: oc.color },
                    { label: 'Gained', value: `${pct > 0 ? '+' : ''}${fmt(debrief.improvement, currency)} (${pct.toFixed(1)}%)`, color: oc.color },
                  ].map(item => (
                    <div key={item.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: c.textMuted, marginBottom: 4 }}>{item.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: item.color, fontFamily: f.heading }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths + improvements */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ background: '#fff', border: `1px solid ${c.border}`, borderRadius: 14, padding: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1D9E75', letterSpacing: 0.6, textTransform: 'uppercase' as const, marginBottom: 12 }}>✓ What worked</div>
                  {debrief.what_worked.map((s, i) => (
                    <div key={i} style={{ fontSize: 13, color: c.text, marginBottom: 8, paddingLeft: 10, borderLeft: '2px solid #1D9E75', lineHeight: 1.5 }}>{s}</div>
                  ))}
                </div>
                <div style={{ background: '#fff', border: `1px solid ${c.border}`, borderRadius: 14, padding: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#D97706', letterSpacing: 0.6, textTransform: 'uppercase' as const, marginBottom: 12 }}>↑ Next time</div>
                  {debrief.what_to_improve.map((s, i) => (
                    <div key={i} style={{ fontSize: 13, color: c.text, marginBottom: 8, paddingLeft: 10, borderLeft: '2px solid #D97706', lineHeight: 1.5 }}>{s}</div>
                  ))}
                </div>
              </div>

              {/* Tactics */}
              {debrief.tactics_used.length > 0 && (
                <div style={{ background: '#fff', border: `1px solid ${c.border}`, borderRadius: 14, padding: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: c.accent, letterSpacing: 0.6, textTransform: 'uppercase' as const, marginBottom: 12 }}>Tactics you used</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {debrief.tactics_used.map((t, i) => (
                      <span key={i} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: `${c.accent}12`, border: `1px solid ${c.accent}33`, color: c.accent, fontWeight: 600 }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Retry */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button onClick={() => { setPhase('setup'); setMsgs([]); setDebrief(null); isFirstRef.current = true }}
                  style={{ padding: '11px 28px', borderRadius: 10, background: g.primaryBtn, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: f.heading, fontSize: 14, fontWeight: 700 }}>
                  Practice Again →
                </button>
                <button onClick={() => { setPhase('chat'); setDebrief(null) }}
                  style={{ padding: '11px 20px', borderRadius: 10, background: c.primaryLight, color: c.navy, border: 'none', cursor: 'pointer', fontFamily: f.heading, fontSize: 14, fontWeight: 600 }}>
                  Review Transcript
                </button>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
