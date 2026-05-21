'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { theme } from '@/lib/theme'
import { SS, API, CREDIT_COST } from '@/lib/constants'

const { colors: c, gradients: g, fonts: f } = theme

const AGENT_NAME = 'Kira'

const VOICE_GREETING: Record<string, string> = {
  eu_de: "Hey, schön dass du da bist! Ich bin Kira. Ich helfe dir, den perfekten Job zu finden. Was suchst du gerade?",
  eu_en: "Hey, great to have you here! I'm Kira. Tell me what you're looking for and let's find something good.",
  in_hi: "Hey, aagaye! Main Kira hoon. Batao, kya dhundh rahe ho? Koi bhi job related sawaal ho, main hoon yahan.",
  in_en: "Hey, welcome! I'm Kira. Tell me what kind of role you're after and let's get searching.",
  in_kn: "ನಮಸ್ಕಾರ! ನಾನು Kira. Job-Lens ನ AI career assistant. ನಿಮಗೆ ಯಾವ ಕೆಲಸ ಬೇಕು, ಹೇಳಿ!",
  in_te: "నమస్కారం! నేను Kira. Job-Lens AI career assistant. మీకు ఏ job కావాలో చెప్పండి!",
}

const SUGGESTIONS: Record<string, string[]> = {
  eu: [
    'Find me senior developer jobs in Stuttgart',
    'Search for marketing manager roles in Munich',
    'What jobs match my CV best?',
    'Show me remote jobs in Germany',
  ],
  in: [
    'Find me software engineer jobs in Bangalore',
    'Search for product manager roles in Hyderabad',
    'What IT jobs match my CV best?',
    'Show me remote jobs in India',
  ],
}

const VOICE_LANGS: Record<string, { code: string; label: string }[]> = {
  eu: [
    { code: 'de-DE', label: 'Deutsch' },
    { code: 'en-GB', label: 'English' },
  ],
  in: [
    { code: 'hi-IN', label: 'हिंदी' },
    { code: 'en-IN', label: 'English' },
    { code: 'kn-IN', label: 'ಕನ್ನಡ' },
    { code: 'te-IN', label: 'తెలుగు' },
  ],
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActionButton { feature: string; label: string; href: string; reason: string }
interface Message {
  role: 'user' | 'assistant'
  content: string
  status?: string
  actions?: ActionButton[]
}
type VoiceState = 'idle' | 'greeting' | 'listening' | 'processing' | 'speaking'

// ── Browser API types ─────────────────────────────────────────────────────────

interface ISpeechRecognition extends EventTarget {
  continuous: boolean; interimResults: boolean; lang: string
  start(): void; stop(): void; abort(): void
  onstart: (() => void) | null; onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
  onresult: ((e: ISpeechRecognitionEvent) => void) | null
}
interface ISpeechRecognitionResult { 0: { transcript: string }; isFinal: boolean }
interface ISpeechRecognitionEvent { results: ISpeechRecognitionResult[] }
declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition
    webkitSpeechRecognition: new () => ISpeechRecognition
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  search_jobs:     'Searching live jobs...',
  score_jobs:      'Scoring your CV match...',
  get_skill_gap:   'Analysing skill gaps...',
  get_salary_info: 'Looking up salary data...',
}

const FEATURE_ICONS: Record<string, string> = {
  career_scan: '🔍', cv_builder: '📄', cover_letter: '✉️',
  auto_apply: '⚡', tracker: '📋',
}

const VOICE_STATE_LABEL: Record<VoiceState, string> = {
  idle:       '',
  greeting:   `${AGENT_NAME} is speaking...`,
  listening:  'Listening...',
  processing: `${AGENT_NAME} is thinking...`,
  speaking:   `${AGENT_NAME} is speaking...`,
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: '50%', background: c.accent,
          display: 'inline-block',
          animation: 'jlaw-dot 1.2s ease-in-out infinite',
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </span>
  )
}

function VoiceWaveform({ active }: { active: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 28 }}>
      {[0.6, 1, 0.8, 1.2, 0.7, 1, 0.9].map((h, i) => (
        <span key={i} style={{
          width: 3, borderRadius: 2,
          background: `linear-gradient(to top, ${c.ai}, ${c.accent})`,
          height: active ? `${h * 20}px` : '4px',
          animation: active ? `jlaw-bar 0.8s ease-in-out infinite alternate` : 'none',
          animationDelay: `${i * 0.1}s`,
          transition: 'height 0.3s ease',
        }} />
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AIWidget({ market = 'eu' }: { market?: 'eu' | 'in' }) {
  const [open, setOpen]           = useState(false)
  const [messages, setMessages]   = useState<Message[]>([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [cvText, setCvText]       = useState('')
  const [hasCv, setHasCv]         = useState(false)
  const [cvUploading, setCvUploading] = useState(false)
  const [pulse, setPulse]         = useState(true)

  // Voice mode
  const [voiceMode, setVoiceMode]       = useState(false)
  const [voiceState, setVoiceState]     = useState<VoiceState>('idle')
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [voiceSupported, setVoiceSupported]   = useState(false)
  const [ttsSupported, setTtsSupported]       = useState(false)
  const [interimText, setInterimText]         = useState('')
  const [voiceLang, setVoiceLang]             = useState(() =>
    market === 'in' ? 'hi-IN' : 'de-DE'
  )

  const messagesEndRef   = useRef<HTMLDivElement>(null)
  const inputRef         = useRef<HTMLTextAreaElement>(null)
  const fileInputRef     = useRef<HTMLInputElement>(null)
  const recognitionRef   = useRef<ISpeechRecognition | null>(null)
  const voiceActiveRef   = useRef(false)   // tracks if voice loop should continue
  const messagesRef      = useRef<Message[]>([])
  const audioRef         = useRef<HTMLAudioElement | null>(null)

  // Keep messagesRef in sync so voice callbacks have current messages
  useEffect(() => { messagesRef.current = messages }, [messages])

  // ── Init ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const cv = sessionStorage.getItem(SS.cvText) || ''
    setCvText(cv); setHasCv(!!cv)
    try {
      const saved = sessionStorage.getItem(SS.aiMessages)
      if (saved) setMessages(JSON.parse(saved))
    } catch { /* ignore */ }
    const t = setTimeout(() => setPulse(false), 6000)
    const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null
    setVoiceSupported(!!SR)
    setTtsSupported(typeof window !== 'undefined' && 'speechSynthesis' in window)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open && !voiceMode) setTimeout(() => inputRef.current?.focus(), 100)
    if (!open) {
      exitVoiceMode()
      setPulse(false)
    }
  }, [open])

  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem(SS.aiMessages, JSON.stringify(messages.slice(-20)))
    }
  }, [messages])

  // ── TTS ────────────────────────────────────────────────────────────────
  function pickVoice(lang: string): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices()
    const prefix = lang.split('-')[0]  // 'hi', 'de', 'en'

    if (prefix === 'hi') {
      return (
        voices.find(v => v.lang === 'hi-IN') ||
        voices.find(v => v.lang.startsWith('hi')) ||
        null
      )
    }
    if (prefix === 'kn') {
      return (
        voices.find(v => v.lang === 'kn-IN') ||
        voices.find(v => v.lang.startsWith('kn')) ||
        null
      )
    }
    if (prefix === 'te') {
      return (
        voices.find(v => v.lang === 'te-IN') ||
        voices.find(v => v.lang.startsWith('te')) ||
        null
      )
    }
    if (prefix === 'de') {
      return (
        voices.find(v => v.name === 'Google Deutsch') ||
        voices.find(v => v.lang === 'de-DE' && !v.name.toLowerCase().includes('male')) ||
        voices.find(v => v.lang.startsWith('de')) ||
        null
      )
    }
    // English fallback (en-GB preferred, en-IN for India)
    return (
      voices.find(v => v.name === 'Google UK English Female') ||
      voices.find(v => v.name.includes('Samantha')) ||
      voices.find(v => v.name.includes('Microsoft Zira')) ||
      voices.find(v => v.lang === lang && !v.name.toLowerCase().includes('male')) ||
      voices.find(v => v.lang.startsWith('en')) ||
      null
    )
  }

  function speakFallback(clean: string, onEnd?: () => void, lang?: string) {
    if (!ttsSupported) { onEnd?.(); return }
    window.speechSynthesis.cancel()
    const utterance  = new SpeechSynthesisUtterance(clean)
    utterance.lang   = lang || voiceLang
    utterance.rate   = 1.0
    utterance.pitch  = 1.0
    const voice      = pickVoice(lang || voiceLang)
    if (voice) utterance.voice = voice
    utterance.onend  = () => { if (voiceActiveRef.current) onEnd?.() }
    utterance.onerror = () => { onEnd?.() }
    window.speechSynthesis.speak(utterance)
  }

  async function speak(text: string, onEnd?: () => void, langOverride?: string) {
    if (!text.trim()) { onEnd?.(); return }
    setVoiceState('speaking')
    window.speechSynthesis?.cancel()
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }

    const clean = text
      .replace(/\*\*/g, '').replace(/#{1,6} /g, '').replace(/`/g, '')
      .replace(/—/g, ', ').trim()

    try {
      const res = await fetch(API.aiTts, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean }),
      })
      if (!res.ok) throw new Error('TTS unavailable')
      if (!voiceActiveRef.current) return

      const blob  = await res.blob()
      const url   = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => { URL.revokeObjectURL(url); audioRef.current = null; if (voiceActiveRef.current) onEnd?.() }
      audio.onerror = () => { URL.revokeObjectURL(url); audioRef.current = null; onEnd?.() }
      await audio.play()
    } catch {
      speakFallback(clean, onEnd, langOverride || voiceLang)
    }
  }

  // ── Speech recognition ─────────────────────────────────────────────────
  function startListening(onResult: (text: string) => void) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR || !voiceActiveRef.current) return

    recognitionRef.current?.abort()
    const rec = new SR()
    rec.continuous      = false
    rec.interimResults  = true
    rec.lang            = voiceLang

    rec.onstart  = () => setVoiceState('listening')
    rec.onerror  = (e) => {
      if (e.error !== 'aborted' && voiceActiveRef.current) {
        setVoiceState('listening')
        setTimeout(() => startListening(onResult), 500)
      }
    }

    let finalTranscript = ''
    rec.onresult = (e) => {
      let interim = ''
      finalTranscript = ''
      for (const result of e.results) {
        if (result.isFinal) finalTranscript += result[0].transcript
        else interim += result[0].transcript
      }
      setInterimText(interim || finalTranscript)
    }

    rec.onend = () => {
      setInterimText('')
      if (finalTranscript.trim() && voiceActiveRef.current) {
        setVoiceTranscript(finalTranscript.trim())
        onResult(finalTranscript.trim())
      } else if (voiceActiveRef.current) {
        // Silence — listen again
        setTimeout(() => startListening(onResult), 300)
      }
    }

    recognitionRef.current = rec
    rec.start()
  }

  // ── Voice mode lifecycle ───────────────────────────────────────────────
  function enterVoiceMode() {
    voiceActiveRef.current = true
    setVoiceMode(true)
    setVoiceTranscript('')
    setInterimText('')
    setVoiceState('greeting')

    // Small delay so voices can load on mobile
    setTimeout(() => {
      const langKey = `${market}_${voiceLang.split('-')[0]}`
      const greeting = VOICE_GREETING[langKey] || VOICE_GREETING[`${market}_en`] || VOICE_GREETING['eu_en']
      speak(greeting, () => {
        if (voiceActiveRef.current) startListening(handleVoiceInput)
      })
    }, 300)
  }

  function exitVoiceMode() {
    voiceActiveRef.current = false
    recognitionRef.current?.abort()
    window.speechSynthesis?.cancel()
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    setVoiceMode(false)
    setVoiceState('idle')
    setVoiceTranscript('')
    setInterimText('')
  }

  // ── Voice → API → TTS cycle ────────────────────────────────────────────
  async function handleVoiceInput(text: string) {
    if (!voiceActiveRef.current) return
    setVoiceState('processing')

    const userMsg: Message = { role: 'user', content: text }
    const currentMessages  = [...messagesRef.current, userMsg]
    setMessages(prev => [...prev, userMsg, { role: 'assistant', content: '' }])
    const assistantIdx = currentMessages.length

    try {
      const res = await fetch(API.aiChat, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages.map(m => ({ role: m.role, content: m.content })),
          cvText, market,
        }),
      })

      if (!res.ok || !res.body) throw new Error('Failed')

      const reader    = res.body.getReader()
      const decoder   = new TextDecoder()
      let buffer      = ''
      let assembled   = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop() || ''
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
                copy[assistantIdx] = { ...existing, actions: [...(existing.actions || []), event.action as ActionButton] }
                return copy
              })
            }
          } catch { /* ignore */ }
        }
      }

      // Speak the response then listen again
      if (voiceActiveRef.current && assembled) {
        speak(assembled, () => {
          if (voiceActiveRef.current) {
            setVoiceTranscript('')
            startListening(handleVoiceInput)
          }
        })
      }
    } catch {
      if (voiceActiveRef.current) {
        speak("Sorry, something went wrong. Please try again.", () => {
          if (voiceActiveRef.current) startListening(handleVoiceInput)
        })
      }
    }
  }

  // ── Text chat send ─────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text.trim() }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages); setInput(''); setLoading(true)
    const assistantIdx = updatedMessages.length
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch(API.aiChat, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          cvText, market,
        }),
      })

      if (res.status === 402) {
        setMessages(prev => { const copy = [...prev]; copy[assistantIdx] = { role: 'assistant', content: "You've run out of credits. Top up your account to continue." }; return copy })
        setLoading(false); return
      }
      if (!res.ok || !res.body) throw new Error('Failed')

      const reader    = res.body.getReader()
      const decoder   = new TextDecoder()
      let buffer      = ''
      let assembled   = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.text) {
              assembled += event.text
              setMessages(prev => { const copy = [...prev]; copy[assistantIdx] = { ...copy[assistantIdx], role: 'assistant', content: assembled }; return copy })
            } else if (event.action) {
              setMessages(prev => { const copy = [...prev]; const ex = copy[assistantIdx] || { role: 'assistant', content: '' }; copy[assistantIdx] = { ...ex, actions: [...(ex.actions || []), event.action as ActionButton] }; return copy })
            } else if (event.status) {
              setMessages(prev => { const copy = [...prev]; copy[assistantIdx] = { role: 'assistant', content: '', status: event.status }; return copy })
            } else if (event.error) {
              setMessages(prev => { const copy = [...prev]; copy[assistantIdx] = { role: 'assistant', content: event.error }; return copy })
            }
          } catch { /* ignore */ }
        }
      }
    } catch {
      setMessages(prev => { const copy = [...prev]; copy[assistantIdx] = { role: 'assistant', content: 'Connection error. Please try again.' }; return copy })
    }
    setLoading(false); inputRef.current?.focus()
  }, [messages, loading, cvText, market])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  // ── CV upload ──────────────────────────────────────────────────────────
  async function handleCvFile(file: File) {
    setCvUploading(true)
    try {
      let text = ''
      if (file.name.endsWith('.txt') || file.type === 'text/plain') {
        text = await file.text()
      } else {
        const form = new FormData(); form.append('file', file)
        const res  = await fetch(API.extractPdf, { method: 'POST', body: form })
        const data = await res.json()
        text = data.text || ''
      }
      if (text) {
        sessionStorage.setItem(SS.cvText, text); setCvText(text); setHasCv(true)
        setMessages(prev => [...prev, { role: 'assistant', content: `CV uploaded! I'll use it to personalise job searches and score matches. What would you like to search for?` }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Could not read that file. Please try PDF, DOCX, or TXT.' }])
    }
    setCvUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function clearChat() { setMessages([]); sessionStorage.removeItem(SS.aiMessages) }
  const isEmpty = messages.length === 0

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes jlaw-dot  { 0%,60%,100%{opacity:.3;transform:translateY(0)} 30%{opacity:1;transform:translateY(-3px)} }
        @keyframes jlaw-pulse{ 0%,100%{box-shadow:0 0 0 0 rgba(109,40,217,.5)} 50%{box-shadow:0 0 0 10px rgba(109,40,217,0)} }
        @keyframes jlaw-slide-up{ from{opacity:0;transform:translateY(16px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes jlaw-ring { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(2.2);opacity:0} }
        @keyframes jlaw-bar  { 0%{transform:scaleY(.4)} 100%{transform:scaleY(1)} }
        @keyframes spin      { to{transform:rotate(360deg)} }
        .jlaw-fab:hover            { transform:scale(1.06) !important }
        .jlaw-close:hover          { background:rgba(255,255,255,.15) !important }
        .jlaw-clear:hover          { color:${c.danger} !important }
        .jlaw-send:hover:not(:disabled){ opacity:.85 }
        .jlaw-send:disabled        { opacity:.4;cursor:not-allowed }
        .jlaw-icon-btn:hover       { background:rgba(255,255,255,.12) !important }
        .jlaw-suggest:hover        { background:rgba(55,138,221,.12) !important;border-color:${c.accent} !important;color:${c.accent} !important }
        .jlaw-input:focus          { outline:none }
        .jlaw-msg-user { background:linear-gradient(135deg,${c.accent},${c.navy});border-radius:14px 14px 3px 14px }
        .jlaw-msg-ai   { background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:3px 14px 14px 14px }
        .jlaw-voice-btn:hover      { background:rgba(109,40,217,.25) !important }
        .jlaw-exit-voice:hover     { background:rgba(255,255,255,.12) !important }
        @media (max-width:480px)   { .jlaw-panel{width:calc(100vw - 24px) !important;right:12px !important;left:12px !important} }
        @media (max-height:500px)  { .jlaw-panel{top:8px !important;bottom:70px !important;height:auto !important;right:12px !important} .jlaw-fab{bottom:12px !important;right:12px !important;width:44px !important;height:44px !important} }
      `}</style>

      <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleCvFile(f) }} />

      {open && (
        <div className="jlaw-panel" style={{
          position: 'fixed', bottom: 80, right: 20, zIndex: 9999,
          width: 368, height: 540,
          background: 'linear-gradient(160deg,#0f1f33 0%,#0a1520 100%)',
          border: '1px solid rgba(255,255,255,.1)', borderRadius: 18,
          boxShadow: '0 24px 64px rgba(0,0,0,.5)',
          display: 'flex', flexDirection: 'column',
          animation: 'jlaw-slide-up .22s ease', overflow: 'hidden',
        }}>

          {/* ── Header ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,.08)', flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg,${c.ai},${c.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0, letterSpacing: '-.5px' }}>
              {AGENT_NAME.slice(0, 2)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: f.heading }}>
                {AGENT_NAME}<span style={{ fontWeight: 400, color: 'rgba(255,255,255,.4)', fontSize: 11, marginLeft: 6 }}>by Job-Lens</span>
              </div>
              <div style={{ color: hasCv ? c.success : 'rgba(255,255,255,.4)', fontSize: 11 }}>
                {cvUploading ? 'Uploading CV...' : hasCv ? '✓ CV loaded' : 'No CV · upload for better results'}
              </div>
            </div>

            {/* Upload CV */}
            <button className="jlaw-icon-btn" onClick={() => fileInputRef.current?.click()} disabled={cvUploading} title="Upload CV"
              style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: hasCv ? 'rgba(29,158,117,.2)' : 'rgba(255,255,255,.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .2s', color: hasCv ? c.success : 'rgba(255,255,255,.5)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="18" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><polyline points="9 15 12 12 15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>

            {/* Voice mode button */}
            {(voiceSupported && ttsSupported) && !voiceMode && (
              <button className="jlaw-voice-btn" onClick={enterVoiceMode} title="Talk to Kira"
                style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'rgba(109,40,217,.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .2s', color: `${c.ai}` }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="2"/><path d="M5 10a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="9" y1="21" x2="15" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            )}

            {messages.length > 0 && !voiceMode && (
              <button className="jlaw-clear" onClick={clearChat} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.3)', fontSize: 11, padding: '2px 6px', borderRadius: 6, transition: 'color .2s', fontFamily: f.body }}>Clear</button>
            )}
            <button className="jlaw-close" onClick={() => setOpen(false)} style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,.08)', cursor: 'pointer', color: 'rgba(255,255,255,.6)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .2s', flexShrink: 0 }}>✕</button>
          </div>

          {/* ── Voice mode UI ── */}
          {voiceMode ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', position: 'relative' }}>

              {/* Exit voice */}
              <button className="jlaw-exit-voice" onClick={exitVoiceMode}
                style={{ position: 'absolute', top: 12, right: 12, padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.6)', fontSize: 11, cursor: 'pointer', fontFamily: f.body, transition: 'background .2s' }}>
                Exit voice
              </button>

              {/* Language toggle */}
              <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 5, flexWrap: 'wrap', maxWidth: 180 }}>
                {VOICE_LANGS[market]?.map(lang => (
                  <button key={lang.code} onClick={() => {
                    setVoiceLang(lang.code)
                    recognitionRef.current?.abort()
                  }} style={{
                    padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    background: voiceLang === lang.code ? 'rgba(109,40,217,.55)' : 'rgba(255,255,255,.08)',
                    color: voiceLang === lang.code ? '#fff' : 'rgba(255,255,255,.45)',
                    fontSize: 11, fontFamily: f.body, transition: 'all .15s',
                  }}>{lang.label}</button>
                ))}
              </div>

              {/* Pulsing avatar */}
              <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                {/* Rings — only visible when listening */}
                {voiceState === 'listening' && [1, 2, 3].map(i => (
                  <div key={i} style={{
                    position: 'absolute', borderRadius: '50%',
                    border: `1px solid rgba(109,40,217,${0.5 - i * 0.12})`,
                    width: 120 + i * 28, height: 120 + i * 28,
                    animation: `jlaw-ring 2s ease-out infinite`,
                    animationDelay: `${i * 0.4}s`,
                  }} />
                ))}
                {/* Avatar circle */}
                <div style={{
                  width: 90, height: 90, borderRadius: '50%',
                  background: `linear-gradient(135deg,${c.ai},${c.accent})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: voiceState === 'listening'
                    ? `0 0 0 6px rgba(109,40,217,.2), 0 0 40px rgba(109,40,217,.4)`
                    : `0 0 20px rgba(109,40,217,.3)`,
                  transition: 'box-shadow .4s ease',
                  zIndex: 1,
                }}>
                  {voiceState === 'speaking' || voiceState === 'greeting' ? (
                    <VoiceWaveform active />
                  ) : voiceState === 'processing' ? (
                    <span style={{ width: 20, height: 20, border: '2.5px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .8s linear infinite' }} />
                  ) : (
                    <span style={{ fontFamily: f.heading, fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-1px' }}>{AGENT_NAME.slice(0, 2)}</span>
                  )}
                </div>
              </div>

              {/* State label */}
              <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 13, fontWeight: 600, marginBottom: 12, height: 20, fontFamily: f.body }}>
                {VOICE_STATE_LABEL[voiceState]}
              </div>

              {/* Live transcript */}
              <div style={{
                minHeight: 44, maxHeight: 80, overflowY: 'auto',
                background: 'rgba(255,255,255,.05)', borderRadius: 12,
                padding: '8px 14px', width: '100%',
                color: interimText ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.75)',
                fontSize: 13, lineHeight: 1.5, textAlign: 'center',
                fontFamily: f.body, fontStyle: interimText ? 'italic' : 'normal',
                transition: 'color .2s',
              }}>
                {interimText || voiceTranscript || (voiceState === 'listening' ? 'Say something...' : ' ')}
              </div>

              {/* Waveform indicator for speaking */}
              {(voiceState === 'speaking' || voiceState === 'greeting') && (
                <div style={{ marginTop: 16 }}><VoiceWaveform active /></div>
              )}

              <div style={{ marginTop: 'auto', paddingTop: 16, color: 'rgba(255,255,255,.25)', fontSize: 11, textAlign: 'center', fontFamily: f.body }}>
                Tap "Exit voice" to return to text chat
              </div>
            </div>
          ) : (
            <>
              {/* ── Text messages ── */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
                {isEmpty ? (
                  <div style={{ paddingTop: 8 }}>
                    <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 12, marginBottom: 12, lineHeight: 1.6 }}>
                      Hi! I'm {AGENT_NAME}, your AI career assistant. I can find live jobs, score your CV, analyse skill gaps, and give salary info for {market === 'in' ? 'Indian' : 'DACH'} roles.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(SUGGESTIONS[market] || SUGGESTIONS.eu).map(s => (
                        <button key={s} className="jlaw-suggest" onClick={() => sendMessage(s)} style={{ textAlign: 'left', padding: '7px 12px', borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.55)', fontSize: 12, cursor: 'pointer', transition: 'all .15s', fontFamily: f.body }}>{s}</button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 8, alignItems: 'flex-end', gap: 6 }}>
                        {msg.role === 'assistant' && (
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: `linear-gradient(135deg,${c.ai},${c.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff', flexShrink: 0, letterSpacing: '-.3px' }}>{AGENT_NAME.slice(0, 2)}</div>
                        )}
                        <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div className={msg.role === 'user' ? 'jlaw-msg-user' : 'jlaw-msg-ai'} style={{ padding: '8px 11px', color: '#fff', fontSize: 13, lineHeight: 1.55, fontFamily: f.body }}>
                            {msg.status ? (
                              <span style={{ color: 'rgba(255,255,255,.5)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <TypingDots /> {STATUS_LABELS[msg.status] || 'Thinking...'}
                              </span>
                            ) : msg.role === 'assistant' && i === messages.length - 1 && msg.content === '' && !msg.actions?.length ? (
                              <TypingDots />
                            ) : (
                              <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                            )}
                          </div>
                          {msg.actions?.map((a, ai) => (
                            <a key={ai} href={a.href} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, textDecoration: 'none', background: 'rgba(55,138,221,.15)', border: '1px solid rgba(55,138,221,.35)', color: '#fff', fontSize: 12, fontFamily: f.body, transition: 'background .15s' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(55,138,221,.28)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(55,138,221,.15)')}>
                              <span style={{ fontSize: 14 }}>{FEATURE_ICONS[a.feature] || '→'}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, color: c.accent }}>{a.label} →</div>
                                <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 11, marginTop: 1 }}>{a.reason}</div>
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

              {/* ── Text input ── */}
              <div style={{ padding: '10px 12px 12px', borderTop: '1px solid rgba(255,255,255,.08)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, padding: '7px 8px' }}>
                  <textarea ref={inputRef} className="jlaw-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                    placeholder={`Ask ${AGENT_NAME} about jobs, salaries, CV match...`} disabled={loading} rows={1}
                    style={{ flex: 1, resize: 'none', border: 'none', background: 'transparent', fontFamily: f.body, fontSize: 13, color: '#fff', lineHeight: 1.5, maxHeight: 80, overflowY: 'auto' }} />
                  <button className="jlaw-send" onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
                    style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: g.button, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, transition: 'opacity .2s' }}>
                    {loading ? <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .8s linear infinite' }} /> : '↑'}
                  </button>
                </div>
                <div style={{ textAlign: 'center', marginTop: 5, color: 'rgba(255,255,255,.2)', fontSize: 10 }}>
                  {CREDIT_COST.aiChat} credit per message · Enter to send
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── FAB ── */}
      <button className="jlaw-fab" onClick={() => setOpen(o => !o)}
        style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999, width: 54, height: 54, borderRadius: '50%', border: 'none', background: `linear-gradient(135deg,${c.ai},${c.accent})`, cursor: 'pointer', boxShadow: '0 4px 20px rgba(109,40,217,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform .2s', animation: pulse ? 'jlaw-pulse 2s ease-in-out 3' : 'none' }}
        title={`Chat with ${AGENT_NAME}`}>
        {open
          ? <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/></svg>
          : <span style={{ fontFamily: f.heading, fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-.5px' }}>{AGENT_NAME.slice(0, 2)}</span>
        }
      </button>
    </>
  )
}
