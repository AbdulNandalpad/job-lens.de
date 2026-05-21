'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { theme } from '@/lib/theme'
import { SS, API, CREDIT_COST } from '@/lib/constants'

const { colors: c, gradients: g, fonts: f } = theme

interface Message {
  role: 'user' | 'assistant'
  content: string
  status?: string
}

const SUGGESTIONS = [
  'Find me senior developer jobs in Stuttgart',
  'Search for marketing manager roles in Munich',
  'What jobs match my CV best?',
  'Show me remote jobs in Germany',
]

const STATUS_LABELS: Record<string, string> = {
  search_jobs: 'Searching live jobs...',
  score_jobs:  'Scoring your CV match...',
}

function TypingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: '50%',
          background: c.accent,
          display: 'inline-block',
          animation: 'jlaw-dot 1.2s ease-in-out infinite',
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </span>
  )
}

export default function AIWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [cvText, setCvText] = useState('')
  const [hasCv, setHasCv] = useState(false)
  const [pulse, setPulse] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const cv = sessionStorage.getItem(SS.cvText) || ''
    setCvText(cv)
    setHasCv(!!cv)

    try {
      const saved = sessionStorage.getItem(SS.aiMessages)
      if (saved) setMessages(JSON.parse(saved))
    } catch { /* ignore */ }

    // Stop pulsing after 6 seconds
    const t = setTimeout(() => setPulse(false), 6000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) {
      setPulse(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem(SS.aiMessages, JSON.stringify(messages.slice(-20)))
    }
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return

    const userMsg: Message = { role: 'user', content: text.trim() }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    const assistantIdx = updatedMessages.length
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch(API.aiChat, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          cvText,
          market: 'eu',
        }),
      })

      if (res.status === 402) {
        setMessages(prev => {
          const copy = [...prev]
          copy[assistantIdx] = { role: 'assistant', content: "You've run out of credits. Top up your account to continue." }
          return copy
        })
        setLoading(false)
        return
      }

      if (!res.ok || !res.body) throw new Error('Failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let assembled = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.text) {
              assembled += event.text
              setMessages(prev => {
                const copy = [...prev]
                copy[assistantIdx] = { role: 'assistant', content: assembled }
                return copy
              })
            } else if (event.status) {
              setMessages(prev => {
                const copy = [...prev]
                copy[assistantIdx] = { role: 'assistant', content: '', status: event.status }
                return copy
              })
            } else if (event.error) {
              setMessages(prev => {
                const copy = [...prev]
                copy[assistantIdx] = { role: 'assistant', content: event.error }
                return copy
              })
            }
          } catch { /* malformed chunk */ }
        }
      }
    } catch {
      setMessages(prev => {
        const copy = [...prev]
        copy[assistantIdx] = { role: 'assistant', content: 'Connection error. Please try again.' }
        return copy
      })
    }

    setLoading(false)
    inputRef.current?.focus()
  }, [messages, loading, cvText])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  function clearChat() {
    setMessages([])
    sessionStorage.removeItem(SS.aiMessages)
  }

  const isEmpty = messages.length === 0

  return (
    <>
      <style>{`
        @keyframes jlaw-dot {
          0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-3px); }
        }
        @keyframes jlaw-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(109,40,217,0.5); }
          50% { box-shadow: 0 0 0 10px rgba(109,40,217,0); }
        }
        @keyframes jlaw-slide-up {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .jlaw-fab:hover { transform: scale(1.06) !important; }
        .jlaw-close:hover { background: rgba(255,255,255,0.15) !important; }
        .jlaw-clear:hover { color: ${c.danger} !important; }
        .jlaw-send:hover:not(:disabled) { opacity: 0.85; }
        .jlaw-send:disabled { opacity: 0.4; cursor: not-allowed; }
        .jlaw-suggest:hover { background: rgba(55,138,221,0.12) !important; border-color: ${c.accent} !important; color: ${c.accent} !important; }
        .jlaw-input:focus { outline: none; }
        .jlaw-msg-user { background: linear-gradient(135deg, ${c.accent}, ${c.navy}); border-radius: 14px 14px 3px 14px; }
        .jlaw-msg-ai { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); border-radius: 3px 14px 14px 14px; }
      `}</style>

      {/* Floating panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 80, right: 20, zIndex: 9999,
          width: 360, height: 520,
          background: 'linear-gradient(160deg, #0f1f33 0%, #0a1520 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 18,
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column',
          animation: 'jlaw-slide-up 0.22s ease',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            flexShrink: 0,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: `linear-gradient(135deg, ${c.ai}, ${c.accent})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>AI</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: f.heading }}>Job-Lens AI</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>
                {hasCv ? '✓ CV loaded' : 'Upload CV on Career Scan for better results'}
              </div>
            </div>
            {messages.length > 0 && (
              <button className="jlaw-clear" onClick={clearChat} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.35)', fontSize: 11, padding: '2px 6px',
                borderRadius: 6, transition: 'color 0.2s', fontFamily: f.body,
              }}>Clear</button>
            )}
            <button className="jlaw-close" onClick={() => setOpen(false)} style={{
              width: 24, height: 24, borderRadius: 6, border: 'none',
              background: 'rgba(255,255,255,0.08)', cursor: 'pointer',
              color: 'rgba(255,255,255,0.6)', fontSize: 14, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s', flexShrink: 0,
            }}>✕</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
            {isEmpty ? (
              <div style={{ paddingTop: 8 }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 12, lineHeight: 1.5 }}>
                  Ask me to find jobs, check how your CV matches a role, or explore the market.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {SUGGESTIONS.map(s => (
                    <button key={s} className="jlaw-suggest" onClick={() => sendMessage(s)} style={{
                      textAlign: 'left', padding: '7px 12px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer',
                      transition: 'all 0.15s', fontFamily: f.body,
                    }}>{s}</button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    marginBottom: 8,
                    alignItems: 'flex-end', gap: 6,
                  }}>
                    {msg.role === 'assistant' && (
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: `linear-gradient(135deg, ${c.ai}, ${c.accent})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0,
                      }}>AI</div>
                    )}
                    <div className={msg.role === 'user' ? 'jlaw-msg-user' : 'jlaw-msg-ai'} style={{
                      maxWidth: '78%', padding: '8px 11px',
                      color: '#fff', fontSize: 13, lineHeight: 1.55,
                      fontFamily: f.body,
                    }}>
                      {msg.status ? (
                        <span style={{ color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <TypingDots /> {STATUS_LABELS[msg.status] || 'Thinking...'}
                        </span>
                      ) : msg.role === 'assistant' && i === messages.length - 1 && msg.content === '' ? (
                        <TypingDots />
                      ) : (
                        <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 12px 12px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            flexShrink: 0,
          }}>
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: 8,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12, padding: '8px 10px',
            }}>
              <textarea
                ref={inputRef}
                className="jlaw-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about jobs, CV match, salaries..."
                disabled={loading}
                rows={1}
                style={{
                  flex: 1, resize: 'none', border: 'none', background: 'transparent',
                  fontFamily: f.body, fontSize: 13, color: '#fff',
                  lineHeight: 1.5, maxHeight: 80, overflowY: 'auto',
                }}
              />
              <button className="jlaw-send" onClick={() => sendMessage(input)} disabled={!input.trim() || loading} style={{
                width: 30, height: 30, borderRadius: 8, border: 'none',
                background: g.button, cursor: 'pointer', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 14, transition: 'opacity 0.2s',
              }}>
                {loading
                  ? <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                  : '↑'}
              </button>
            </div>
            <div style={{ textAlign: 'center', marginTop: 5, color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>
              {CREDIT_COST.aiChat} credit per message · Enter to send
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        className="jlaw-fab"
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
          width: 52, height: 52, borderRadius: '50%', border: 'none',
          background: `linear-gradient(135deg, ${c.ai}, ${c.accent})`,
          cursor: 'pointer', boxShadow: '0 4px 20px rgba(109,40,217,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.2s',
          animation: pulse ? 'jlaw-pulse 2s ease-in-out 3' : 'none',
        }}
        title="Job-Lens AI Assistant"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 5l10 10M15 5L5 15" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="rgba(255,255,255,0.3)"/>
            <path d="M8 10h8M8 14h5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="17" cy="7" r="3" fill="#fff" opacity="0.9"/>
            <path d="M16 7h2M17 6v2" stroke={c.ai} strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        )}
      </button>
    </>
  )
}
