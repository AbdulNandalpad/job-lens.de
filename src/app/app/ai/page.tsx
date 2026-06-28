'use client'

import { useState, useRef, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { theme } from '@/lib/theme'
import { useCredits } from '@/lib/useCredits'
import { SS, LS, API, CREDIT_COST } from '@/lib/constants'
import { useLanguage } from '@/lib/i18n'

const { colors: c, gradients: g, fonts: f } = theme

interface Message {
  role: 'user' | 'assistant'
  content: string
  status?: string
}

const SUGGESTIONS_EN = [
  'Find me senior developer jobs in Stuttgart',
  'Search for marketing manager roles in Munich',
  'Show me remote React jobs in Germany',
  'What jobs match my CV best?',
]

const SUGGESTIONS_DE = [
  'Finde mir Senior-Entwickler-Jobs in Stuttgart',
  'Suche nach Marketing-Manager-Stellen in München',
  'Zeige mir Remote React-Jobs in Deutschland',
  'Welche Jobs passen am besten zu meinem Lebenslauf?',
]

function useStatusLabels(lang: string): Record<string, string> {
  return {
    search_jobs: lang === 'DE' ? 'Suche läuft...' : 'Searching live jobs...',
    score_jobs: lang === 'DE' ? 'CV-Übereinstimmung wird bewertet...' : 'Scoring your CV match...',
  }
}

function TypingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center', padding: '2px 0' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 6, height: 6, borderRadius: '50%',
            background: c.accent,
            animation: 'jl-ai-dot 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`,
            display: 'inline-block',
          }}
        />
      ))}
    </span>
  )
}

function MessageBubble({ msg, isLast, lang }: { msg: Message; isLast: boolean; lang: string }) {
  const isUser = msg.role === 'user'
  const isTyping = !isUser && isLast && msg.content === '' && !msg.status
  const statusLabels = useStatusLabels(lang)

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 12,
    }}>
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: `linear-gradient(135deg, ${c.ai}, ${c.accent})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, color: '#fff', fontWeight: 700, flexShrink: 0,
          marginRight: 8, marginTop: 2,
        }}>
          AI
        </div>
      )}
      <div style={{
        maxWidth: '72%',
        background: isUser
          ? `linear-gradient(135deg, ${c.accent}, ${c.navy})`
          : 'rgba(255,255,255,0.06)',
        border: isUser ? 'none' : '1px solid rgba(255,255,255,0.1)',
        borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
        padding: '10px 14px',
        color: '#fff',
        fontSize: 14,
        lineHeight: 1.6,
        fontFamily: f.body,
      }}>
        {msg.status ? (
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TypingDots />
            {statusLabels[msg.status] || (lang === 'DE' ? 'Wird verarbeitet...' : 'Thinking...')}
          </span>
        ) : isTyping ? (
          <TypingDots />
        ) : (
          <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
        )}
      </div>
    </div>
  )
}

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem(LS.aiMessages)
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [cvText, setCvText] = useState('')
  const [hasCv, setHasCv] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { credits } = useCredits()
  const { lang } = useLanguage()

  useEffect(() => {
    const cv = sessionStorage.getItem(SS.cvText) || ''
    setCvText(cv)
    setHasCv(!!cv)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(LS.aiMessages, JSON.stringify(messages.slice(-20)))
    }
  }, [messages])

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return

    const userMsg: Message = { role: 'user', content: text.trim() }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    // Add empty assistant message as placeholder
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
          copy[assistantIdx] = {
            role: 'assistant',
            content: lang === 'DE' ? 'Deine Credits sind aufgebraucht. Bitte lade dein Konto auf, um den KI-Assistenten weiter zu nutzen.' : "You've run out of credits. Please top up your account to continue using the AI assistant.",
          }
          return copy
        })
        setLoading(false)
        return
      }

      if (!res.ok || !res.body) {
        throw new Error('Failed to connect to AI')
      }

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
          const payload = line.slice(6)
          if (payload === '[DONE]') continue

          try {
            const event = JSON.parse(payload)

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
        copy[assistantIdx] = { role: 'assistant', content: lang === 'DE' ? 'Verbindungsfehler. Bitte versuche es erneut.' : 'Connection error. Please try again.' }
        return copy
      })
    }

    setLoading(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  function clearChat() {
    setMessages([])
    localStorage.removeItem(LS.aiMessages)
  }

  const isEmpty = messages.length === 0

  return (
    <div style={{ minHeight: '100vh', background: c.bg, fontFamily: f.body }}>
      <Navbar />

      <style>{`
        @keyframes jl-ai-dot {
          0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-3px); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .jl-ai-textarea:focus { outline: none; }
        .jl-ai-suggest:hover { background: rgba(55,138,221,0.15) !important; border-color: ${c.accent} !important; }
        .jl-ai-send:hover:not(:disabled) { background: linear-gradient(135deg, #4a9de0, #1d6fc0) !important; }
        .jl-ai-send:disabled { opacity: 0.5; cursor: not-allowed; }
        .jl-ai-clear:hover { color: ${c.danger} !important; }
      `}</style>

      <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>
        {/* Sidebar */}
        <aside style={{
          width: 240,
          background: 'linear-gradient(180deg, #152233 0%, #0e1a28 100%)',
          borderRight: `1px solid rgba(255,255,255,0.08)`,
          display: 'flex', flexDirection: 'column',
          padding: '20px 0',
          flexShrink: 0,
        }}>
          <div style={{ padding: '0 16px', marginBottom: 20 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 12px',
              background: 'linear-gradient(135deg, rgba(109,40,217,0.3), rgba(55,138,221,0.2))',
              borderRadius: 10,
              border: '1px solid rgba(109,40,217,0.3)',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: `linear-gradient(135deg, ${c.ai}, ${c.accent})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, color: '#fff', fontWeight: 700, flexShrink: 0,
              }}>AI</div>
              <div>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Job-Lens AI</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{lang === 'DE' ? 'Intelligente Jobsuche' : 'Smart job search'}</div>
              </div>
            </div>
          </div>

          <div style={{ padding: '0 16px', marginBottom: 8 }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              {lang === 'DE' ? 'Status' : 'Status'}
            </div>
            <div style={{
              padding: '8px 12px', borderRadius: 8,
              background: hasCv ? 'rgba(29,158,117,0.12)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${hasCv ? 'rgba(29,158,117,0.3)' : 'rgba(255,255,255,0.1)'}`,
              fontSize: 12, color: hasCv ? c.success : 'rgba(255,255,255,0.5)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>{hasCv ? '✓' : '○'}</span>
              <span>{hasCv ? (lang === 'DE' ? 'Lebenslauf geladen' : 'CV loaded') : (lang === 'DE' ? 'Kein Lebenslauf — auf Career Scan hochladen' : 'No CV — upload on Career Scan')}</span>
            </div>
          </div>

          <div style={{ padding: '0 16px', marginTop: 8 }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              Credits
            </div>
            <div style={{
              padding: '8px 12px', borderRadius: 8,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              fontSize: 12, color: 'rgba(255,255,255,0.7)',
            }}>
              <span style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>{credits}</span>
              <span> {lang === 'DE' ? 'verfügbar' : 'available'}</span>
            </div>
          </div>

          <div style={{ flex: 1 }} />

          {messages.length > 0 && (
            <div style={{ padding: '0 16px' }}>
              <button
                className="jl-ai-clear"
                onClick={clearChat}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer',
                  transition: 'color 0.2s',
                }}
              >
                {lang === 'DE' ? 'Gespräch löschen' : 'Clear conversation'}
              </button>
            </div>
          )}
        </aside>

        {/* Main chat area */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto',
            padding: '24px 32px',
            background: c.bg,
          }}>
            {isEmpty ? (
              <div style={{ maxWidth: 600, margin: '40px auto', textAlign: 'center' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${c.ai}, ${c.accent})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, color: '#fff', fontWeight: 700,
                  margin: '0 auto 16px',
                }}>AI</div>
                <h2 style={{ fontFamily: f.heading, fontSize: 22, fontWeight: 700, color: c.text, marginBottom: 8 }}>
                  {lang === 'DE' ? 'Job-Lens KI-Assistent' : 'Job-Lens AI Assistant'}
                </h2>
                <p style={{ color: c.textMuted, fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
                  {lang === 'DE'
                    ? 'Bitte mich, Jobs zu finden, zu prüfen wie dein Lebenslauf zu einer Stelle passt, oder den Arbeitsmarkt zu analysieren.'
                    : 'Ask me to find jobs, check how your CV matches a role, or help you understand the job market.'}
                  {hasCv && (lang === 'DE' ? ' Dein Lebenslauf ist geladen — ich nutze ihn, um die Ergebnisse zu personalisieren.' : ' Your CV is loaded — I\'ll use it to personalise results.')}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                  {(lang === 'DE' ? SUGGESTIONS_DE : SUGGESTIONS_EN).map(s => (
                    <button
                      key={s}
                      className="jl-ai-suggest"
                      onClick={() => sendMessage(s)}
                      style={{
                        padding: '8px 14px',
                        background: 'rgba(55,138,221,0.08)',
                        border: `1px solid ${c.borderLight}`,
                        borderRadius: 20,
                        color: c.accent, fontSize: 13, cursor: 'pointer',
                        transition: 'background 0.2s, border-color 0.2s',
                        fontFamily: f.body,
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ maxWidth: 700, margin: '0 auto' }}>
                {messages.map((msg, i) => (
                  <MessageBubble key={i} msg={msg} isLast={i === messages.length - 1} lang={lang} />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{
            padding: '16px 32px 20px',
            borderTop: `1px solid ${c.border}`,
            background: '#fff',
          }}>
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
              <div style={{
                display: 'flex', gap: 10, alignItems: 'flex-end',
                background: c.bgSubtle,
                border: `1px solid ${c.border}`,
                borderRadius: 14,
                padding: '10px 14px',
              }}>
                <textarea
                  ref={inputRef}
                  className="jl-ai-textarea"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={hasCv
                    ? (lang === 'DE' ? 'Bitte mich, Jobs zu finden, Übereinstimmungen zu bewerten oder nach Standort zu suchen...' : 'Ask me to find jobs, score matches, or search by location...')
                    : (lang === 'DE' ? 'Bitte mich, Jobs in Deutschland, Österreich oder der Schweiz zu finden...' : 'Ask me to find jobs in Germany, Austria, or Switzerland...')
                  }
                  disabled={loading}
                  rows={1}
                  style={{
                    flex: 1, resize: 'none', border: 'none', background: 'transparent',
                    fontFamily: f.body, fontSize: 14, color: c.text,
                    lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
                  }}
                />
                <button
                  className="jl-ai-send"
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: g.button,
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s',
                    color: '#fff', fontSize: 16,
                  }}
                >
                  {loading ? (
                    <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                  ) : '↑'}
                </button>
              </div>
              <div style={{ marginTop: 8, textAlign: 'center', color: c.textFaint, fontSize: 11 }}>
                {lang === 'DE' ? 'Enter zum Senden · Shift+Enter für neue Zeile' : 'Press Enter to send · Shift+Enter for new line'}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
