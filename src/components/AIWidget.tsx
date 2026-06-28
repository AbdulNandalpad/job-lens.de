'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { theme } from '@/lib/theme'
import { SS, LS, API, CREDIT_COST, LIVE_VOICE_MAX_SECONDS } from '@/lib/constants'
import SvgIcon from '@/components/SvgIcon'
import { useLanguage } from '@/lib/i18n'

const { colors: c, fonts: f, gradients: g } = theme

interface Job {
  title: string; company: string; location: string
  salary_min: number | null; salary_max: number | null
  apply_url: string; posted: string; description: string
  match_score?: number | null; matching_skills?: string[]; missing_skills?: string[]
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

// ── Kira mode cards ──────────────────────────────────────────────────────────
function ModeIcon({ id, size = 16, color = 'currentColor' }: { id: string; size?: number; color?: string }) {
  if (id === 'job_search') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/>
    </svg>
  )
  if (id === 'market_insights') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )
  if (id === 'cv_review') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>
    </svg>
  )
  if (id === 'interview_prep') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
  // feature_help
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}

const KIRA_MODES = [
  { id: 'job_search',      label: 'Find Jobs',       desc: 'Search live listings by role & location' },
  { id: 'market_insights', label: 'Market Insights', desc: 'Salaries, trends & in-demand skills'     },
  { id: 'cv_review',       label: 'CV Review',       desc: 'Get honest feedback on your CV'          },
  { id: 'interview_prep',  label: 'Interview Prep',  desc: 'STAR answers & role-specific practice'   },
  { id: 'feature_help',    label: 'How it works',    desc: 'Which Job-Lens tool to use & when'       },
]

const MODE_OPENINGS: Record<string, Record<string, string>> = {
  job_search:      { eu_DE: 'Welche Stelle suchst du? Titel und Ort — ich suche live.', eu_EN: "What role are you looking for? Give me the title and location and I'll pull up live listings.", in_EN: "What role are you looking for? Tell me the title and location." },
  market_insights: { eu_DE: 'Welchen Markt soll ich analysieren? Rolle, Skill oder Stadt?', eu_EN: 'What market do you want to know about? A role, a skill, or a city?', in_EN: 'What market do you want to know about? A role, a skill, or a city?' },
  cv_review:       { eu_DE: 'Lass uns deinen Lebenslauf besprechen. Welche Art Stelle suchst du gerade?', eu_EN: "Let's look at your CV. What kind of role are you going for?", in_EN: "Let's look at your CV. What kind of role are you going for?" },
  interview_prep:  { eu_DE: 'Für welche Stelle und welches Unternehmen bereitest du dich vor?', eu_EN: "Which role and company are you preparing for? I'll tailor everything to it.", in_EN: "Which role and company are you preparing for? I'll tailor everything to it." },
  feature_help:    { eu_DE: 'Was möchtest du tun? Ich zeige dir das richtige Tool.', eu_EN: "What are you trying to do? I'll point you to the right tool.", in_EN: "What are you trying to do? I'll point you to the right tool." },
}

const SUGGESTIONS: Record<string, string[]> = {
  eu_DE: ['Softwareentwickler Jobs in München', 'Remote Marketing Jobs in Deutschland', 'Wie gut passt mein Lebenslauf zu diesen Jobs?'],
  eu_EN: ['Software developer jobs in Munich', 'Remote jobs in Germany', 'Does my CV match a Senior React Developer role?'],
  in_EN: ['Software engineer jobs in Bangalore', 'Product manager roles in Hyderabad', 'What am I missing for a senior dev role?'],
}

const STATUS_LABELS: Record<string, Record<string, string>> = {
  eu_DE: { search_jobs: 'Suche Jobs...', score_jobs: 'Bewerte Übereinstimmung...' },
  eu_EN: { search_jobs: 'Searching jobs...', score_jobs: 'Scoring match...' },
  in_EN: { search_jobs: 'Searching jobs...', score_jobs: 'Scoring match...' },
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

// ── Voice orb — canvas wave animation ────────────────────────────────────────
function VoiceOrb({ state, large = false }: { state: VoiceState; large?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)
  const timeRef   = useRef(0)
  const stateRef  = useRef(state)

  useEffect(() => { stateRef.current = state }, [state])

  type Particle = { x: number; y: number; vx: number; vy: number; life: number; decay: number; r: number; left: boolean }
  const particles = useRef<Particle[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    if (!ctx) return

    // Internal resolution 2× for retina
    const W = 640, H = 320
    canvas.width  = W
    canvas.height = H
    const cx = W / 2, cy = H / 2
    const CR = 76  // circle radius in canvas coords

    function emitParticles() {
      const s = stateRef.current
      if (s === 'idle') return
      const n = s === 'speaking' ? 5 : s === 'listening' ? 3 : 1
      for (let i = 0; i < n; i++) {
        const angle = Math.random() * Math.PI * 2
        const x     = cx + Math.cos(angle) * (CR + 4)
        const y     = cy + Math.sin(angle) * (CR + 4)
        const spd   = 1 + Math.random() * 3
        particles.current.push({
          x, y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          life: 1,
          decay: 0.022 + Math.random() * 0.028,
          r: 1.2 + Math.random() * 2.8,
          left: Math.cos(angle) < 0,
        })
      }
      if (particles.current.length > 140) particles.current = particles.current.slice(-140)
    }

    function stepParticles() {
      for (const p of particles.current) {
        p.x   += p.vx; p.y += p.vy
        p.vx  *= 0.96; p.vy *= 0.96
        p.life -= p.decay
      }
      particles.current = particles.current.filter(p => p.life > 0)
    }

    function drawParticles() {
      for (const p of particles.current) {
        const a = Math.max(0, p.life) * 0.88
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.left ? `rgba(0,230,210,${a})` : `rgba(255,20,155,${a})`
        ctx.fill()
      }
    }

    function drawWaveSide(t: number, left: boolean, amplitude: number, speed: number) {
      const startX = cx + (left ? -CR : CR)
      const endX   = left ? 0 : W
      const dir    = left ? -1 : 1
      const len    = Math.abs(endX - startX)

      const layers = [
        { fq: 1.0, am: 1.00, lw: 3.0, al: 0.90, ph: 0.0  },
        { fq: 1.7, am: 0.55, lw: 1.8, al: 0.55, ph: 1.3  },
        { fq: 0.7, am: 0.75, lw: 1.2, al: 0.32, ph: 2.9  },
      ]

      for (const lyr of layers) {
        ctx.beginPath()
        for (let i = 0; i <= 120; i++) {
          const p   = i / 120
          const x   = startX + dir * p * len
          const env = Math.sin(p * Math.PI)   // bell: 0 → 1 → 0
          const y   = cy + Math.sin(p * Math.PI * 3 * lyr.fq + t * speed + lyr.ph) * amplitude * lyr.am * env
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        const grad = ctx.createLinearGradient(startX, 0, endX, 0)
        if (left) {
          grad.addColorStop(0,   `rgba(0,230,210,${lyr.al})`)
          grad.addColorStop(0.5, `rgba(0,190,255,${lyr.al * 0.6})`)
          grad.addColorStop(1,   `rgba(0,150,255,0)`)
        } else {
          grad.addColorStop(0,   `rgba(255,20,155,${lyr.al})`)
          grad.addColorStop(0.5, `rgba(255,70,40,${lyr.al * 0.6})`)
          grad.addColorStop(1,   `rgba(255,110,20,0)`)
        }
        ctx.strokeStyle = grad
        ctx.lineWidth   = lyr.lw
        ctx.lineCap     = 'round'
        ctx.stroke()
      }
    }

    function draw(t: number) {
      const s   = stateRef.current
      const amp = s === 'speaking' ? 58 : s === 'listening' ? 38 : s === 'processing' ? 20 : 0
      const spd = s === 'speaking' ? 3.4 : s === 'listening' ? 2.0 : 1.4

      ctx.clearRect(0, 0, W, H)

      if (s !== 'idle') {
        emitParticles()
        stepParticles()
        drawWaveSide(t, true,  amp, spd)
        drawWaveSide(t, false, amp, spd)
        drawParticles()

        // Glow halo behind circle
        const col = s === 'speaking' ? '255,20,155' : '0,220,200'
        const gc  = ctx.createRadialGradient(cx, cy, CR * 0.5, cx, cy, CR * 2.4)
        gc.addColorStop(0, `rgba(${col},0.25)`)
        gc.addColorStop(1, `rgba(${col},0)`)
        ctx.beginPath(); ctx.arc(cx, cy, CR * 2.4, 0, Math.PI * 2)
        ctx.fillStyle = gc; ctx.fill()
      } else {
        particles.current = []
      }

      // Circle fill
      const fill = ctx.createRadialGradient(cx - CR * 0.22, cy - CR * 0.32, CR * 0.08, cx, cy, CR)
      fill.addColorStop(0, '#1e3250')
      fill.addColorStop(1, '#0b1622')
      ctx.beginPath(); ctx.arc(cx, cy, CR, 0, Math.PI * 2)
      ctx.fillStyle = fill; ctx.fill()

      // Circle border
      ctx.beginPath(); ctx.arc(cx, cy, CR, 0, Math.PI * 2)
      if (s !== 'idle') {
        const brd = ctx.createLinearGradient(cx - CR, cy, cx + CR, cy)
        if (s === 'speaking') {
          brd.addColorStop(0, 'rgba(0,230,210,0.75)')
          brd.addColorStop(1, 'rgba(255,20,155,0.75)')
        } else {
          brd.addColorStop(0, 'rgba(0,230,210,0.85)')
          brd.addColorStop(1, 'rgba(0,160,255,0.85)')
        }
        ctx.strokeStyle = brd; ctx.lineWidth = 2.5
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1.5
      }
      ctx.stroke()
    }

    let lastTs = 0
    function loop(ts: number) {
      const dt = Math.min((ts - lastTs) / 1000, 0.05)
      lastTs = ts; timeRef.current += dt
      draw(timeRef.current)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(rafRef.current) }
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: large ? 560 : 320 }}>
      <canvas ref={canvasRef} style={{ width: '100%', aspectRatio: '2 / 1', display: 'block' }} />
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {state === 'processing'
          ? <div style={{ display: 'flex', gap: 8 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,.85)', animation: `kira-dot 1.1s ease-in-out ${i * .18}s infinite` }} />)}
            </div>
          : <MicIcon size={22} color={state !== 'idle' ? '#00eeff' : 'rgba(255,255,255,0.45)'} />
        }
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
  const [maximized,   setMaximized]   = useState(false)
  const [msgs,        setMsgs]        = useState<Msg[]>([])
  const [input,       setInput]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [cvName,      setCvName]      = useState('')
  const [cvUploading, setCvUploading] = useState(false)
  const [userName,    setUserName]    = useState('')
  const [isAdmin,     setIsAdmin]     = useState(false)

  // ── Mode state ───────────────────────────────────────────────────────────
  const [kiraMode,      setKiraMode]      = useState('')
  const [isMobile,      setIsMobile]      = useState(false)
  const [mounted,       setMounted]       = useState(false)

  // ── Interview coaching state ─────────────────────────────────────────────
  const [interviewRole,    setInterviewRole]    = useState('')
  const [interviewCompany, setInterviewCompany] = useState('')
  const [coachUnlocked,    setCoachUnlocked]    = useState(false)
  const [coachUnlocking,   setCoachUnlocking]   = useState(false)

  // ── Refs ─────────────────────────────────────────────────────────────────
  const bottomRef        = useRef<HTMLDivElement>(null)
  const inputRef         = useRef<HTMLTextAreaElement>(null)
  const cvRef            = useRef('')
  const fileInputRef     = useRef<HTMLInputElement>(null)

  // ── Realtime voice refs ───────────────────────────────────────────────────
  const [realtimeMode,  setRealtimeMode]  = useState(false)
  const [realtimeState, setRealtimeState] = useState<'connecting'|'ready'|'listening'|'processing'|'speaking'>('connecting')
  const realtimeWsRef       = useRef<WebSocket | null>(null)
  const realtimeCtxRef      = useRef<AudioContext | null>(null)
  const realtimeStreamRef   = useRef<MediaStream | null>(null)
  const realtimeNextTimeRef = useRef(0)
  const realtimeModeRef     = useRef(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const realtimeProcessorRef = useRef<any>(null)
  const [realtimeSecsLeft, setRealtimeSecsLeft] = useState(LIVE_VOICE_MAX_SECONDS)
  const realtimeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [realtimeConnecting, setRealtimeConnecting] = useState(false)

  // ── Refresh interview coaching state from sessionStorage ────────────────
  function refreshInterviewCtx() {
    const r = sessionStorage.getItem(SS.interviewRole) || ''
    setInterviewRole(r)
    setInterviewCompany(sessionStorage.getItem(SS.interviewCompany) || '')
    setCoachUnlocked(sessionStorage.getItem(SS.interviewCoachOn) === '1')
  }

  // Re-read interview context whenever the panel opens
  useEffect(() => { if (open) refreshInterviewCtx() }, [open])

  // ── Init: CV, saved messages, user name ─────────────────────────────────
  useEffect(() => {
    setIsMobile(window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent))
    setMounted(true)
    refreshInterviewCtx()

    const cv = sessionStorage.getItem(SS.cvText) || ''
    cvRef.current = cv
    if (cv) setCvName('CV ready')

    try {
      const saved = localStorage.getItem(LS.aiMessages)
      if (saved) {
        const parsed = JSON.parse(saved) as Msg[]
        if (parsed.length > 0) {
          setMsgs(parsed)
        }
      }
    } catch { /* ignore */ }

    // Fetch first name + admin status
    fetch('/api/user/profile')
      .then(r => r.json())
      .then((d: { full_name?: string; isAdmin?: boolean }) => {
        if (d.full_name) setUserName(d.full_name.split(' ')[0])
        if (d.isAdmin) setIsAdmin(true)
      })
      .catch(() => {})
  }, [])

  // Greeting is deferred — shown only when the user first clicks the mic button

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  useEffect(() => {
    if (msgs.length) localStorage.setItem(LS.aiMessages, JSON.stringify(msgs.slice(-30)))
  }, [msgs])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

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

      // Extract and persist career profile in background — powers the dashboard panel
      fetch('/api/profile/career', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText: text, market }),
      }).catch(() => null)

    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', content: 'Could not read that file. Try a PDF, Word doc, or text file.' }])
    }
    setCvUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
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

  // ── Interview coaching unlock ─────────────────────────────────────────
  async function unlockCoaching() {
    setCoachUnlocking(true)
    try {
      const res = await fetch(API.interviewCoaching, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market }),
      })
      if (res.ok) {
        sessionStorage.setItem(SS.interviewCoachOn, '1')
        setCoachUnlocked(true)
        const roleLabel = interviewRole
        const companyLabel = interviewCompany ? ` at ${interviewCompany}` : ''
        setMsgs(prev => [...prev, { role: 'assistant', content: `Full interview coaching unlocked! I'm now your personal interview coach for the ${roleLabel} role${companyLabel}. Ask me anything — STAR answers, what to expect, salary negotiation, how to handle tough questions. Let's get you ready!` }])
      } else {
        const d = await res.json().catch(() => ({})) as { error?: string }
        setMsgs(prev => [...prev, { role: 'assistant', content: (d.error as string | undefined) || 'Could not unlock coaching — please check your credits.' }])
      }
    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
    }
    setCoachUnlocking(false)
  }

  // ── Realtime voice helpers ───────────────────────────────────────────────
  function float32ToInt16(f32: Float32Array): Int16Array {
    const i16 = new Int16Array(f32.length)
    for (let i = 0; i < f32.length; i++) {
      const s = Math.max(-1, Math.min(1, f32[i]))
      i16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
    }
    return i16
  }

  function bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let bin = ''
    for (let i = 0; i < bytes.length; i += 8192) {
      bin += String.fromCharCode(...bytes.subarray(i, i + 8192))
    }
    return btoa(bin)
  }

  function playRealtimeChunk(base64: string) {
    const ctx = realtimeCtxRef.current
    if (!ctx) return
    const binary = atob(base64)
    const bytes  = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const i16  = new Int16Array(bytes.buffer)
    const f32  = new Float32Array(i16.length)
    for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 0x8000
    const buf  = ctx.createBuffer(1, f32.length, 24000)
    buf.copyToChannel(f32, 0)
    const src  = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    const now   = ctx.currentTime
    const start = Math.max(now, realtimeNextTimeRef.current)
    src.start(start)
    realtimeNextTimeRef.current = start + buf.duration
  }

  function stopRealtimePlayback() {
    const ctx = realtimeCtxRef.current
    if (ctx) realtimeNextTimeRef.current = ctx.currentTime
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleRealtimeEvent(evt: any) {
    switch (evt.type) {
      case 'session.created':
      case 'session.updated':
        setRealtimeState('ready')
        break
      case 'input_audio_buffer.speech_started':
        setRealtimeState('listening')
        stopRealtimePlayback()
        break
      case 'input_audio_buffer.speech_stopped':
        setRealtimeState('processing')
        break
      case 'response.audio.delta':
      case 'response.output_audio.delta': {
        const chunk = evt.delta ?? evt.audio ?? evt.data
        if (chunk) { playRealtimeChunk(chunk); setRealtimeState('speaking') }
        break
      }
      case 'response.audio.done':
      case 'response.output_audio.done':
      case 'response.done':
        setRealtimeState('ready')
        break
      case 'conversation.item.input_audio_transcription.completed':
      case 'conversation.item.input_audio_transcription.delta':
        if (evt.transcript?.trim()) {
          setMsgs(prev => [...prev, { role: 'user', content: evt.transcript.trim() }])
        }
        break
      case 'response.audio_transcript.done':
      case 'response.output_audio_transcript.done':
        if (evt.transcript?.trim()) {
          setMsgs(prev => [...prev, { role: 'assistant', content: evt.transcript.trim() }])
        }
        break
      case 'response.output_item.done': {
        const textBlock = evt.item?.content?.find((c: { type: string; text?: string }) => c.type === 'text')
        if (textBlock?.text) {
          setMsgs(prev => [...prev, { role: 'assistant', content: textBlock.text }])
        }
        break
      }
      case 'error': {
        const msg = evt.error?.message || evt.message || 'Unknown error'
        console.error('[realtime]', msg)
        setMsgs(prev => [...prev, { role: 'assistant', content: `Voice connection error: ${msg}` }])
        exitRealtimeMode()
        break
      }
    }
  }

  async function enterRealtimeMode() {
    if (realtimeConnecting || realtimeMode) return
    const wsBase = process.env.NEXT_PUBLIC_REALTIME_WS_URL
    if (!wsBase) { alert('Realtime service URL not configured'); return }

    // Must be synchronous in the user-gesture handler so iOS/Safari allows AudioContext
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ACtx = window.AudioContext || (window as any).webkitAudioContext
    const rtCtx = new ACtx({ sampleRate: 24000 }) as AudioContext
    realtimeCtxRef.current = rtCtx
    realtimeNextTimeRef.current = 0
    if (rtCtx.state === 'suspended') await rtCtx.resume()

    // Deduct credits up-front for the session
    setRealtimeConnecting(true)
    try {
      const res = await fetch(API.aiVoiceSession, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market }),
      })
      if (res.status === 402) {
        setRealtimeConnecting(false)
        setMsgs(prev => [...prev, { role: 'assistant', content: lang === 'DE'
          ? `Nicht genug Credits. Live-Voice kostet ${CREDIT_COST.liveVoice} Credits pro Sitzung.`
          : `Not enough credits. Live voice costs ${CREDIT_COST.liveVoice} credits per session.` }])
        return
      }
      if (!res.ok) throw new Error('voice-session failed')
    } catch {
      setRealtimeConnecting(false)
      setMsgs(prev => [...prev, { role: 'assistant', content: lang === 'DE'
        ? 'Live-Voice konnte nicht gestartet werden. Bitte versuche es erneut.'
        : 'Could not start live voice. Please try again.' }])
      return
    }

    // Fetch user memory + first name while credits are confirmed, before WS opens
    let kiраContext: { name: string | null; memoryBlock: string } = { name: null, memoryBlock: '' }
    try {
      const ctxRes = await fetch('/api/user/kira-context')
      if (ctxRes.ok) kiраContext = await ctxRes.json()
    } catch { /* non-fatal — proceed without context */ }

    const cvText = typeof window !== 'undefined' ? (sessionStorage.getItem('jl_cv_text') ?? '') : ''

    realtimeModeRef.current = true
    setRealtimeMode(true)
    setRealtimeState('connecting')
    setRealtimeSecsLeft(LIVE_VOICE_MAX_SECONDS)

    const secret = process.env.NEXT_PUBLIC_RAILWAY_SECRET || ''
    const ws = new WebSocket(`${wsBase}?secret=${encodeURIComponent(secret)}&market=${market}&mode=${encodeURIComponent(kiraMode)}`)
    realtimeWsRef.current = ws

    ws.onopen = async () => {
      // Send user context so Railway can enrich the OpenAI session instructions
      if (kiраContext.memoryBlock || kiраContext.name || cvText) {
        ws.send(JSON.stringify({
          type:        'kira.context',
          name:        kiраContext.name,
          memoryBlock: kiраContext.memoryBlock,
          cvText:      cvText.slice(0, 6000),
        }))
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
        })
        realtimeStreamRef.current = stream

        // AudioContext was pre-created synchronously in the user gesture — reuse it
        const ctx = realtimeCtxRef.current!
        if (ctx.state === 'suspended') await ctx.resume()

        const source    = ctx.createMediaStreamSource(stream)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const processor = (ctx as any).createScriptProcessor(4096, 1, 1)
        realtimeProcessorRef.current = processor
        source.connect(processor)
        processor.connect(ctx.destination)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        processor.onaudioprocess = (e: any) => {
          if (!realtimeModeRef.current || ws.readyState !== WebSocket.OPEN) return
          // Half-duplex: while Kira's audio is still scheduled/playing, don't feed
          // mic audio back — stops her own voice (via speakers) re-triggering the
          // VAD. Covers the playback tail after response.done, not just 'speaking'.
          if (ctx.currentTime < realtimeNextTimeRef.current - 0.05) return
          const f32 = e.inputBuffer.getChannelData(0) as Float32Array
          const i16 = float32ToInt16(f32)
          ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: bufferToBase64(i16.buffer as ArrayBuffer) }))
        }

        setRealtimeConnecting(false)

        // Start the 5-minute session countdown — auto-disconnect at 0
        if (realtimeTimerRef.current) clearInterval(realtimeTimerRef.current)
        realtimeTimerRef.current = setInterval(() => {
          setRealtimeSecsLeft(prev => {
            if (prev <= 1) {
              setMsgs(m => [...m, { role: 'assistant', content: lang === 'DE'
                ? 'Live-Voice-Sitzung beendet (5-Minuten-Limit).'
                : 'Live voice session ended (5-minute limit).' }])
              exitRealtimeMode()
              return 0
            }
            return prev - 1
          })
        }, 1000)
      } catch (micErr) {
        console.error('[realtime] mic/audio setup error:', micErr)
        setMsgs(prev => [...prev, { role: 'assistant', content: `Mic error: ${(micErr as Error)?.message || micErr}` }])
        exitRealtimeMode()
      }
    }

    ws.onmessage = (e) => {
      try { handleRealtimeEvent(JSON.parse(e.data as string)) } catch { /* ignore */ }
    }
    ws.onclose  = (e) => {
      if (realtimeModeRef.current) {
        const reason = e.reason || `code ${e.code}`
        setMsgs(prev => [...prev, { role: 'assistant', content: `Live voice disconnected: ${reason}` }])
        exitRealtimeMode()
      }
    }
    ws.onerror  = () => {
      if (realtimeModeRef.current) {
        setMsgs(prev => [...prev, { role: 'assistant', content: 'Could not connect to live voice service. Check Railway logs.' }])
        exitRealtimeMode()
      }
    }
  }

  function exitRealtimeMode() {
    realtimeModeRef.current = false
    setRealtimeMode(false)
    setRealtimeConnecting(false)
    setRealtimeState('connecting')
    if (realtimeTimerRef.current) { clearInterval(realtimeTimerRef.current); realtimeTimerRef.current = null }
    stopRealtimePlayback()
    try { realtimeProcessorRef.current?.disconnect() } catch { /* ignore */ }
    try { realtimeCtxRef.current?.close() } catch { /* ignore */ }
    realtimeCtxRef.current = null
    realtimeProcessorRef.current = null
    realtimeStreamRef.current?.getTracks().forEach(t => t.stop())
    realtimeStreamRef.current = null
    try { realtimeWsRef.current?.close() } catch { /* ignore */ }
    realtimeWsRef.current = null
  }

  // ── Mode selection ───────────────────────────────────────────────────────
  function selectMode(mode: typeof KIRA_MODES[number]) {
    if (!isAdmin) return
    setKiraMode(mode.id)
    const opening = MODE_OPENINGS[mode.id]?.[key] || MODE_OPENINGS[mode.id]?.['eu_EN'] || ''
    setMsgs([{ role: 'assistant', content: opening }])
  }

  // ── Send ─────────────────────────────────────────────────────────────────
  async function send(text: string) {
    if (!text.trim() || loading) return

    const userMsg: Msg = { role: 'user', content: text.trim() }
    const history = [...msgs, userMsg]
    setMsgs(history)
    setInput('')
    setLoading(true)

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
          mode: kiraMode || undefined,
          interviewCtx: (() => {
            const r = sessionStorage.getItem(SS.interviewRole)
            const c = sessionStorage.getItem(SS.interviewCompany)
            const q = sessionStorage.getItem(SS.interviewCurrentQ)
            const unlocked = sessionStorage.getItem(SS.interviewCoachOn) === '1'
            return r ? { role: r, company: c || '', currentQ: q || '', coachUnlocked: unlocked } : null
          })(),
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
    refreshInterviewCtx()
    inputRef.current?.focus()
  }

  const suggestions = SUGGESTIONS[key]   || SUGGESTIONS['eu_EN']
  const statusMap   = STATUS_LABELS[key] || STATUS_LABELS['eu_EN']

  // Show suggestion chips after the opening greeting, or when msgs is empty
  const showSuggestions = msgs.length <= 1 && !loading

  if (!mounted) return null

  return createPortal(
    <>
      <style>{`
        @keyframes kira-slide         { from{opacity:0;transform:translateY(12px) scale(.97)} to{opacity:1;transform:none} }
        @keyframes kira-dot           { 0%,60%,100%{opacity:.3;transform:translateY(0)} 30%{opacity:1;transform:translateY(-5px)} }
        @keyframes kira-spin          { to{transform:rotate(360deg)} }
        .kira-fab:hover            { transform:scale(1.08) !important }
        .kira-send:hover:not(:disabled){ opacity:.85 }
        .kira-send:disabled        { opacity:.4;cursor:not-allowed }
        .kira-suggest:hover        { border-color:${accent} !important;color:${accent} !important;background:${accent}0f !important }
        .kira-mode-card:hover      { border-color:${accent}66 !important;background:${accent}0d !important;transform:translateY(-1px) }
        .kira-close:hover          { background:rgba(255,255,255,.15) !important }
        .kira-input:focus          { outline:none }
        .kira-job-card:hover       { border-color:${accent}66 !important;background:rgba(255,255,255,.08) !important }
        .kira-apply:hover          { opacity:.85 }
        .kira-mic-btn:hover        { background:rgba(255,255,255,.12) !important }
        .kira-expand:hover         { background:rgba(255,255,255,.15) !important }
        .kira-panel                { transition: width .22s ease, height .22s ease, border-radius .22s ease; }
        .kira-panel-max            { position:fixed !important;inset:12px !important;width:auto !important;height:auto !important;bottom:12px !important;right:12px !important;border-radius:20px !important; }
        @media (max-width:480px) {
          .kira-panel:not(.kira-panel-max) { width:calc(100vw - 24px) !important;right:12px !important;left:12px !important;height:72dvh !important;bottom:74px !important }
          .kira-panel-max { inset:0 !important;border-radius:0 !important; }
        }
        @media (max-height:500px) {
          .kira-panel:not(.kira-panel-max) { height:calc(100dvh - 76px) !important;bottom:68px !important;max-height:calc(100dvh - 76px) !important }
          .kira-fab   { bottom:12px !important }
        }
        @media (max-height:500px) and (max-width:900px) {
          .kira-panel:not(.kira-panel-max) { width:calc(100vw - 24px) !important;right:12px !important;left:12px !important }
        }
      `}</style>

      {/* ── Panel ── */}
      {open && (
        <div className={`kira-panel${maximized ? ' kira-panel-max' : ''}`} style={{
          position: 'fixed', bottom: maximized ? 12 : 80, right: 20, zIndex: 9999,
          width: maximized ? 'auto' : 360, height: maximized ? 'auto' : 520,
          inset: maximized ? 12 : undefined,
          background: 'linear-gradient(160deg,#0f1f33 0%,#0a1520 100%)',
          border: '1px solid rgba(255,255,255,.1)', borderRadius: maximized ? 20 : 18,
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

            {/* Live voice (Railway realtime) — optional, only if configured */}
            {process.env.NEXT_PUBLIC_REALTIME_WS_URL && (
              <button className="kira-mic-btn"
                title={realtimeMode ? 'End live voice' : `Live voice · ${CREDIT_COST.liveVoice} credits / 5 min`}
                disabled={realtimeConnecting}
                onClick={realtimeMode ? exitRealtimeMode : enterRealtimeMode}
                style={{
                  width: 28, height: 28, borderRadius: 7, border: 'none',
                  background: realtimeMode ? '#10b98133' : 'rgba(255,255,255,.08)',
                  cursor: realtimeConnecting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'all .15s', opacity: realtimeConnecting ? .5 : 1,
                  boxShadow: realtimeMode ? '0 0 10px #10b98155' : 'none',
                }}>
                {realtimeMode
                  ? <svg width="12" height="12" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round"/></svg>
                  : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/><circle cx="12" cy="12" r="1" fill="#10b981" stroke="none"/></svg>
                }
              </button>
            )}

            {msgs.length > 0 && (
              <button onClick={() => { setMsgs([]); setKiraMode(''); localStorage.removeItem(LS.aiMessages) }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.3)', fontSize: 10, cursor: 'pointer', padding: '2px 4px', fontFamily: f.body, flexShrink: 0 }}>
                Clear
              </button>
            )}

            {/* Expand / collapse */}
            <button
              className="kira-expand"
              title={maximized ? 'Collapse' : 'Expand'}
              onClick={() => setMaximized(m => !m)}
              style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,.08)', cursor: 'pointer', color: 'rgba(255,255,255,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .15s' }}>
              {maximized
                ? /* collapse — arrows pointing inward */
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M10 1v5h5M6 15v-5H1M1 6l5 5M15 10l-5-5"/>
                  </svg>
                : /* expand — arrows pointing outward */
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M10 1h5v5M6 15H1v-5M15 1l-5 5M1 15l5-5"/>
                  </svg>
              }
            </button>

            <button className="kira-close" onClick={() => { setOpen(false); setMaximized(false) }}
              style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,.08)', cursor: 'pointer', color: 'rgba(255,255,255,.6)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              ✕
            </button>
          </div>

          {/* ── Realtime voice overlay ── */}
          {realtimeMode ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '24px 20px', overflowY: 'auto' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: '#10b981', textTransform: 'uppercase' }}>
                Live Voice
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: f.heading, color: realtimeSecsLeft <= 30 ? '#f87171' : 'rgba(255,255,255,.85)', letterSpacing: 1 }}>
                {String(Math.floor(realtimeSecsLeft / 60)).padStart(1, '0')}:{String(realtimeSecsLeft % 60).padStart(2, '0')}
              </div>
              <VoiceOrb state={
                realtimeState === 'listening'   ? 'listening'  :
                realtimeState === 'processing'  ? 'processing' :
                realtimeState === 'speaking'    ? 'speaking'   : 'idle'
              } large={maximized}/>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', fontFamily: f.body, textAlign: 'center' }}>
                {realtimeState === 'connecting' ? 'Connecting…' :
                 realtimeState === 'ready'      ? 'Speak anytime — Kira is listening' :
                 realtimeState === 'listening'  ? 'Listening…' :
                 realtimeState === 'processing' ? 'Thinking…' :
                 realtimeState === 'speaking'   ? 'Speaking…' : ''}
              </div>
              {msgs.filter(m => m.role === 'user').length > 0 && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.2)', fontFamily: f.body, textAlign: 'center' }}>
                  {msgs.filter(m => m.role === 'user').length} exchanges · end to see transcript
                </div>
              )}
              <button onClick={exitRealtimeMode}
                style={{ padding: '8px 20px', borderRadius: 20, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: 'rgba(255,255,255,.35)', fontSize: 12, cursor: 'pointer', fontFamily: f.body }}>
                End live voice
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
                            {/* Title row with optional match badge */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                              <div style={{ fontWeight: 700, fontSize: 12, color: '#fff', fontFamily: f.heading, lineHeight: 1.3, flex: 1 }}>{job.title}</div>
                              {job.match_score != null && (
                                <span style={{
                                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8, whiteSpace: 'nowrap' as const, flexShrink: 0,
                                  background: job.match_score >= 80 ? '#10b98120' : job.match_score >= 60 ? '#f59e0b20' : '#94a3b820',
                                  color:      job.match_score >= 80 ? '#10b981'   : job.match_score >= 60 ? '#f59e0b'   : '#94a3b8',
                                  border:     `1px solid ${job.match_score >= 80 ? '#10b98140' : job.match_score >= 60 ? '#f59e0b40' : '#94a3b840'}`,
                                }}>
                                  {job.match_score}%
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginTop: 3 }}>{job.company} · {job.location}</div>
                            {salary && <div style={{ fontSize: 11, color: accent, marginTop: 3, fontWeight: 600 }}>{salary}</div>}
                            {/* Skill pills — only when scoring ran */}
                            {((job.matching_skills?.length ?? 0) > 0 || (job.missing_skills?.length ?? 0) > 0) && (
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const, marginTop: 6 }}>
                                {job.matching_skills?.map((s, i) => (
                                  <span key={i} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 5, background: '#10b98118', color: '#10b981', border: '1px solid #10b98130' }}>✓ {s}</span>
                                ))}
                                {job.missing_skills?.slice(0, 1).map((s, i) => (
                                  <span key={i} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 5, background: '#f59e0b12', color: '#f59e0b', border: '1px solid #f59e0b30' }}>↑ {s}</span>
                                ))}
                              </div>
                            )}
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

              {/* Interview coaching unlock banner */}
              {interviewRole && !coachUnlocked && (
                <div style={{ margin: '8px 0 4px', padding: '12px 14px', borderRadius: 12, background: `${accent}12`, border: `1px solid ${accent}33`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: f.heading }}>
                    Interview Coaching Available
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', lineHeight: 1.5 }}>
                    Kira can give you fully tailored coaching for your <strong style={{ color: 'rgba(255,255,255,.85)' }}>{interviewRole}</strong>{interviewCompany ? <> at <strong style={{ color: 'rgba(255,255,255,.85)' }}>{interviewCompany}</strong></> : null} interview — STAR answers, role-specific tips, mock Q&amp;A, and more.
                  </div>
                  <button onClick={unlockCoaching} disabled={coachUnlocking}
                    style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 12, fontWeight: 700, cursor: coachUnlocking ? 'not-allowed' : 'pointer', fontFamily: f.heading, opacity: coachUnlocking ? .6 : 1, display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', transition: 'opacity .15s' }}>
                    {coachUnlocking && <span style={{ width: 10, height: 10, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'kira-spin .8s linear infinite' }}/>}
                    {coachUnlocking ? 'Unlocking…' : 'Unlock Full Coaching — 1 credit'}
                  </button>
                </div>
              )}



              <div ref={bottomRef}/>
            </div>
          )}

          {/* ── Text input — hidden in realtime mode ── */}
          {!realtimeMode && (
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
                {lang === 'DE' ? 'Enter zum Senden' : 'Enter to send'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FAB — hidden while maximized ── */}
      {!maximized && <button className="kira-fab" onClick={() => {
        const nowOpening = !open
        setOpen(o => !o)
        if (!nowOpening) {
          if (realtimeModeRef.current) exitRealtimeMode()
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
      </button>}
    </>,
    document.body
  )
}
