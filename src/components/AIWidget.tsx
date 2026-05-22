'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { theme } from '@/lib/theme'
import { SS, API } from '@/lib/constants'
import { useLanguage } from '@/lib/i18n'

const { colors: c, fonts: f, gradients: g } = theme

interface Job {
  title: string; company: string; location: string
  salary_min: number | null; salary_max: number | null
  apply_url: string; posted: string; description: string
}
interface FeatureAction { feature: string; label: string; href: string; reason: string }
interface JobsSearch { q: string; location: string }
interface Msg { role: 'user' | 'assistant'; content: string; status?: string; jobs?: Job[]; jobsTotal?: number; jobsSearch?: JobsSearch; action?: FeatureAction }
type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking'

const AGENT = 'Kira'

const GREETINGS: Record<string, string> = {
  eu_DE: 'Hallo! Ich bin Kira. Ich finde Jobs, bewerte deinen Lebenslauf und helfe dir bei der Bewerbung.',
  eu_EN: "Hi! I'm Kira. I can find live jobs, score your CV match, and guide your application.",
  in_EN: "Hi! I'm Kira. I can find jobs across India, score your CV, and help you land the right role.",
}

const SUGGESTIONS: Record<string, string[]> = {
  eu_DE: [
    'Softwareentwickler Jobs in München',
    'Remote Marketing Jobs in Deutschland',
    'Wie gut passt mein Lebenslauf zu diesen Jobs?',
  ],
  eu_EN: [
    'Software developer jobs in Munich',
    'Remote jobs in Germany',
    'Does my CV match a Senior React Developer role?',
  ],
  in_EN: [
    'Software engineer jobs in Bangalore',
    'Product manager roles in Hyderabad',
    'What am I missing for a senior dev role?',
  ],
}

const STATUS_LABELS: Record<string, Record<string, string>> = {
  eu_DE: { search_jobs: 'Suche Jobs...' },
  eu_EN: { search_jobs: 'Searching jobs...' },
  in_EN: { search_jobs: 'Searching jobs...' },
}

const VOICE_LABELS: Record<VoiceState, Record<string, string>> = {
  idle:       { eu_DE: 'Tippe auf das Mikrofon', eu_EN: 'Tap mic to speak', in_EN: 'Tap mic to speak' },
  listening:  { eu_DE: 'Ich höre zu…',           eu_EN: 'Listening…',       in_EN: 'Listening…'       },
  processing: { eu_DE: 'Kira denkt nach…',       eu_EN: 'Kira is thinking…',in_EN: 'Kira is thinking…'},
  speaking:   { eu_DE: 'Kira spricht…',          eu_EN: 'Kira is speaking…',in_EN: 'Kira is speaking…'},
}

function fmtSalary(min: number | null, max: number | null, market: 'eu' | 'in'): string {
  if (!min && !max) return ''
  if (market === 'in') {
    const lo = min ? `₹${Math.round(min / 100000)}L` : ''
    const hi = max ? `₹${Math.round(max / 100000)}L` : ''
    return lo && hi ? `${lo} – ${hi} pa` : lo || hi
  }
  const lo = min ? `€${Math.round(min / 1000)}k` : ''
  const hi = max ? `€${Math.round(max / 1000)}k` : ''
  return lo && hi ? `${lo} – ${hi}` : lo || hi
}

// ── Mic SVG ──────────────────────────────────────────────────────────────────
function MicIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3"/>
      <path d="M5 10a7 7 0 0 0 14 0"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
      <line x1="9"  y1="22" x2="15" y2="22"/>
    </svg>
  )
}

// ── Voice overlay animations ──────────────────────────────────────────────────
function ListeningAnim({ accent }: { accent: string }) {
  return (
    <div style={{ position: 'relative', width: 88, height: 88, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          position: 'absolute',
          width: 40 + i * 16, height: 40 + i * 16,
          borderRadius: '50%',
          border: `1.5px solid ${accent}`,
          animation: `kira-ring 2s ease-out ${i * 0.45}s infinite`,
        }}/>
      ))}
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${accent}22`, border: `2px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        <MicIcon size={24} color={accent}/>
      </div>
    </div>
  )
}

function ProcessingAnim({ accent }: { accent: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', height: 56 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: accent, animation: `kira-dot 1.2s ease-in-out ${i * 0.2}s infinite` }}/>
      ))}
    </div>
  )
}

function SpeakingAnim({ accent }: { accent: string }) {
  const heights = [0.35, 0.65, 1, 0.75, 1, 0.55, 0.8, 0.4, 0.7, 0.5]
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: 56 }}>
      {heights.map((h, i) => (
        <div key={i} style={{
          width: 4, borderRadius: 2, background: accent,
          height: `${h * 40}px`,
          animation: `kira-wave 0.6s ease-in-out ${i * 0.07}s infinite alternate`,
        }}/>
      ))}
    </div>
  )
}

function IdleAnim({ accent }: { accent: string }) {
  return (
    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,.05)', border: '1.5px solid rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'kira-idle-pulse 2.5s ease-in-out infinite' }}>
      <MicIcon size={22} color="rgba(255,255,255,.4)"/>
    </div>
  )
}

export default function AIWidget({ market = 'eu' }: { market?: 'eu' | 'in' }) {
  const { lang }   = useLanguage()
  const router     = useRouter()
  const key    = market === 'in' ? 'in_EN' : `eu_${lang}`
  const accent = market === 'in' ? '#FF9933' : c.accent

  // ── Chat state ───────────────────────────────────────────────────────────────
  const [open,        setOpen]        = useState(false)
  const [msgs,        setMsgs]        = useState<Msg[]>([])
  const [input,       setInput]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [cvName,      setCvName]      = useState('')
  const [cvUploading, setCvUploading] = useState(false)

  // ── Voice state ───────────────────────────────────────────────────────────────
  const [voiceMode,  setVoiceMode]  = useState(false)
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const bottomRef        = useRef<HTMLDivElement>(null)
  const inputRef         = useRef<HTMLTextAreaElement>(null)
  const cvRef            = useRef('')
  const fileInputRef     = useRef<HTMLInputElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef   = useRef<any>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef   = useRef<Blob[]>([])
  const audioRef         = useRef<HTMLAudioElement | null>(null)
  const audioCtxRef      = useRef<AudioContext | null>(null)
  const voiceModeRef     = useRef(false)
  const transcriptRef    = useRef('')
  const listenTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep refs in sync
  useEffect(() => { voiceModeRef.current = voiceMode }, [voiceMode])

  // ── Init ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const cv = sessionStorage.getItem(SS.cvText) || ''
    cvRef.current = cv
    if (cv) setCvName('CV ready')
    try {
      const saved = sessionStorage.getItem(SS.aiMessages)
      if (saved) setMsgs(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  useEffect(() => {
    if (msgs.length) sessionStorage.setItem(SS.aiMessages, JSON.stringify(msgs.slice(-20)))
  }, [msgs])

  useEffect(() => {
    if (open && !voiceMode) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open, voiceMode])

  // ── CV upload ─────────────────────────────────────────────────────────────────
  async function handleCvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCvUploading(true)
    try {
      let text = ''
      if (file.name.endsWith('.txt')) {
        text = await file.text()
      } else {
        const form = new FormData()
        form.append('file', file)
        const res  = await fetch(API.extractPdf, { method: 'POST', body: form })
        const data = await res.json()
        if (!data.text) throw new Error('empty')
        text = data.text
      }
      cvRef.current = text
      sessionStorage.setItem(SS.cvText, text)
      const label = file.name.length > 22 ? file.name.slice(0, 19) + '…' : file.name
      setCvName(label)
      setMsgs(prev => [...prev, { role: 'assistant', content: lang === 'DE'
        ? `Lebenslauf "${label}" geladen! Ich kann jetzt Jobs für dich bewerten.`
        : `Got your CV! I can now score job matches and tailor your applications.` }])
    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', content: 'Could not read that file. Try a PDF, Word doc, or text file.' }])
    }
    setCvUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Audio unlock (iOS) ────────────────────────────────────────────────────────
  function unlockAudio() {
    if (audioCtxRef.current) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ACtx = window.AudioContext || (window as any).webkitAudioContext
      if (ACtx) { audioCtxRef.current = new ACtx(); audioCtxRef.current.resume() }
    } catch { /* not supported */ }
  }

  // ── Audio playback ────────────────────────────────────────────────────────────
  function stopAudio() {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
  }

  function playTts(text: string): Promise<void> {
    stopAudio()
    if (!text.trim()) return Promise.resolve()
    return new Promise<void>((resolve) => {
      fetch(API.aiTts, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 1000), voice: 'nova' }),
      }).then(async res => {
        if (!res.ok) { resolve(); return }
        const blob = await res.blob()
        const url  = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audioRef.current = audio
        audio.onended = () => { URL.revokeObjectURL(url); audioRef.current = null; resolve() }
        audio.onerror = () => { URL.revokeObjectURL(url); audioRef.current = null; resolve() }
        audio.play().catch(() => resolve())
      }).catch(() => resolve())
    })
  }

  // ── STT helpers ───────────────────────────────────────────────────────────────
  function getSttLang() {
    if (market === 'in') return 'en-IN'
    return lang === 'DE' ? 'de-DE' : 'en-GB'
  }

  function getWhisperLang() {
    if (market === 'in') return 'en'
    return lang === 'DE' ? 'de' : 'en'
  }

  function getSupportedMimeType() {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg']
    return types.find(t => MediaRecorder.isTypeSupported(t)) || ''
  }

  // ── Voice mode control ────────────────────────────────────────────────────────
  function enterVoiceMode() {
    if (loading) return
    unlockAudio() // must be synchronous in the touch handler
    voiceModeRef.current = true
    setVoiceMode(true)
    setVoiceState('idle')
    setTimeout(() => startListening(), 150)
  }

  function exitVoiceMode() {
    voiceModeRef.current = false
    setVoiceMode(false)
    setVoiceState('idle')
    stopListening()
    stopAudio()
  }

  // ── Listening ─────────────────────────────────────────────────────────────────
  function startListening() {
    if (!voiceModeRef.current) return

    if (listenTimerRef.current) clearTimeout(listenTimerRef.current)
    setVoiceState('listening')

    // Hard 15s escape — prevents any stuck-listening state
    listenTimerRef.current = setTimeout(() => {
      stopListening()
      if (voiceModeRef.current) setVoiceState('idle')
    }, 15_000)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SR) {
      const rec = new SR()
      rec.lang           = getSttLang()
      rec.continuous     = false   // one utterance — no loop risk
      rec.interimResults = false
      transcriptRef.current = ''

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onresult = (e: any) => {
        if (listenTimerRef.current) clearTimeout(listenTimerRef.current)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const t = Array.from(e.results as unknown[]).map((r: any) => r[0].transcript).join('')
        transcriptRef.current = t
      }

      rec.onend = () => {
        if (listenTimerRef.current) clearTimeout(listenTimerRef.current)
        recognitionRef.current = null
        const t = transcriptRef.current.trim()
        transcriptRef.current = ''
        if (t && voiceModeRef.current) {
          setVoiceState('processing')
          void send(t)
        } else if (voiceModeRef.current) {
          // No speech heard — wait briefly and re-arm (not a loop: requires a browser event each time)
          setTimeout(() => { if (voiceModeRef.current) startListening() }, 800)
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onerror = (e: any) => {
        if (listenTimerRef.current) clearTimeout(listenTimerRef.current)
        recognitionRef.current = null
        if (e.error === 'no-speech' && voiceModeRef.current) {
          setTimeout(() => { if (voiceModeRef.current) startListening() }, 800)
        } else {
          // network / aborted / not-allowed → go idle, don't loop
          setVoiceState('idle')
        }
      }

      recognitionRef.current = rec
      try { rec.start() } catch { setVoiceState('idle') }

    } else {
      // Whisper fallback (iOS Safari, Firefox)
      if (listenTimerRef.current) clearTimeout(listenTimerRef.current)
      void startWhisperRecording()
    }
  }

  function stopListening() {
    if (listenTimerRef.current) clearTimeout(listenTimerRef.current)
    try { recognitionRef.current?.stop() } catch { /* ignore */ }
    recognitionRef.current = null
    try { mediaRecorderRef.current?.stop() } catch { /* ignore */ }
  }

  // ── Whisper path (iOS / Firefox) ──────────────────────────────────────────────
  async function startWhisperRecording() {
    if (!voiceModeRef.current) return
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getSupportedMimeType()
      const mr       = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      audioChunksRef.current = []

      // Silence detection via AnalyserNode — auto-stops after 2s of silence post-speech
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ACtx     = window.AudioContext || (window as any).webkitAudioContext
      const ctx      = new ACtx()
      const analyser = ctx.createAnalyser()
      const source   = ctx.createMediaStreamSource(stream)
      source.connect(analyser)
      analyser.fftSize = 256
      const data = new Uint8Array(analyser.frequencyBinCount)

      let speechDetected = false
      let silenceStart   = 0

      const silenceCheck = setInterval(() => {
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        if (avg > 8) {
          speechDetected = true
          silenceStart   = 0
        } else if (speechDetected) {
          if (!silenceStart) silenceStart = Date.now()
          if (Date.now() - silenceStart > 2000) {
            clearInterval(silenceCheck)
            void ctx.close()
            mr.stop()
          }
        }
      }, 100)

      // 30s hard cap
      const maxTimer = setTimeout(() => { clearInterval(silenceCheck); void ctx.close(); mr.stop() }, 30_000)

      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = async () => {
        clearTimeout(maxTimer)
        clearInterval(silenceCheck)
        stream.getTracks().forEach(t => t.stop())
        if (!voiceModeRef.current) return
        setVoiceState('processing')
        try {
          const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || 'audio/webm' })
          const ext  = (mr.mimeType || '').includes('mp4') ? 'mp4' : (mr.mimeType || '').includes('ogg') ? 'ogg' : 'webm'
          const form = new FormData()
          form.append('file', blob, `audio.${ext}`)
          form.append('language', getWhisperLang())
          const res  = await fetch(API.aiStt, { method: 'POST', body: form })
          const d    = await res.json()
          if (d.text?.trim() && voiceModeRef.current) {
            void send(d.text.trim())
          } else if (voiceModeRef.current) {
            setTimeout(() => startListening(), 500)
          }
        } catch {
          if (voiceModeRef.current) setTimeout(() => startListening(), 500)
        }
      }

      mediaRecorderRef.current = mr
      mr.start()
    } catch {
      // Mic permission denied or unavailable
      setVoiceState('idle')
    }
  }

  // ── Tailor CV ─────────────────────────────────────────────────────────────────
  function tailorCv(job: Job) {
    if (!cvRef.current) {
      setMsgs(prev => [...prev, { role: 'assistant', content: lang === 'DE'
        ? 'Lade deinen Lebenslauf hoch (Büroklammer oben) — dann passe ich ihn für diese Stelle an.'
        : 'Upload your CV using the clip icon above — then I can tailor it for this role.' }])
      return
    }
    sessionStorage.setItem(SS.cvbJob, JSON.stringify({
      job_title:       job.title,
      employer_name:   job.company,
      job_city:        job.location,
      job_description: job.description,
      job_apply_link:  job.apply_url,
    }))
    router.push(market === 'in' ? '/in/cv-builder' : '/app/cv-builder')
  }

  // ── Send ──────────────────────────────────────────────────────────────────────
  async function send(text: string) {
    if (!text.trim() || loading) return

    const isVoice = voiceModeRef.current  // capture now — don't re-read later

    const userMsg: Msg = { role: 'user', content: text.trim() }
    const history = [...msgs, userMsg]
    setMsgs(history)
    setInput('')
    setLoading(true)
    if (isVoice) setVoiceState('processing')

    const idx = history.length
    setMsgs(prev => [...prev, { role: 'assistant', content: '' }])

    let assembled = ''
    try {
      const res = await fetch(API.aiChat, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
          cvText: cvRef.current,
          market,
        }),
      })

      if (!res.ok || !res.body) throw new Error('Failed')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const evt = JSON.parse(line.slice(6))
            if (evt.text) {
              assembled += evt.text
              setMsgs(prev => {
                const cp = [...prev]
                cp[idx] = { role: 'assistant', content: assembled, jobs: cp[idx]?.jobs, action: cp[idx]?.action }
                return cp
              })
            } else if (evt.jobs) {
              setMsgs(prev => {
                const cp = [...prev]
                cp[idx] = { ...cp[idx], jobs: evt.jobs as Job[], jobsTotal: evt.total as number | undefined, jobsSearch: { q: String(evt.query || ''), location: String(evt.location || '') }, status: undefined }
                return cp
              })
            } else if (evt.action) {
              setMsgs(prev => {
                const cp = [...prev]
                cp[idx] = { ...cp[idx], action: evt.action as FeatureAction, status: undefined }
                return cp
              })
            } else if (evt.status) {
              setMsgs(prev => {
                const cp = [...prev]
                cp[idx] = { role: 'assistant', content: '', status: evt.status as string }
                return cp
              })
            } else if (evt.error) {
              setMsgs(prev => {
                const cp = [...prev]
                cp[idx] = { role: 'assistant', content: evt.error as string }
                return cp
              })
            }
          } catch { /* ignore malformed chunk */ }
        }
      }
    } catch {
      setMsgs(prev => {
        const cp = [...prev]
        cp[idx] = { role: 'assistant', content: 'Connection error. Please try again.' }
        return cp
      })
    }

    setLoading(false)

    if (isVoice && voiceModeRef.current) {
      // Voice mode: play TTS, await completion, then re-arm listening
      setVoiceState('speaking')
      if (assembled) await playTts(assembled)
      if (voiceModeRef.current) {
        setVoiceState('idle')
        setTimeout(() => startListening(), 400)
      }
    }
    // Text mode: no TTS, just restore focus
    if (!isVoice) inputRef.current?.focus()
  }

  const greeting    = GREETINGS[key]    || GREETINGS['eu_EN']
  const suggestions = SUGGESTIONS[key]  || SUGGESTIONS['eu_EN']
  const statusMap   = STATUS_LABELS[key] || STATUS_LABELS['eu_EN']
  const voiceLabel  = VOICE_LABELS[voiceState]?.[key] || VOICE_LABELS[voiceState]?.['eu_EN'] || ''

  return (
    <>
      <style>{`
        @keyframes kira-slide     { from{opacity:0;transform:translateY(12px) scale(.97)} to{opacity:1;transform:none} }
        @keyframes kira-dot       { 0%,60%,100%{opacity:.3;transform:translateY(0)} 30%{opacity:1;transform:translateY(-4px)} }
        @keyframes kira-spin      { to{transform:rotate(360deg)} }
        @keyframes kira-ring      { 0%{transform:scale(1);opacity:.55} 100%{transform:scale(2.1);opacity:0} }
        @keyframes kira-wave      { 0%{transform:scaleY(0.3)} 100%{transform:scaleY(1)} }
        @keyframes kira-idle-pulse{ 0%,100%{opacity:.35} 50%{opacity:.75} }
        .kira-fab:hover           { transform:scale(1.08) !important }
        .kira-send:hover:not(:disabled){ opacity:.85 }
        .kira-send:disabled       { opacity:.4;cursor:not-allowed }
        .kira-suggest:hover       { border-color:${accent} !important;color:${accent} !important;background:rgba(55,138,221,.08) !important }
        .kira-close:hover         { background:rgba(255,255,255,.15) !important }
        .kira-input:focus         { outline:none }
        .kira-job-card:hover      { border-color:${accent}66 !important;background:rgba(255,255,255,.08) !important }
        .kira-apply:hover         { opacity:.85 }
        .kira-icon-btn:hover      { background:rgba(255,255,255,.15) !important }
        .kira-mic-btn:hover       { background:rgba(255,255,255,.12) !important }
        @media (max-width:480px) {
          .kira-panel { width:calc(100vw - 24px) !important;right:12px !important;left:12px !important;height:70vh !important;bottom:74px !important }
        }
      `}</style>

      {/* ── Panel ── */}
      {open && (
        <div className="kira-panel" style={{
          position: 'fixed', bottom: 80, right: 20, zIndex: 9999,
          width: 360, height: 520,
          background: 'linear-gradient(160deg,#0f1f33 0%,#0a1520 100%)',
          border: '1px solid rgba(255,255,255,.1)', borderRadius: 18,
          boxShadow: '0 20px 60px rgba(0,0,0,.5)',
          display: 'flex', flexDirection: 'column',
          animation: 'kira-slide .2s ease', overflow: 'hidden',
        }}>

          {/* ── Header ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,.07)', flexShrink: 0 }}>
            {/* Avatar */}
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg,${accent}cc,${accent}55)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 44 44">
                <circle cx="20" cy="20" r="13" fill="none" stroke="white" strokeWidth="2.8"/>
                <circle cx="20" cy="20" r="3" fill="white"/>
                <line x1="28" y1="28" x2="36" y2="36" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
              </svg>
            </div>

            {/* Name + status */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: f.heading }}>{AGENT}</div>
              <div style={{ fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ color: accent }}>AI Career Assistant</span>
                {cvName && (
                  <span style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span>·</span>
                    <svg width="8" height="8" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#4ade80"/></svg>
                    <span style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cvName}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }} onChange={handleCvUpload}/>

            {/* Upload CV */}
            <button title={lang === 'DE' ? 'Lebenslauf hochladen' : 'Upload CV'} onClick={() => fileInputRef.current?.click()} disabled={cvUploading}
              style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: cvName ? `${accent}22` : 'rgba(255,255,255,.08)', cursor: 'pointer', color: cvName ? accent : 'rgba(255,255,255,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
              {cvUploading
                ? <span style={{ width: 10, height: 10, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'kira-spin .8s linear infinite' }}/>
                : <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 3v10M6 7l4-4 4 4"/><path d="M3 17h14"/>
                  </svg>
              }
            </button>

            {/* Mic / voice mode toggle */}
            <button
              className="kira-mic-btn"
              title={voiceMode ? 'End voice' : lang === 'DE' ? 'Sprachassistentin' : 'Voice mode'}
              onClick={voiceMode ? exitVoiceMode : enterVoiceMode}
              style={{
                width: 28, height: 28, borderRadius: 7, border: 'none',
                background: voiceMode ? `${accent}33` : 'rgba(255,255,255,.08)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all .15s',
                boxShadow: voiceMode ? `0 0 10px ${accent}55` : 'none',
              }}>
              {voiceMode
                ? <svg width="12" height="12" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke={accent} strokeWidth="2.2" strokeLinecap="round"/></svg>
                : <MicIcon size={13} color="rgba(255,255,255,.55)"/>
              }
            </button>

            {/* Clear */}
            {msgs.length > 0 && !voiceMode && (
              <button onClick={() => { setMsgs([]); sessionStorage.removeItem(SS.aiMessages) }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.3)', fontSize: 10, cursor: 'pointer', padding: '2px 4px', fontFamily: f.body, flexShrink: 0 }}>
                Clear
              </button>
            )}

            {/* Close */}
            <button className="kira-close" onClick={() => { setOpen(false); if (voiceMode) exitVoiceMode() }}
              style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,.08)', cursor: 'pointer', color: 'rgba(255,255,255,.6)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              ✕
            </button>
          </div>

          {/* ── Voice overlay ── */}
          {voiceMode ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '24px 20px' }}>
              {/* Animated state indicator */}
              {voiceState === 'listening'  && <ListeningAnim  accent={accent}/>}
              {voiceState === 'processing' && <ProcessingAnim accent={accent}/>}
              {voiceState === 'speaking'   && <SpeakingAnim   accent={accent}/>}
              {voiceState === 'idle'       && <IdleAnim        accent={accent}/>}

              {/* State label */}
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', fontFamily: f.body, textAlign: 'center' }}>
                {voiceLabel}
              </div>

              {/* Tap-to-speak in idle state */}
              {voiceState === 'idle' && (
                <button onClick={() => startListening()}
                  style={{ padding: '9px 22px', borderRadius: 20, border: `1.5px solid ${accent}55`, background: `${accent}15`, color: accent, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: f.heading, transition: 'all .15s' }}>
                  {lang === 'DE' ? 'Sprechen' : 'Speak'}
                </button>
              )}

              {/* Transcript count hint */}
              {msgs.length > 0 && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.2)', fontFamily: f.body }}>
                  {msgs.filter(m => m.role === 'user').length} {lang === 'DE' ? 'Nachrichten' : 'messages'} · {lang === 'DE' ? 'Beenden um Verlauf zu sehen' : 'End voice to see transcript'}
                </div>
              )}

              {/* End voice */}
              <button onClick={exitVoiceMode}
                style={{ padding: '8px 20px', borderRadius: 20, border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.4)', fontSize: 12, cursor: 'pointer', fontFamily: f.body, transition: 'all .15s' }}>
                {lang === 'DE' ? 'Beenden' : 'End voice'}
              </button>
            </div>

          ) : (
            /* ── Messages ── */
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
              {msgs.length === 0 ? (
                <div>
                  <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 12, lineHeight: 1.65, marginBottom: 14 }}>{greeting}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {suggestions.map(s => (
                      <button key={s} className="kira-suggest" onClick={() => send(s)}
                        style={{ textAlign: 'left', padding: '7px 12px', borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.55)', fontSize: 12, cursor: 'pointer', transition: 'all .15s', fontFamily: f.body }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {msgs.map((m, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 6, alignItems: 'flex-end' }}>
                        {m.role === 'assistant' && (
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: `linear-gradient(135deg,${accent},${accent}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="10" height="10" viewBox="0 0 44 44">
                              <circle cx="20" cy="20" r="13" fill="none" stroke="white" strokeWidth="3"/>
                              <circle cx="20" cy="20" r="3" fill="white"/>
                              <line x1="28" y1="28" x2="36" y2="36" stroke="white" strokeWidth="4" strokeLinecap="round"/>
                            </svg>
                          </div>
                        )}
                        {(m.content || m.status || (!m.jobs && !m.action)) && (
                          <div style={{
                            maxWidth: '78%', padding: '8px 12px', fontSize: 13, lineHeight: 1.55, color: '#fff', fontFamily: f.body,
                            borderRadius: m.role === 'user' ? '14px 14px 3px 14px' : '3px 14px 14px 14px',
                            background: m.role === 'user' ? `linear-gradient(135deg,${accent}cc,${accent}88)` : 'rgba(255,255,255,.07)',
                            border: m.role === 'assistant' ? '1px solid rgba(255,255,255,.08)' : 'none',
                          }}>
                            {m.status ? (
                              <span style={{ color: 'rgba(255,255,255,.5)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                <span style={{ display: 'inline-flex', gap: 3 }}>
                                  {[0, 1, 2].map(j => <span key={j} style={{ width: 4, height: 4, borderRadius: '50%', background: accent, display: 'inline-block', animation: `kira-dot 1.2s ease-in-out ${j * .2}s infinite` }}/>)}
                                </span>
                                {statusMap[m.status] || 'Thinking...'}
                              </span>
                            ) : i === msgs.length - 1 && m.role === 'assistant' && m.content === '' ? (
                              <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
                                {[0, 1, 2].map(j => <span key={j} style={{ width: 4, height: 4, borderRadius: '50%', background: accent, display: 'inline-block', animation: `kira-dot 1.2s ease-in-out ${j * .2}s infinite` }}/>)}
                              </span>
                            ) : (
                              <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Job cards */}
                      {m.jobs && m.jobs.length > 0 && (
                        <div style={{ marginTop: 6, marginLeft: 28, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', marginBottom: 2, fontFamily: f.body }}>
                            {m.jobsTotal && m.jobsTotal > m.jobs.length
                              ? `Showing ${m.jobs.length} of ${m.jobsTotal.toLocaleString()} jobs`
                              : `${m.jobs.length} job${m.jobs.length !== 1 ? 's' : ''} found`}
                          </div>
                          {m.jobs.map((job, ji) => {
                            const salary = fmtSalary(job.salary_min, job.salary_max, market)
                            return (
                              <div key={ji} className="kira-job-card" style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: '10px 12px', transition: 'all .15s' }}>
                                <div style={{ fontWeight: 700, fontSize: 12, color: '#fff', fontFamily: f.heading, lineHeight: 1.3 }}>{job.title}</div>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginTop: 3, fontFamily: f.body }}>{job.company} · {job.location}</div>
                                {salary && <div style={{ fontSize: 11, color: accent, marginTop: 3, fontWeight: 600 }}>{salary}</div>}
                                <div style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
                                  {job.apply_url && (
                                    <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="kira-apply"
                                      style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: accent, color: '#fff', textDecoration: 'none', fontWeight: 600, transition: 'opacity .15s' }}>
                                      View Job →
                                    </a>
                                  )}
                                  <button onClick={() => tailorCv(job)}
                                    style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'rgba(255,255,255,.1)', border: `1px solid ${accent}55`, color: '#fff', cursor: 'pointer', fontWeight: 600, fontFamily: f.body }}>
                                    Tailor CV
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                          {(() => {
                            const q   = m.jobsSearch?.q || ''
                            const loc = m.jobsSearch?.location || ''
                            const base = market === 'in' ? '/in/jobs' : '/app/jobs'
                            const params = new URLSearchParams()
                            if (q)   params.set('q', q)
                            if (loc && market === 'in') params.set('location', loc)
                            const href = params.toString() ? `${base}?${params}` : base
                            return (
                              <Link href={href}
                                style={{ display: 'block', marginTop: 2, padding: '7px 12px', borderRadius: 8, border: `1px solid ${accent}44`, color: accent, textDecoration: 'none', fontSize: 11, fontWeight: 600, textAlign: 'center', fontFamily: f.heading }}>
                                Browse all {q ? `"${q}"` : ''} jobs →
                              </Link>
                            )
                          })()}
                        </div>
                      )}

                      {/* Feature action button */}
                      {m.action && (
                        <div style={{ marginTop: 6, marginLeft: 28 }}>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginBottom: 5, fontFamily: f.body }}>{m.action.reason}</div>
                          <Link href={m.action.href}
                            style={{ display: 'inline-block', padding: '7px 14px', borderRadius: 8, background: `linear-gradient(135deg,${accent},${accent}99)`, color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 600, fontFamily: f.heading }}>
                            {m.action.label} →
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={bottomRef}/>
                </>
              )}
            </div>
          )}

          {/* ── Text input — hidden in voice mode ── */}
          {!voiceMode && (
            <div style={{ padding: '10px 12px 12px', borderTop: '1px solid rgba(255,255,255,.07)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, padding: '7px 8px' }}>
                <textarea ref={inputRef} className="kira-input"
                  value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
                  placeholder={lang === 'DE' ? 'Frage Kira nach Jobs, Gehalt, Lebenslauf...' : 'Ask Kira about jobs, salary, your CV...'}
                  disabled={loading} rows={1}
                  style={{ flex: 1, resize: 'none', border: 'none', background: 'transparent', fontFamily: f.body, fontSize: 13, color: '#fff', lineHeight: 1.5, maxHeight: 80, overflowY: 'auto' }}/>
                <button className="kira-send" onClick={() => send(input)} disabled={!input.trim() || loading}
                  style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: g.button, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, transition: 'opacity .2s' }}>
                  {loading
                    ? <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'kira-spin .8s linear infinite' }}/>
                    : '↑'}
                </button>
              </div>
              <div style={{ textAlign: 'center', marginTop: 5, color: 'rgba(255,255,255,.2)', fontSize: 10 }}>
                {lang === 'DE' ? 'Enter zum Senden · Mikrofon für Sprache' : 'Enter to send · mic for voice'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FAB ── */}
      <button className="kira-fab" onClick={() => setOpen(o => !o)}
        title="Chat with Kira"
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
          width: 54, height: 54, borderRadius: '50%', border: 'none',
          background: 'linear-gradient(135deg,#6D28D9,#378ADD)',
          cursor: 'pointer', boxShadow: '0 4px 22px rgba(109,40,217,.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform .2s',
        }}>
        {open
          ? <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/></svg>
          : <span style={{ fontFamily: f.heading, fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-.5px' }}>Ki</span>
        }
      </button>
    </>
  )
}
