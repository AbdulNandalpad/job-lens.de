'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { theme } from '@/lib/theme'
import { SS, API, CREDIT_COST } from '@/lib/constants'

const { colors: c, gradients: g, fonts: f } = theme

const AGENT_NAME = 'Kira'

interface ActionButton { feature: string; label: string; href: string; reason: string }

interface Message {
  role: 'user' | 'assistant'
  content: string
  status?: string
  actions?: ActionButton[]
}

const SUGGESTIONS = [
  'Find me senior developer jobs in Stuttgart',
  'Search for marketing manager roles in Munich',
  'What jobs match my CV best?',
  'Show me remote jobs in Germany',
]

const STATUS_LABELS: Record<string, string> = {
  search_jobs:    'Searching live jobs...',
  score_jobs:     'Scoring your CV match...',
  get_skill_gap:  'Analysing skill gaps...',
  get_salary_info:'Looking up salary data...',
}

const FEATURE_ICONS: Record<string, string> = {
  career_scan:  '🔍',
  cv_builder:   '📄',
  cover_letter: '✉️',
  auto_apply:   '⚡',
  tracker:      '📋',
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

// Browser SpeechRecognition types (not in default TS lib)
interface ISpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  onresult: ((e: ISpeechRecognitionEvent) => void) | null
}
interface ISpeechRecognitionResult { 0: { transcript: string } }
interface ISpeechRecognitionEvent { results: ISpeechRecognitionResult[] }
declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition
    webkitSpeechRecognition: new () => ISpeechRecognition
  }
}

export default function AIWidget({ market = 'eu' }: { market?: 'eu' | 'in' }) {
  const [open, setOpen]           = useState(false)
  const [messages, setMessages]   = useState<Message[]>([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [cvText, setCvText]       = useState('')
  const [hasCv, setHasCv]         = useState(false)
  const [cvUploading, setCvUploading] = useState(false)
  const [pulse, setPulse]         = useState(true)
  const [listening, setListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)

  const messagesEndRef  = useRef<HTMLDivElement>(null)
  const inputRef        = useRef<HTMLTextAreaElement>(null)
  const fileInputRef    = useRef<HTMLInputElement>(null)
  const recognitionRef  = useRef<ISpeechRecognition | null>(null)

  // ── Init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const cv = sessionStorage.getItem(SS.cvText) || ''
    setCvText(cv)
    setHasCv(!!cv)

    try {
      const saved = sessionStorage.getItem(SS.aiMessages)
      if (saved) setMessages(JSON.parse(saved))
    } catch { /* ignore */ }

    const t = setTimeout(() => setPulse(false), 6000)

    const SR = typeof window !== 'undefined'
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : null
    setVoiceSupported(!!SR)

    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) {
      setPulse(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      // Stop voice if panel closes
      recognitionRef.current?.stop()
      setListening(false)
    }
  }, [open])

  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem(SS.aiMessages, JSON.stringify(messages.slice(-20)))
    }
  }, [messages])

  // ── CV upload ─────────────────────────────────────────────────────────
  async function handleCvFile(file: File) {
    setCvUploading(true)
    try {
      let text = ''
      if (file.name.endsWith('.txt') || file.type === 'text/plain') {
        text = await file.text()
      } else {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch(API.extractPdf, { method: 'POST', body: form })
        const data = await res.json()
        text = data.text || ''
      }
      if (text) {
        sessionStorage.setItem(SS.cvText, text)
        setCvText(text)
        setHasCv(true)
        // Acknowledge in chat
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `CV uploaded successfully! I can now personalise job searches and score matches against your profile. What would you like to search for?`,
        }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Could not read that file. Please try a PDF, DOCX, or TXT.' }])
    }
    setCvUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Voice input ───────────────────────────────────────────────────────
  function toggleVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return

    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    const rec = new SR()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onstart = () => setListening(true)
    rec.onend   = () => setListening(false)
    rec.onerror = () => setListening(false)
    rec.onresult = (e: ISpeechRecognitionEvent) => {
      const transcript = e.results.map(r => r[0].transcript).join('')
      setInput(transcript)
      inputRef.current?.focus()
    }

    recognitionRef.current = rec
    rec.start()
  }

  // ── Send message ──────────────────────────────────────────────────────
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
          market,
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

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer    = ''
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
                copy[assistantIdx] = { ...copy[assistantIdx], role: 'assistant', content: assembled }
                return copy
              })
            } else if (event.action) {
              setMessages(prev => {
                const copy = [...prev]
                const existing = copy[assistantIdx] || { role: 'assistant', content: '' }
                const actions  = [...(existing.actions || []), event.action as ActionButton]
                copy[assistantIdx] = { ...existing, actions }
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
        @keyframes jlaw-mic-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.6); }
          50% { box-shadow: 0 0 0 6px rgba(220,38,38,0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .jlaw-fab:hover   { transform: scale(1.06) !important; }
        .jlaw-close:hover { background: rgba(255,255,255,0.15) !important; }
        .jlaw-clear:hover { color: ${c.danger} !important; }
        .jlaw-send:hover:not(:disabled)  { opacity: 0.85; }
        .jlaw-send:disabled              { opacity: 0.4; cursor: not-allowed; }
        .jlaw-icon-btn:hover             { background: rgba(255,255,255,0.12) !important; }
        .jlaw-suggest:hover { background: rgba(55,138,221,0.12) !important; border-color: ${c.accent} !important; color: ${c.accent} !important; }
        .jlaw-input:focus { outline: none; }
        .jlaw-msg-user { background: linear-gradient(135deg, ${c.accent}, ${c.navy}); border-radius: 14px 14px 3px 14px; }
        .jlaw-msg-ai   { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); border-radius: 3px 14px 14px 14px; }
        /* Mobile portrait — wider panel, pushed up */
        @media (max-width: 480px) {
          .jlaw-panel { width: calc(100vw - 24px) !important; right: 12px !important; left: 12px !important; }
        }
        /* Mobile landscape — full height */
        @media (max-height: 500px) {
          .jlaw-panel {
            top: 8px !important; bottom: 70px !important;
            height: auto !important;
            right: 12px !important;
          }
          .jlaw-fab { bottom: 12px !important; right: 12px !important; width: 44px !important; height: 44px !important; }
        }
      `}</style>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleCvFile(f) }}
      />

      {/* Floating panel */}
      {open && (
        <div className="jlaw-panel" style={{
          position: 'fixed', bottom: 80, right: 20, zIndex: 9999,
          width: 368, height: 540,
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
            {/* Avatar */}
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: `linear-gradient(135deg, ${c.ai}, ${c.accent})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
              letterSpacing: '-0.5px',
            }}>{AGENT_NAME.slice(0, 2)}</div>

            {/* Name + status */}
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: f.heading }}>
                {AGENT_NAME}
                <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.4)', fontSize: 11, marginLeft: 6 }}>by Job-Lens</span>
              </div>
              <div style={{ color: hasCv ? c.success : 'rgba(255,255,255,0.4)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                {cvUploading ? (
                  <><span style={{ width: 8, height: 8, border: '1.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> Uploading CV...</>
                ) : hasCv ? (
                  <><span>✓</span> CV loaded — personalised results on</>
                ) : (
                  <>No CV · upload below for better results</>
                )}
              </div>
            </div>

            {/* Upload CV button */}
            <button
              className="jlaw-icon-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={cvUploading}
              title="Upload your CV (PDF, DOCX, TXT)"
              style={{
                width: 28, height: 28, borderRadius: 7, border: 'none',
                background: hasCv ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.07)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s', flexShrink: 0,
                color: hasCv ? c.success : 'rgba(255,255,255,0.5)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="18" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <polyline points="9 15 12 12 15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {messages.length > 0 && (
              <button className="jlaw-clear" onClick={clearChat} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.3)', fontSize: 11, padding: '2px 6px',
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
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 12, lineHeight: 1.6 }}>
                  Hi! I'm {AGENT_NAME}, your AI career assistant. I can find live jobs, score your CV against a role, and help you decide where to apply.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {SUGGESTIONS.map(s => (
                    <button key={s} className="jlaw-suggest" onClick={() => sendMessage(s)} style={{
                      textAlign: 'left', padding: '7px 12px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.55)', fontSize: 12, cursor: 'pointer',
                      transition: 'all 0.15s', fontFamily: f.body,
                    }}>{s}</button>
                  ))}
                </div>
                {!hasCv && (
                  <button
                    className="jlaw-suggest"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      marginTop: 8, width: '100%', textAlign: 'left',
                      padding: '8px 12px', borderRadius: 10,
                      background: 'rgba(109,40,217,0.1)',
                      border: `1px dashed rgba(109,40,217,0.4)`,
                      color: 'rgba(109,40,217,0.8)', fontSize: 12, cursor: 'pointer',
                      transition: 'all 0.15s', fontFamily: f.body,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="12" y1="18" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <polyline points="9 15 12 12 15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Upload your CV for personalised results (PDF, DOCX, TXT)
                  </button>
                )}
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    marginBottom: 8, alignItems: 'flex-end', gap: 6,
                  }}>
                    {msg.role === 'assistant' && (
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: `linear-gradient(135deg, ${c.ai}, ${c.accent})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 8, fontWeight: 700, color: '#fff', flexShrink: 0,
                        letterSpacing: '-0.3px',
                      }}>{AGENT_NAME.slice(0, 2)}</div>
                    )}
                    <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div className={msg.role === 'user' ? 'jlaw-msg-user' : 'jlaw-msg-ai'} style={{
                        padding: '8px 11px',
                        color: '#fff', fontSize: 13, lineHeight: 1.55,
                        fontFamily: f.body,
                      }}>
                        {msg.status ? (
                          <span style={{ color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <TypingDots /> {STATUS_LABELS[msg.status] || 'Thinking...'}
                          </span>
                        ) : msg.role === 'assistant' && i === messages.length - 1 && msg.content === '' && !msg.actions?.length ? (
                          <TypingDots />
                        ) : (
                          <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                        )}
                      </div>
                      {msg.actions?.map((a, ai) => (
                        <a
                          key={ai}
                          href={a.href}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 12px', borderRadius: 10, textDecoration: 'none',
                            background: 'rgba(55,138,221,0.15)',
                            border: `1px solid rgba(55,138,221,0.35)`,
                            color: '#fff', fontSize: 12, fontFamily: f.body,
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(55,138,221,0.28)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(55,138,221,0.15)')}
                        >
                          <span style={{ fontSize: 14 }}>{FEATURE_ICONS[a.feature] || '→'}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: c.accent }}>{a.label} →</div>
                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 1 }}>{a.reason}</div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input bar */}
          <div style={{
            padding: '10px 12px 12px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            flexShrink: 0,
          }}>
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: 6,
              background: 'rgba(255,255,255,0.07)',
              border: `1px solid ${listening ? 'rgba(220,38,38,0.5)' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 12, padding: '7px 8px',
              transition: 'border-color 0.2s',
            }}>

              {/* Voice button */}
              {voiceSupported && (
                <button
                  className="jlaw-icon-btn"
                  onClick={toggleVoice}
                  disabled={loading}
                  title={listening ? 'Stop recording' : 'Speak to Kira'}
                  style={{
                    width: 28, height: 28, borderRadius: 7, border: 'none',
                    background: listening ? 'rgba(220,38,38,0.2)' : 'rgba(255,255,255,0.06)',
                    cursor: 'pointer', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: listening ? '#f87171' : 'rgba(255,255,255,0.45)',
                    transition: 'background 0.2s, color 0.2s',
                    animation: listening ? 'jlaw-mic-ring 1.2s ease-in-out infinite' : 'none',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="2"/>
                    <path d="M5 10a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="9" y1="21" x2="15" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              )}

              <textarea
                ref={inputRef}
                className="jlaw-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={listening ? 'Listening...' : `Ask ${AGENT_NAME} about jobs, salaries, CV match...`}
                disabled={loading}
                rows={1}
                style={{
                  flex: 1, resize: 'none', border: 'none', background: 'transparent',
                  fontFamily: f.body, fontSize: 13,
                  color: listening ? '#f87171' : '#fff',
                  lineHeight: 1.5, maxHeight: 80, overflowY: 'auto',
                }}
              />

              {/* Send button */}
              <button
                className="jlaw-send"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                style={{
                  width: 30, height: 30, borderRadius: 8, border: 'none',
                  background: g.button, cursor: 'pointer', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 14, transition: 'opacity 0.2s',
                }}
              >
                {loading
                  ? <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                  : '↑'}
              </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: 5, color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>
              {CREDIT_COST.aiChat} credit per message · Enter to send{voiceSupported ? ' · mic to speak' : ''}
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
          width: 54, height: 54, borderRadius: '50%', border: 'none',
          background: `linear-gradient(135deg, ${c.ai}, ${c.accent})`,
          cursor: 'pointer', boxShadow: '0 4px 20px rgba(109,40,217,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.2s',
          animation: pulse ? 'jlaw-pulse 2s ease-in-out 3' : 'none',
        }}
        title={`Chat with ${AGENT_NAME}`}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 5l10 10M15 5L5 15" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
        ) : (
          <span style={{ fontFamily: f.heading, fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
            {AGENT_NAME.slice(0, 2)}
          </span>
        )}
      </button>
    </>
  )
}
