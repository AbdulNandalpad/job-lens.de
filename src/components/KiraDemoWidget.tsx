'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface Msg { role: 'user' | 'kira'; text: string }

const SCRIPTS: Record<string, Msg[]> = {
  'eu-DE': [
    { role: 'user', text: 'Ich bin Full-Stack-Entwickler mit 4 Jahren Erfahrung. Welche Jobs passen zu mir in München?' },
    { role: 'kira', text: 'Drei starke Matches für dich: **Senior Full-Stack Engineer bei BMW** (95.000 € · München), **Backend Developer bei MAN** (88.000 € · München) und **Software Engineer bei Allianz** (91.000 €). Deine Node.js- und React-Skills passen gut. Soll ich deinen Fit für BMW prüfen?' },
    { role: 'user', text: 'Ja, für BMW bitte.' },
    { role: 'kira', text: 'Ich würde dein Profil für diese BMW-Stelle auf **7/10** schätzen — solide Full-Stack-Basis, aber Cloud-native-Erfahrung fehlt noch. Starte den **Career Scan** für den vollständigen ATS-Bericht und einen konkreten Plan, die Lücke zu schließen.' },
  ],
  'eu-EN': [
    { role: 'user', text: 'I\'m a Full-Stack developer with 4 years of experience. What jobs match my profile in Germany?' },
    { role: 'kira', text: 'Three strong matches for you: **Senior Full-Stack Engineer at BMW** (€95,000 · Munich), **Backend Developer at MAN** (€88,000 · Munich), and **Software Engineer at Allianz** (€91,000). Your Node.js and React skills are a solid fit. Want me to check your match for BMW?' },
    { role: 'user', text: 'Yes, check my fit for BMW.' },
    { role: 'kira', text: 'I\'d put your profile at around **7/10** for this BMW role — strong Full-Stack foundation, but cloud-native experience is the main gap. Run the **Career Scan** for the full ATS report and a step-by-step plan to close it.' },
  ],
  'in-EN': [
    { role: 'user', text: 'I have 3 years experience as a data analyst. Which companies in Bangalore should I target?' },
    { role: 'kira', text: 'Three strong matches in Bangalore: **Data Analyst at Flipkart** (₹14–18 LPA), **Senior Analyst at PhonePe** (₹16–20 LPA), and **Business Analyst at CRED** (₹15–20 LPA). Good overall fit for your background. Want me to check your match for CRED?' },
    { role: 'user', text: 'Yes, check my fit for CRED.' },
    { role: 'kira', text: 'I\'d score your profile around **7/10** for CRED — solid analytics background, but product analytics and A/B testing are the key gaps. Run the **Career Scan** for your full ATS score and a personalised action plan.' },
  ],
}

function renderBold(text: string) {
  return text.split(/\*\*(.+?)\*\*/).map((part, i) =>
    i % 2 === 1
      ? <strong key={i} style={{ fontWeight: 700 }}>{part}</strong>
      : <span key={i}>{part}</span>
  )
}

function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)) }

function TypingDots({ accent }: { accent: string }) {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', height: 18 }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: '50%', background: accent,
          display: 'inline-block',
          animation: `kdot 1.2s ${i * 0.18}s ease-in-out infinite`,
        }} />
      ))}
    </span>
  )
}

function KiraAvatar({ accent, size = 26 }: { accent: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `${accent}22`, border: `1px solid ${accent}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 44 44">
        <circle cx="20" cy="20" r="13" fill="none" stroke={accent} strokeWidth="2.8"/>
        <circle cx="20" cy="20" r="3" fill={accent}/>
        <line x1="28" y1="28" x2="36" y2="36" stroke={accent} strokeWidth="3.5" strokeLinecap="round"/>
      </svg>
    </div>
  )
}

export default function KiraDemoWidget({
  market,
  lang = 'EN',
}: {
  market: 'eu' | 'in'
  lang?: 'DE' | 'EN'
}) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [typingText, setTypingText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showCta, setShowCta] = useState(false)
  const [restartKey, setRestartKey] = useState(0)
  const abortRef = useRef<AbortController | null>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  const scriptKey = market === 'in' ? 'in-EN' : `eu-${lang}`
  const script = SCRIPTS[scriptKey]
  const accent = market === 'in' ? '#FF9933' : '#378ADD'
  const ctaHref = market === 'in' ? '/in/login' : '/login'

  const ctaLabel = market === 'in'
    ? 'Try Kira free — no card needed'
    : lang === 'DE' ? 'Kira kostenlos testen' : 'Try Kira free'

  const demoNote = market === 'in'
    ? 'Scripted demo. Sign up to use the real Kira with your actual CV.'
    : lang === 'DE'
    ? 'Demo-Gespräch. Die echte Kira analysiert deinen echten Lebenslauf.'
    : 'Scripted demo. The real Kira analyses your actual CV.'

  useEffect(() => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setMessages([])
    setTypingText('')
    setIsTyping(false)
    setShowCta(false)

    async function run() {
      for (let i = 0; i < script.length; i++) {
        if (ctrl.signal.aborted) return
        const msg = script[i]

        if (msg.role === 'user') {
          await sleep(i === 0 ? 700 : 1500)
          if (ctrl.signal.aborted) return
          setMessages(prev => [...prev, msg])
        } else {
          await sleep(700)
          if (ctrl.signal.aborted) return
          setIsTyping(true)
          setTypingText('')

          const words = msg.text.split(' ')
          let built = ''
          for (const word of words) {
            if (ctrl.signal.aborted) return
            built += (built ? ' ' : '') + word
            setTypingText(built)
            await sleep(38)
          }

          if (ctrl.signal.aborted) return
          setIsTyping(false)
          setTypingText('')
          setMessages(prev => [...prev, msg])
        }
      }

      await sleep(900)
      if (!ctrl.signal.aborted) setShowCta(true)
    }

    run()
    return () => ctrl.abort()
  }, [restartKey, scriptKey])

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages, typingText])

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <style>{`
        @keyframes kdot { 0%,80%,100% { opacity:0.3; transform:translateY(0); } 40% { opacity:1; transform:translateY(-4px); } }
      `}</style>

      <div style={{
        background: 'linear-gradient(160deg, #0d1f30 0%, #091624 100%)',
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.28)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg, ${accent}cc, ${accent}55)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 44 44">
              <circle cx="20" cy="20" r="13" fill="none" stroke="white" strokeWidth="2.8"/>
              <circle cx="20" cy="20" r="3" fill="white"/>
              <line x1="28" y1="28" x2="36" y2="36" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: "'Outfit',sans-serif" }}>Kira</div>
            <div style={{ fontSize: 10, color: accent, fontWeight: 600 }}>AI Career Assistant</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Sans',sans-serif" }}>Demo</span>
          </div>
        </div>

        {/* Messages */}
        <div ref={chatRef} style={{
          padding: '18px 16px 4px',
          minHeight: 240, maxHeight: 360,
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              gap: 8,
              alignItems: 'flex-end',
            }}>
              {msg.role === 'kira' && <KiraAvatar accent={accent} />}
              <div style={{
                maxWidth: '82%',
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                background: msg.role === 'user'
                  ? `linear-gradient(135deg, ${accent}cc, ${accent}88)`
                  : 'rgba(255,255,255,0.08)',
                border: msg.role === 'kira' ? '1px solid rgba(255,255,255,0.07)' : 'none',
                fontSize: 13,
                color: '#fff',
                lineHeight: 1.65,
                fontFamily: "'DM Sans',sans-serif",
              }}>
                {msg.role === 'kira' ? renderBold(msg.text) : msg.text}
              </div>
            </div>
          ))}

          {isTyping && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <KiraAvatar accent={accent} />
              <div style={{
                maxWidth: '82%',
                padding: '10px 14px',
                borderRadius: '4px 16px 16px 16px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.07)',
                fontSize: 13,
                color: 'rgba(255,255,255,0.85)',
                lineHeight: 1.65,
                fontFamily: "'DM Sans',sans-serif",
              }}>
                {typingText
                  ? renderBold(typingText)
                  : <TypingDots accent={accent} />
                }
              </div>
            </div>
          )}

          <div style={{ height: 4 }} />
        </div>

        {/* Footer bar */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {showCta ? (
            <>
              <Link href={ctaHref} style={{
                display: 'inline-block', padding: '9px 22px', borderRadius: 10,
                background: `linear-gradient(135deg, ${accent}, ${accent}bb)`,
                color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none',
                boxShadow: `0 4px 16px ${accent}40`,
                fontFamily: "'DM Sans',sans-serif",
                whiteSpace: 'nowrap' as const,
              }}>
                {ctaLabel} →
              </Link>
              <button onClick={() => setRestartKey(k => k + 1)} style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 10,
                color: 'rgba(255,255,255,0.4)',
                fontSize: 12,
                padding: '9px 16px',
                cursor: 'pointer',
                fontFamily: "'DM Sans',sans-serif",
              }}>
                ↻ {lang === 'DE' && market === 'eu' ? 'Wiederholen' : 'Replay'}
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '2px 0' }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{
                  width: i < messages.length ? 8 : 6,
                  height: i < messages.length ? 8 : 6,
                  borderRadius: '50%',
                  background: i < messages.length ? accent : 'rgba(255,255,255,0.15)',
                  transition: 'all 0.3s',
                }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showCta && (
        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(100,116,139,0.8)', marginTop: 14, fontFamily: "'DM Sans',sans-serif" }}>
          {demoNote}
        </p>
      )}
    </div>
  )
}
