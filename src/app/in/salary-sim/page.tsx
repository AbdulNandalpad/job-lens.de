'use client'

import { useState, useRef, useEffect } from 'react'
import { API, CREDIT_COST, MARKET } from '@/lib/constants'
import SvgIcon from '@/components/SvgIcon'

const accent = '#FF9933'
const navy   = '#042C53'
const f = { body: "'DM Sans', sans-serif", heading: "'Outfit', sans-serif" }

interface Msg { role: 'user' | 'assistant'; content: string }
interface Debrief {
  final_amount: number; improvement: number; improvement_pct: number
  outcome: 'win' | 'partial' | 'loss'; tactics_used: string[]
  what_worked: string[]; what_to_improve: string[]
  overall_score: number; verdict: string
}

const OUTCOME_CONFIG = {
  win:     { label: 'Strong Win',  color: '#1D9E75', bg: 'rgba(29,158,117,0.12)' },
  partial: { label: 'Partial Win', color: '#D97706', bg: 'rgba(217,119,6,0.12)'  },
  loss:    { label: 'Held Firm',   color: '#DC2626', bg: 'rgba(220,38,38,0.12)'  },
}

// Format in lakhs for India
function fmtL(n: number) { return `₹${(n / 100000).toFixed(1)}L` }
function fmtFull(n: number) { return `₹${Math.round(n / 100000)} LPA` }

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid #dce4ef', fontSize: 13, fontFamily: f.body,
  outline: 'none', color: '#1a2332', background: '#fff', boxSizing: 'border-box',
}

export default function IndiaSalarySimPage() {
  const [role,    setRole]    = useState('')
  const [company, setCompany] = useState('')
  const [offer,   setOffer]   = useState('')   // in LPA
  const [target,  setTarget]  = useState('')   // in LPA

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

  // Convert LPA → raw number for API (multiply by 100000)
  const offerRaw  = (parseFloat(offer)  || 0) * 100000
  const targetRaw = (parseFloat(target) || 0) * 100000

  async function startNegotiation() {
    const offerLpa  = parseFloat(offer)
    const targetLpa = parseFloat(target)
    if (!role.trim()) { setError('Please enter the role'); return }
    if (!offerLpa || offerLpa <= 0) { setError('Please enter a valid offer (LPA)'); return }
    if (!targetLpa || targetLpa <= offerLpa) { setError('Target must be higher than current offer'); return }
    setError('')

    const opening: Msg = {
      role: 'assistant',
      content: `Hi! I'm Priya from HR at ${company || 'the company'}. Thanks for your time today. We're really excited to have you join us as ${role}. We've put together an offer of ${fmtFull(offerRaw)} CTC. How does that sound to you?`,
    }
    setMsgs([opening])
    setPhase('chat')
  }

  async function send() {
    if (!input.trim() || loading) return

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
          messages: history, role, company,
          offer: offerRaw, target: targetRaw,
          currency: '₹', market: MARKET.in,
          isFirst: isFirstRef.current,
        }),
      })
      isFirstRef.current = false

      if (res.status === 402) {
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
    setDebriefLoading(true)
    try {
      const res = await fetch(API.salarySim, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: msgs.filter(m => m.content),
          role, company, offer: offerRaw, target: targetRaw,
          currency: '₹', market: MARKET.in, isFirst: false, debrief: true,
        }),
      })
      const data = await res.json()
      if (res.ok) { setDebrief(data); setPhase('debrief') }
    } catch { /* ignore */ }
    setDebriefLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: f.body }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        .ss-input:focus { outline: none; }
        @keyframes ss-dot { 0%,60%,100%{opacity:.3;transform:translateY(0)} 30%{opacity:1;transform:translateY(-4px)} }
      `}</style>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>

        {/* Page header */}
        <div style={{ paddingLeft: 14, borderLeft: `3px solid ${accent}`, marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: navy, fontFamily: f.heading }}>Salary Negotiation Simulator</div>
          <div style={{ fontSize: 13, color: '#6b7c93', marginTop: 3 }}>
            Practice negotiating your CTC with an AI HR manager · Real pushback · Instant debrief
            <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, color: accent, background: 'rgba(255,153,51,0.12)', padding: '2px 8px', borderRadius: 20 }}>
              {CREDIT_COST.salarySim} credit
            </span>
          </div>
        </div>

        {/* ── SETUP ── */}
        {phase === 'setup' && (
          <div style={{ background: '#fff', border: '1px solid #edf1f6', borderRadius: 16, padding: 28 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: navy, marginBottom: 20, fontFamily: f.heading }}>
              Set up your negotiation scenario
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7c93', marginBottom: 6 }}>Role *</div>
                <input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Senior Software Engineer" style={inputStyle} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7c93', marginBottom: 6 }}>Company (optional)</div>
                <input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Infosys, TCS, Startup" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7c93', marginBottom: 6 }}>Their offer (LPA) *</div>
                <input type="number" value={offer} onChange={e => setOffer(e.target.value)} placeholder="e.g. 18" style={inputStyle} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7c93', marginBottom: 6 }}>Your target (LPA) *</div>
                <input type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="e.g. 24" style={inputStyle} />
              </div>
            </div>

            {offerRaw > 0 && targetRaw > offerRaw && (
              <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(255,153,51,0.08)', border: `1px solid rgba(255,153,51,0.25)`, borderRadius: 10, fontSize: 13, color: navy }}>
                Gap to close: <strong>{fmtL(targetRaw - offerRaw)}</strong> ({Math.round((targetRaw - offerRaw) / offerRaw * 100)}% increase)
              </div>
            )}

            {error && <div style={{ fontSize: 12, color: '#c53030', marginBottom: 14 }}>{error}</div>}

            <button onClick={startNegotiation}
              style={{ padding: '11px 32px', borderRadius: 10, background: `linear-gradient(135deg, ${accent}, #e67300)`, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: f.heading, fontSize: 14, fontWeight: 700 }}>
              Start Negotiation →
            </button>

            <div style={{ marginTop: 16, fontSize: 12, color: '#6b7c93', lineHeight: 1.6 }}>
              <SvgIcon name="bulb" size={13} color="#6b7c93" style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} /> <strong>Tip:</strong> Mention competing offers, your current CTC, or specific skills. The AI HR has a hidden ceiling — push for it!
            </div>
          </div>
        )}

        {/* ── CHAT ── */}
        {phase === 'chat' && (
          <div style={{ background: '#fff', border: '1px solid #edf1f6', borderRadius: 16, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: navy }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg,${accent},#e67300)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><SvgIcon name="briefcase" size={16} color="#fff" /></div>
                <div>
                  <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: f.heading }}>Priya · HR Manager{company ? ` @ ${company}` : ''}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{role} · Offer: {fmtL(offerRaw)} · Target: {fmtL(targetRaw)}</div>
                </div>
              </div>
              <button onClick={getDebrief} disabled={debriefLoading || msgs.length < 3}
                style={{ padding: '7px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: msgs.length < 3 ? 'not-allowed' : 'pointer', fontFamily: f.body, opacity: msgs.length < 3 ? 0.5 : 1 }}>
                {debriefLoading ? 'Analysing…' : 'End & Debrief'}
              </button>
            </div>

            {/* Messages */}
            <div style={{ height: 420, overflowY: 'auto', padding: '20px 20px 8px' }}>
              {msgs.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 14, gap: 8, alignItems: 'flex-end' }}>
                  {m.role === 'assistant' && (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg,${accent},#e67300)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><SvgIcon name="briefcase" size={13} color="#fff" /></div>
                  )}
                  <div style={{
                    maxWidth: '75%', padding: '10px 14px', fontSize: 14, lineHeight: 1.6,
                    borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                    background: m.role === 'user' ? `linear-gradient(135deg,${accent},#e67300)` : '#fafbfd',
                    border: m.role === 'assistant' ? '1px solid #edf1f6' : 'none',
                    color: m.role === 'user' ? '#fff' : '#1a2332',
                  }}>
                    {m.content === '' && i === msgs.length - 1
                      ? <span style={{ display: 'inline-flex', gap: 3 }}>
                          {[0,1,2].map(j => <span key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: accent, display: 'inline-block', animation: `ss-dot 1.2s ease-in-out ${j*.2}s infinite` }}/>)}
                        </span>
                      : <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
                    }
                  </div>
                </div>
              ))}
              <div ref={bottomRef}/>
            </div>

            {/* Input */}
            <div style={{ padding: '12px 16px 16px', borderTop: '1px solid #edf1f6' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', background: '#fafbfd', border: '1px solid #dce4ef', borderRadius: 12, padding: '8px 10px' }}>
                <textarea ref={inputRef} className="ss-input"
                  value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder="Make your counter-offer or respond to Priya…"
                  rows={2} disabled={loading}
                  style={{ flex: 1, resize: 'none', border: 'none', background: 'transparent', fontFamily: f.body, fontSize: 14, color: '#1a2332', lineHeight: 1.5, maxHeight: 100, overflowY: 'auto' }} />
                <button onClick={send} disabled={!input.trim() || loading}
                  style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: !input.trim() || loading ? '#dce4ef' : `linear-gradient(135deg,${accent},#e67300)`, color: '#fff', cursor: !input.trim() || loading ? 'not-allowed' : 'pointer', fontSize: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ↑
                </button>
              </div>
              <div style={{ marginTop: 6, textAlign: 'center', fontSize: 11, color: '#9aafbc' }}>
                Enter to send · Try: &quot;I have an offer from another company at {fmtL(Math.round(targetRaw * 0.93))}…&quot;
              </div>
            </div>
          </div>
        )}

        {/* ── DEBRIEF ── */}
        {phase === 'debrief' && debrief && (() => {
          const oc = OUTCOME_CONFIG[debrief.outcome]
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#fff', border: '1px solid #edf1f6', borderRadius: 16, padding: 28, textAlign: 'center' }}>
                <div style={{ display: 'inline-block', padding: '6px 20px', borderRadius: 20, background: oc.bg, color: oc.color, fontSize: 13, fontWeight: 700, marginBottom: 16, fontFamily: f.heading }}>
                  {oc.label}
                </div>
                <div style={{ fontFamily: f.heading, fontSize: 28, fontWeight: 700, color: navy, marginBottom: 6 }}>{debrief.overall_score}/10</div>
                <div style={{ fontSize: 14, color: '#6b7c93', marginBottom: 20 }}>{debrief.verdict}</div>
                <div style={{ maxWidth: 340, margin: '0 auto 20px' }}>
                  <div style={{ height: 8, borderRadius: 4, background: '#edf1f6' }}>
                    <div style={{ height: 8, borderRadius: 4, background: oc.color, width: `${debrief.overall_score * 10}%`, transition: 'width .6s ease' }}/>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Initial offer', value: fmtL(offerRaw) },
                    { label: 'Estimated result', value: fmtL(debrief.final_amount), color: oc.color },
                    { label: 'Gained', value: `+${fmtL(debrief.improvement)} (${debrief.improvement_pct.toFixed(1)}%)`, color: oc.color },
                  ].map(item => (
                    <div key={item.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#6b7c93', marginBottom: 4 }}>{item.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: item.color || navy, fontFamily: f.heading }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ background: '#fff', border: '1px solid #edf1f6', borderRadius: 14, padding: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1D9E75', letterSpacing: 0.6, textTransform: 'uppercase' as const, marginBottom: 12 }}>✓ What worked</div>
                  {debrief.what_worked.map((s, i) => <div key={i} style={{ fontSize: 13, color: '#1a2332', marginBottom: 8, paddingLeft: 10, borderLeft: '2px solid #1D9E75', lineHeight: 1.5 }}>{s}</div>)}
                </div>
                <div style={{ background: '#fff', border: '1px solid #edf1f6', borderRadius: 14, padding: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#D97706', letterSpacing: 0.6, textTransform: 'uppercase' as const, marginBottom: 12 }}>↑ Next time</div>
                  {debrief.what_to_improve.map((s, i) => <div key={i} style={{ fontSize: 13, color: '#1a2332', marginBottom: 8, paddingLeft: 10, borderLeft: '2px solid #D97706', lineHeight: 1.5 }}>{s}</div>)}
                </div>
              </div>

              {debrief.tactics_used.length > 0 && (
                <div style={{ background: '#fff', border: '1px solid #edf1f6', borderRadius: 14, padding: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: accent, letterSpacing: 0.6, textTransform: 'uppercase' as const, marginBottom: 12 }}>Tactics you used</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {debrief.tactics_used.map((t, i) => (
                      <span key={i} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: 'rgba(255,153,51,0.1)', border: '1px solid rgba(255,153,51,0.3)', color: accent, fontWeight: 600 }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button onClick={() => { setPhase('setup'); setMsgs([]); setDebrief(null); isFirstRef.current = true }}
                  style={{ padding: '11px 28px', borderRadius: 10, background: `linear-gradient(135deg,${accent},#e67300)`, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: f.heading, fontSize: 14, fontWeight: 700 }}>
                  Practice Again →
                </button>
                <button onClick={() => { setPhase('chat'); setDebrief(null) }}
                  style={{ padding: '11px 20px', borderRadius: 10, background: 'rgba(255,153,51,0.1)', border: `1px solid rgba(255,153,51,0.3)`, color: accent, cursor: 'pointer', fontFamily: f.heading, fontSize: 14, fontWeight: 600 }}>
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
