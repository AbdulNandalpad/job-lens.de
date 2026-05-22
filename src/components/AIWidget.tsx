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
interface Msg {
  role: 'user' | 'assistant'; content: string
  status?: string; jobs?: Job[]; jobsTotal?: number
  jobsSearch?: JobsSearch; action?: FeatureAction
}
type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking'

const AGENT = 'Kira'

const SUGGESTIONS: Record<string, string[]> = {
  eu_DE: ['Softwareentwickler Jobs in München', 'Remote Marketing Jobs in Deutschland', 'Wie gut passt mein Lebenslauf zu diesen Jobs?'],
  eu_EN: ['Software developer jobs in Munich', 'Remote jobs in Germany', 'Does my CV match a Senior React Developer role?'],
  in_EN: ['Software engineer jobs in Bangalore', 'Product manager roles in Hyderabad', 'What am I missing for a senior dev role?'],
}

const STATUS_LABELS: Record<string, Record<string, string>> = {
  eu_DE: { search_jobs: 'Suche Jobs...' },
  eu_EN: { search_jobs: 'Searching jobs...' },
  in_EN: { search_jobs: 'Searching jobs...' },
}

const VOICE_LABELS: Record<VoiceState, Record<string, string>> = {
  idle:       { eu_DE: 'Tippe Sprechen',       eu_EN: 'Tap Speak',           in_EN: 'Tap Speak'           },
  listening:  { eu_DE: 'Ich höre zu…',         eu_EN: 'Listening…',          in_EN: 'Listening…'          },
  processing: { eu_DE: 'Kira denkt nach…',     eu_EN: 'Thinking…',           in_EN: 'Thinking…'           },
  speaking:   { eu_DE: 'Kira spricht…',        eu_EN: 'Speaking…',           in_EN: 'Speaking…'           },
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

// ── Mic SVG ─────────────────────────────────────────────────────────────────
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

// ── Voice orb — glass sphere with modulation rings ───────────────────────────
function VoiceOrb({ state }: { state: VoiceState }) {
  const active     = state !== 'idle'
  const speaking   = state === 'speaking'
  const listening  = state === 'listening'
  const processing = state === 'processing'

  // Ring config per state: [count, period(s), gap(s), color]
  const rings = speaking
    ? { count: 4, period: 1.0, gap: 0.25, color: 'rgba(168,85,247,' }   // purple — fast
    : listening
    ? { count: 3, period: 2.0, gap: 0.6,  color: 'rgba(96,165,250,'  }   // blue  — slow
    : null

  return (
    <div style={{ position: 'relative', width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

      {/* Modulation rings — expand outward, fade out */}
      {rings && Array.from({ length: rings.count }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: 128, height: 128,
          borderRadius: '50%',
          border: `${speaking ? 2 : 1.5}px solid ${rings.color}${speaking ? 0.65 : 0.5})`,
          animation: `kira-modring ${rings.period}s ease-out ${i * rings.gap}s infinite`,
          opacity: 0,
        }} />
      ))}

      {/* Ambient glow */}
      <div style={{
        position: 'absolute', width: 170, height: 170, borderRadius: '50%',
        background: speaking
          ? 'radial-gradient(circle, rgba(139,92,246,.18) 0%, rgba(59,130,246,.1) 55%, transparent 70%)'
          : listening
          ? 'radial-gradient(circle, rgba(59,130,246,.14) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(109,40,217,.07) 0%, transparent 70%)',
        animation: speaking ? 'kira-glow-pulse 1.0s ease-in-out infinite' : 'kira-orb-idle 4s ease-in-out infinite',
        transition: 'opacity .6s',
      }} />

      {/* Glass sphere */}
      <div style={{
        width: 128, height: 128, borderRadius: '50%',
        position: 'relative', overflow: 'hidden',
        background: active
          ? speaking
            ? 'radial-gradient(circle at 32% 26%, rgba(255,255,255,.22) 0%, rgba(168,85,247,.82) 22%, rgba(109,40,217,.7) 50%, rgba(55,138,221,.55) 78%, rgba(15,30,70,.4) 100%)'
            : 'radial-gradient(circle at 32% 26%, rgba(255,255,255,.18) 0%, rgba(96,165,250,.78) 22%, rgba(59,130,246,.65) 50%, rgba(37,99,235,.5) 78%, rgba(10,20,50,.35) 100%)'
          : 'radial-gradient(circle at 32% 26%, rgba(255,255,255,.1) 0%, rgba(109,40,217,.3) 40%, rgba(55,138,221,.2) 70%, rgba(10,20,40,.3) 100%)',
        border: '1px solid rgba(255,255,255,.22)',
        boxShadow: speaking
          ? '0 8px 40px rgba(139,92,246,.5), 0 0 80px rgba(109,40,217,.2), inset 0 1px 0 rgba(255,255,255,.3)'
          : listening
          ? '0 8px 40px rgba(59,130,246,.4), 0 0 60px rgba(37,99,235,.15), inset 0 1px 0 rgba(255,255,255,.25)'
          : '0 4px 20px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.1)',
        transition: 'background .6s, box-shadow .6s',
        animation: speaking   ? 'kira-sphere-speak 1.0s ease-in-out infinite'
                 : listening  ? 'kira-sphere-listen 2.0s ease-in-out infinite'
                 : processing ? 'kira-sphere-listen 1.4s ease-in-out infinite'
                 :              'kira-orb-idle 4s ease-in-out infinite',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Processing: dots */}
        {processing && (
          <div style={{ display: 'flex', gap: 7, zIndex: 1 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: 'rgba(255,255,255,.9)', animation: `kira-dot 1.1s ease-in-out ${i * .18}s infinite` }} />
            ))}
          </div>
        )}
        {/* Glass specular highlight — top-left ellipse */}
        <div style={{
          position: 'absolute', top: 14, left: 18,
          width: 40, height: 22, borderRadius: '50%',
          background: `rgba(255,255,255,${active ? .42 : .14})`,
          filter: 'blur(7px)', transform: 'rotate(-20deg)',
          pointerEvents: 'none', transition: 'opacity .5s',
        }} />
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function AIWidget({ market = 'eu' }: { market?: 'eu' | 'in' }) {
  const { lang }   = useLanguage()
  const router     = useRouter()
  const key    = market === 'in' ? 'in_EN' : `eu_${lang}`
  const accent = market === 'in' ? '#FF9933' : c.accent

  // ── Chat state ───────────────────────────────────────────────────────────
  const [open,        setOpen]        = useState(false)
  const [msgs,        setMsgs]        = useState<Msg[]>([])
  const [input,       setInput]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [cvName,      setCvName]      = useState('')
  const [cvUploading, setCvUploading] = useState(false)
  const [userName,    setUserName]    = useState('')

  // ── Voice state ──────────────────────────────────────────────────────────
  const [voiceMode,     setVoiceMode]     = useState(false)
  const [voiceState,    setVoiceState]    = useState<VoiceState>('idle')
  const [cvDiscussMode, setCvDiscussMode] = useState(false)

  // ── Refs ─────────────────────────────────────────────────────────────────
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
  const ttsResolveRef    = useRef<(() => void) | null>(null)
  const voiceModeRef     = useRef(false)
  const cvDiscussModeRef = useRef(false)
  const transcriptRef    = useRef('')
  const listenTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stoppingRef      = useRef(false)   // true while we deliberately stop, blocks onend re-arm
  const silenceCountRef  = useRef(0)       // consecutive silent rounds — limit to prevent stuck loop
  const greetedRef       = useRef(false)

  useEffect(() => { voiceModeRef.current  = voiceMode     }, [voiceMode])
  useEffect(() => { cvDiscussModeRef.current = cvDiscussMode }, [cvDiscussMode])

  // ── Init: CV, saved messages, user name ─────────────────────────────────
  useEffect(() => {
    const cv = sessionStorage.getItem(SS.cvText) || ''
    cvRef.current = cv
    if (cv) setCvName('CV ready')

    try {
      const saved = sessionStorage.getItem(SS.aiMessages)
      if (saved) {
        const parsed = JSON.parse(saved) as Msg[]
        if (parsed.length > 0) {
          setMsgs(parsed)
          greetedRef.current = true   // existing history — skip greeting
        }
      }
    } catch { /* ignore */ }

    // Fetch first name for personalised greeting
    fetch('/api/user/profile')
      .then(r => r.json())
      .then((d: { full_name?: string }) => { if (d.full_name) setUserName(d.full_name.split(' ')[0]) })
      .catch(() => {})
  }, [])

  // ── Greeting on first open (text only — TTS is triggered by the FAB click) ─
  useEffect(() => {
    if (!open || greetedRef.current) return
    greetedRef.current = true
    const name = userName ? `, ${userName}` : ''
    const text = key === 'eu_DE'
      ? `Hallo${name}! Ich bin Kira, deine KI-Karriereassistentin. Wie kann ich dir heute helfen?`
      : `Hi${name}! I'm Kira, your AI career assistant. How can I help you today?`
    setMsgs([{ role: 'assistant', content: text }])
  }, [open, userName, key])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  useEffect(() => {
    if (msgs.length) sessionStorage.setItem(SS.aiMessages, JSON.stringify(msgs.slice(-30)))
  }, [msgs])

  useEffect(() => {
    if (open && !voiceMode) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open, voiceMode])

  // ── CV upload ────────────────────────────────────────────────────────────
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

  // ── Audio helpers ─────────────────────────────────────────────────────────
  function unlockAudio() {
    // Must be called synchronously inside a user-gesture handler (iOS requirement)
    try {
      if (!audioCtxRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ACtx = window.AudioContext || (window as any).webkitAudioContext
        if (ACtx) audioCtxRef.current = new ACtx()
      }
      audioCtxRef.current?.resume()
    } catch { /* not supported */ }
  }

  function stopAudio() {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    // Resolve any pending TTS promise so the voice loop doesn't hang after exit
    if (ttsResolveRef.current) { ttsResolveRef.current(); ttsResolveRef.current = null }
  }

  function playTts(text: string): Promise<void> {
    stopAudio()
    if (!text.trim()) return Promise.resolve()
    return new Promise<void>((resolve) => {
      ttsResolveRef.current = resolve
      const done = () => { ttsResolveRef.current = null; resolve() }
      fetch(API.aiTts, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 800) }),
      }).then(async res => {
        if (!res.ok) { done(); return }
        const blob  = await res.blob()
        const url   = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audioRef.current = audio
        audio.onended = () => { URL.revokeObjectURL(url); audioRef.current = null; done() }
        audio.onerror = () => { URL.revokeObjectURL(url); audioRef.current = null; done() }
        audio.play().catch(done)
      }).catch(done)
    })
  }

  // ── STT helpers ──────────────────────────────────────────────────────────
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

  // ── Voice mode control ───────────────────────────────────────────────────
  function enterVoiceMode() {
    if (loading) return
    unlockAudio()   // synchronous — must stay before any await
    voiceModeRef.current = true
    setVoiceMode(true)
    setVoiceState('idle')
    setTimeout(() => startListening(), 200)
  }

  function exitVoiceMode() {
    voiceModeRef.current   = false
    cvDiscussModeRef.current = false
    silenceCountRef.current  = 0
    setVoiceMode(false)
    setVoiceState('idle')
    setCvDiscussMode(false)
    stopListening()
    stopAudio()
  }

  // ── Core listening ───────────────────────────────────────────────────────
  function startListening() {
    if (!voiceModeRef.current) return
    stoppingRef.current = false
    if (listenTimerRef.current) clearTimeout(listenTimerRef.current)
    setVoiceState('listening')

    // Hard 15s escape — fires if browser never delivers onend
    listenTimerRef.current = setTimeout(() => {
      stopListening()
      if (voiceModeRef.current) setVoiceState('idle')
    }, 15_000)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SR) {
      const rec = new SR()
      rec.lang           = getSttLang()
      rec.continuous     = false
      rec.interimResults = false
      transcriptRef.current = ''

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onresult = (e: any) => {
        if (listenTimerRef.current) clearTimeout(listenTimerRef.current)
        silenceCountRef.current = 0   // reset — user spoke
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
          silenceCountRef.current = 0
          setVoiceState('processing')
          void send(t)
        } else if (voiceModeRef.current && !stoppingRef.current) {
          // Silence round — limit consecutive re-arms to avoid infinite loop
          silenceCountRef.current++
          if (silenceCountRef.current >= 4) {
            silenceCountRef.current = 0
            setVoiceState('idle')  // too many silent rounds — wait for user to press Speak
          } else {
            setTimeout(() => { if (voiceModeRef.current && !stoppingRef.current) startListening() }, 800)
          }
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onerror = (e: any) => {
        if (listenTimerRef.current) clearTimeout(listenTimerRef.current)
        recognitionRef.current = null
        if (e.error === 'no-speech' && voiceModeRef.current && !stoppingRef.current) {
          silenceCountRef.current++
          if (silenceCountRef.current >= 4) {
            silenceCountRef.current = 0
            setVoiceState('idle')
          } else {
            setTimeout(() => { if (voiceModeRef.current && !stoppingRef.current) startListening() }, 800)
          }
        } else if (!['not-allowed', 'service-not-allowed'].includes(e.error as string)) {
          // non-fatal, non-silence — go idle cleanly
          setVoiceState('idle')
        } else {
          setVoiceState('idle')
        }
      }

      recognitionRef.current = rec
      try { rec.start() } catch { setVoiceState('idle') }

    } else {
      if (listenTimerRef.current) clearTimeout(listenTimerRef.current)
      void startWhisperRecording()
    }
  }

  function stopListening() {
    stoppingRef.current = true   // block onend from re-arming
    if (listenTimerRef.current) clearTimeout(listenTimerRef.current)
    try { recognitionRef.current?.stop() } catch { /* ignore */ }
    recognitionRef.current = null
    try { mediaRecorderRef.current?.stop() } catch { /* ignore */ }
  }

  // ── Whisper path (iOS / Firefox / Web Speech fallback) ───────────────────
  async function startWhisperRecording() {
    if (!voiceModeRef.current) return
    setVoiceState('listening')
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getSupportedMimeType()
      const mr       = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      audioChunksRef.current = []

      // Silence detection using the SHARED AudioContext (already unlocked via unlockAudio)
      // Creating a new AudioContext here would be blocked on iOS — reuse the existing one.
      let ctx = audioCtxRef.current
      if (!ctx) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ACtx = window.AudioContext || (window as any).webkitAudioContext
        ctx = new ACtx()
        audioCtxRef.current = ctx
      }
      await ctx.resume()

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
            source.disconnect()
            mr.stop()
          }
        }
      }, 100)

      // 30s hard cap
      const maxTimer = setTimeout(() => {
        clearInterval(silenceCheck)
        source.disconnect()
        mr.stop()
      }, 30_000)

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
          const res = await fetch(API.aiStt, { method: 'POST', body: form })
          const d   = await res.json()
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

  // ── Tailor CV ────────────────────────────────────────────────────────────
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

  // ── CV Discussion ────────────────────────────────────────────────────────
  function startCvDiscussion() {
    if (!cvRef.current) {
      setMsgs(prev => [...prev, { role: 'assistant', content: lang === 'DE'
        ? 'Lade deinen Lebenslauf hoch (Büroklammer oben) — dann können wir ihn gemeinsam besprechen.'
        : 'Upload your CV first (clip icon above), then we can talk through it together.' }])
      return
    }
    setCvDiscussMode(true)
    cvDiscussModeRef.current = true
    enterVoiceMode()
    const opening = key === 'eu_DE'
      ? 'Lass uns deinen Lebenslauf besprechen! Für welche Art von Stelle bewirbst du dich gerade?'
      : "Let's talk through your CV! What kind of role are you going for right now?"
    setMsgs(prev => [...prev, { role: 'assistant', content: opening }])
    void playTts(opening)
  }

  // ── Send ─────────────────────────────────────────────────────────────────
  async function send(text: string) {
    if (!text.trim() || loading) return

    const isVoice = voiceModeRef.current

    const userMsg: Msg = { role: 'user', content: text.trim() }
    const history = [...msgs, userMsg]
    setMsgs(history)
    setInput('')
    setLoading(true)
    if (isVoice) setVoiceState('processing')

    const idx = history.length
    setMsgs(prev => [...prev, { role: 'assistant', content: '' }])

    let assembled = ''
    // Sentence-streaming TTS: first sentence fires mid-stream, rest queued after
    let pendingVoice   = ''
    let firstTtsFired  = false
    let ttsChain       = Promise.resolve() as Promise<void>

    try {
      const res = await fetch(API.aiChat, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
          cvText: cvRef.current,
          market,
          isVoice,
          ...(cvDiscussModeRef.current ? { mode: 'cv_discuss' } : {}),
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
              setMsgs(prev => { const cp = [...prev]; cp[idx] = { role: 'assistant', content: assembled, jobs: cp[idx]?.jobs, action: cp[idx]?.action }; return cp })
              // Fire TTS for first complete sentence as soon as it arrives
              if (isVoice && !firstTtsFired) {
                pendingVoice += evt.text
                const m = pendingVoice.match(/^(.+?[.!?])(?:\s|$)/)
                if (m) {
                  firstTtsFired = true
                  const sentence = m[1].trim()
                  pendingVoice   = pendingVoice.slice(m[0].length).trimStart()
                  setVoiceState('speaking')
                  ttsChain = ttsChain.then(() => voiceModeRef.current ? playTts(sentence) : Promise.resolve())
                }
              } else if (isVoice) {
                pendingVoice += evt.text
              }
            } else if (evt.jobs) {
              setMsgs(prev => { const cp = [...prev]; cp[idx] = { ...cp[idx], jobs: evt.jobs as Job[], jobsTotal: evt.total as number | undefined, jobsSearch: { q: String(evt.query || ''), location: String(evt.location || '') }, status: undefined }; return cp })
            } else if (evt.action) {
              setMsgs(prev => { const cp = [...prev]; cp[idx] = { ...cp[idx], action: evt.action as FeatureAction, status: undefined }; return cp })
            } else if (evt.status) {
              setMsgs(prev => { const cp = [...prev]; cp[idx] = { role: 'assistant', content: '', status: evt.status as string }; return cp })
            } else if (evt.error) {
              setMsgs(prev => { const cp = [...prev]; cp[idx] = { role: 'assistant', content: evt.error as string }; return cp })
            }
          } catch { /* ignore malformed chunk */ }
        }
      }
    } catch {
      setMsgs(prev => { const cp = [...prev]; cp[idx] = { role: 'assistant', content: 'Connection error. Please try again.' }; return cp })
    }

    setLoading(false)

    if (isVoice && voiceModeRef.current) {
      // Queue any remaining text after sentence boundary (or full response if no boundary found)
      const remainder = firstTtsFired ? pendingVoice.trim() : assembled.trim()
      if (remainder) {
        ttsChain = ttsChain.then(() => voiceModeRef.current ? playTts(remainder) : Promise.resolve())
      }
      if (!firstTtsFired) setVoiceState('speaking')
      await ttsChain
      if (voiceModeRef.current) {
        setVoiceState('idle')
        setTimeout(() => startListening(), 400)
      }
    }
    if (!isVoice) inputRef.current?.focus()
  }

  const suggestions = SUGGESTIONS[key]   || SUGGESTIONS['eu_EN']
  const statusMap   = STATUS_LABELS[key] || STATUS_LABELS['eu_EN']
  const voiceLabel  = (VOICE_LABELS[voiceState]?.[key] || VOICE_LABELS[voiceState]?.['eu_EN']) ?? ''

  // Show suggestion chips after the opening greeting, or when msgs is empty
  const showSuggestions = msgs.length <= 1 && !loading

  return (
    <>
      <style>{`
        @keyframes kira-slide         { from{opacity:0;transform:translateY(12px) scale(.97)} to{opacity:1;transform:none} }
        @keyframes kira-dot           { 0%,60%,100%{opacity:.3;transform:translateY(0)} 30%{opacity:1;transform:translateY(-5px)} }
        @keyframes kira-spin          { to{transform:rotate(360deg)} }
        @keyframes kira-orb-idle      { 0%,100%{transform:scale(1);opacity:.6} 50%{transform:scale(1.035);opacity:.88} }
        @keyframes kira-sphere-listen { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
        @keyframes kira-sphere-speak  { 0%,100%{transform:scale(1)} 40%{transform:scale(1.09)} 70%{transform:scale(.97)} }
        @keyframes kira-modring       { 0%{transform:scale(1);opacity:.8} 100%{transform:scale(1.9);opacity:0} }
        @keyframes kira-glow-pulse    { 0%,100%{transform:scale(1);opacity:.7} 50%{transform:scale(1.15);opacity:1} }
        .kira-fab:hover            { transform:scale(1.08) !important }
        .kira-send:hover:not(:disabled){ opacity:.85 }
        .kira-send:disabled        { opacity:.4;cursor:not-allowed }
        .kira-suggest:hover        { border-color:${accent} !important;color:${accent} !important;background:${accent}0f !important }
        .kira-close:hover          { background:rgba(255,255,255,.15) !important }
        .kira-input:focus          { outline:none }
        .kira-job-card:hover       { border-color:${accent}66 !important;background:rgba(255,255,255,.08) !important }
        .kira-apply:hover          { opacity:.85 }
        .kira-mic-btn:hover        { background:rgba(255,255,255,.12) !important }
        @media (max-width:480px) {
          .kira-panel { width:calc(100vw - 24px) !important;right:12px !important;left:12px !important;height:72vh !important;bottom:74px !important }
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
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg,${accent}cc,${accent}55)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 44 44">
                <circle cx="20" cy="20" r="13" fill="none" stroke="white" strokeWidth="2.8"/>
                <circle cx="20" cy="20" r="3" fill="white"/>
                <line x1="28" y1="28" x2="36" y2="36" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
              </svg>
            </div>
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

            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }} onChange={handleCvUpload}/>

            {/* Upload CV */}
            <button title={lang === 'DE' ? 'Lebenslauf hochladen' : 'Upload CV'} onClick={() => fileInputRef.current?.click()} disabled={cvUploading}
              style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: cvName ? `${accent}22` : 'rgba(255,255,255,.08)', cursor: 'pointer', color: cvName ? accent : 'rgba(255,255,255,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
              {cvUploading
                ? <span style={{ width: 10, height: 10, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'kira-spin .8s linear infinite' }}/>
                : <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3v10M6 7l4-4 4 4"/><path d="M3 17h14"/></svg>
              }
            </button>

            {/* Mic toggle */}
            <button className="kira-mic-btn"
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

            {msgs.length > 0 && !voiceMode && (
              <button onClick={() => { setMsgs([]); greetedRef.current = false; cvDiscussModeRef.current = false; setCvDiscussMode(false); sessionStorage.removeItem(SS.aiMessages) }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.3)', fontSize: 10, cursor: 'pointer', padding: '2px 4px', fontFamily: f.body, flexShrink: 0 }}>
                Clear
              </button>
            )}

            <button className="kira-close" onClick={() => { setOpen(false); if (voiceMode) exitVoiceMode() }}
              style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,.08)', cursor: 'pointer', color: 'rgba(255,255,255,.6)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              ✕
            </button>
          </div>

          {/* ── Voice overlay ── */}
          {voiceMode ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '24px 20px' }}>
              {cvDiscussMode && (
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: accent, textTransform: 'uppercase', opacity: .8 }}>
                  {lang === 'DE' ? 'CV-Gespräch' : 'CV Discussion'}
                </div>
              )}
              <VoiceOrb state={voiceState}/>

              <div style={{ fontSize: 13, color: voiceState === 'idle' ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.6)', fontFamily: f.body, textAlign: 'center', letterSpacing: .2 }}>
                {voiceLabel}
              </div>

              {voiceState === 'idle' && (
                <button onClick={() => startListening()}
                  style={{ padding: '9px 26px', borderRadius: 20, border: `1.5px solid ${accent}55`, background: `${accent}15`, color: accent, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: f.heading, transition: 'all .15s' }}>
                  {lang === 'DE' ? 'Sprechen' : 'Speak'}
                </button>
              )}

              {msgs.filter(m => m.role === 'user').length > 0 && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.2)', fontFamily: f.body, textAlign: 'center' }}>
                  {msgs.filter(m => m.role === 'user').length} {lang === 'DE' ? 'Nachrichten' : 'messages'} · {lang === 'DE' ? 'Beenden für Verlauf' : 'end to see transcript'}
                </div>
              )}

              <button onClick={exitVoiceMode}
                style={{ padding: '8px 20px', borderRadius: 20, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: 'rgba(255,255,255,.35)', fontSize: 12, cursor: 'pointer', fontFamily: f.body }}>
                {lang === 'DE' ? 'Beenden' : 'End voice'}
              </button>
            </div>

          ) : (
            /* ── Messages ── */
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
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
                              {[0,1,2].map(j => <span key={j} style={{ width: 4, height: 4, borderRadius: '50%', background: accent, display: 'inline-block', animation: `kira-dot 1.2s ease-in-out ${j*.2}s infinite` }}/>)}
                            </span>
                            {statusMap[m.status] || 'Thinking...'}
                          </span>
                        ) : i === msgs.length - 1 && m.role === 'assistant' && m.content === '' ? (
                          <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
                            {[0,1,2].map(j => <span key={j} style={{ width: 4, height: 4, borderRadius: '50%', background: accent, display: 'inline-block', animation: `kira-dot 1.2s ease-in-out ${j*.2}s infinite` }}/>)}
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
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginTop: 3 }}>{job.company} · {job.location}</div>
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
                        const q    = m.jobsSearch?.q || ''
                        const loc  = m.jobsSearch?.location || ''
                        const base = market === 'in' ? '/in/jobs' : '/app/jobs'
                        const p    = new URLSearchParams()
                        if (q)   p.set('q', q)
                        if (loc && market === 'in') p.set('location', loc)
                        return (
                          <Link href={p.toString() ? `${base}?${p}` : base}
                            style={{ display: 'block', marginTop: 2, padding: '7px 12px', borderRadius: 8, border: `1px solid ${accent}44`, color: accent, textDecoration: 'none', fontSize: 11, fontWeight: 600, textAlign: 'center', fontFamily: f.heading }}>
                            Browse all {q ? `"${q}"` : ''} jobs →
                          </Link>
                        )
                      })()}
                    </div>
                  )}

                  {/* Feature action */}
                  {m.action && (
                    <div style={{ marginTop: 6, marginLeft: 28 }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginBottom: 5 }}>{m.action.reason}</div>
                      <Link href={m.action.href}
                        style={{ display: 'inline-block', padding: '7px 14px', borderRadius: 8, background: `linear-gradient(135deg,${accent},${accent}99)`, color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 600, fontFamily: f.heading }}>
                        {m.action.label} →
                      </Link>
                    </div>
                  )}
                </div>
              ))}

              {/* Suggestion chips — shown after greeting or on empty state */}
              {showSuggestions && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: msgs.length > 0 ? 10 : 0 }}>
                  {cvName && (
                    <button className="kira-suggest" onClick={startCvDiscussion}
                      style={{ textAlign: 'left', padding: '8px 12px', borderRadius: 10, background: `${accent}12`, border: `1px solid ${accent}44`, color: accent, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s', fontFamily: f.body, display: 'flex', alignItems: 'center', gap: 7 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                      {lang === 'DE' ? 'Lebenslauf besprechen →' : 'Discuss my CV →'}
                    </button>
                  )}
                  {suggestions.map(s => (
                    <button key={s} className="kira-suggest" onClick={() => send(s)}
                      style={{ textAlign: 'left', padding: '7px 12px', borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.5)', fontSize: 12, cursor: 'pointer', transition: 'all .15s', fontFamily: f.body }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <div ref={bottomRef}/>
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
              <div style={{ textAlign: 'center', marginTop: 5, color: 'rgba(255,255,255,.18)', fontSize: 10 }}>
                {lang === 'DE' ? 'Enter zum Senden · 🎙 für Sprache' : 'Enter to send · 🎙 for voice'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FAB ── */}
      <button className="kira-fab" onClick={() => {
        const nowOpening = !open
        setOpen(o => !o)
        if (nowOpening && !greetedRef.current) {
          unlockAudio()
          const name = userName ? `, ${userName}` : ''
          const text = key === 'eu_DE'
            ? `Hallo${name}! Ich bin Kira, deine KI-Karriereassistentin. Wie kann ich dir heute helfen?`
            : `Hi${name}! I'm Kira, your AI career assistant. How can I help you today?`
          void playTts(text)
        }
      }}
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
