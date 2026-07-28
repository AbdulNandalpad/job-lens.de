'use client'

// Extracted copy of the VoiceOrb canvas from AIWidget.tsx so KiraHome can use
// the same visual without touching that file. One addition: `breathe` gives the
// idle state a slow low-amplitude wave so the orb reads as a presence, not a
// static circle, when it is the hero of the page.

import { useEffect, useRef } from 'react'

export type OrbState = 'idle' | 'listening' | 'processing' | 'speaking'

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

export default function KiraOrb({ state, large = false, breathe = false }: { state: OrbState; large?: boolean; breathe?: boolean }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const rafRef     = useRef<number>(0)
  const timeRef    = useRef(0)
  const stateRef   = useRef(state)
  const breatheRef = useRef(breathe)

  useEffect(() => { stateRef.current = state }, [state])
  useEffect(() => { breatheRef.current = breathe }, [breathe])

  type Particle = { x: number; y: number; vx: number; vy: number; life: number; decay: number; r: number; left: boolean }
  const particles = useRef<Particle[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    if (!ctx) return

    const W = 640, H = 320
    canvas.width  = W
    canvas.height = H
    const cx = W / 2, cy = H / 2
    const CR = 76

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

    function drawWaveSide(t: number, left: boolean, amplitude: number, speed: number, dim = 1) {
      const startX = cx + (left ? -CR : CR)
      const endX   = left ? 0 : W
      const dir    = left ? -1 : 1
      const len    = Math.abs(endX - startX)

      const layers = [
        { fq: 1.0, am: 1.00, lw: 3.0, al: 0.90 * dim, ph: 0.0  },
        { fq: 1.7, am: 0.55, lw: 1.8, al: 0.55 * dim, ph: 1.3  },
        { fq: 0.7, am: 0.75, lw: 1.2, al: 0.32 * dim, ph: 2.9  },
      ]

      for (const lyr of layers) {
        ctx.beginPath()
        for (let i = 0; i <= 120; i++) {
          const p   = i / 120
          const x   = startX + dir * p * len
          const env = Math.sin(p * Math.PI)
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
      const idleBreathing = s === 'idle' && breatheRef.current
      const amp = s === 'speaking' ? 58 : s === 'listening' ? 38 : s === 'processing' ? 20 : idleBreathing ? 9 : 0
      const spd = s === 'speaking' ? 3.4 : s === 'listening' ? 2.0 : idleBreathing ? 0.8 : 1.4

      ctx.clearRect(0, 0, W, H)

      if (s !== 'idle') {
        emitParticles()
        stepParticles()
        drawWaveSide(t, true,  amp, spd)
        drawWaveSide(t, false, amp, spd)
        drawParticles()

        const col = s === 'speaking' ? '255,20,155' : '0,220,200'
        const gc  = ctx.createRadialGradient(cx, cy, CR * 0.5, cx, cy, CR * 2.4)
        gc.addColorStop(0, `rgba(${col},0.25)`)
        gc.addColorStop(1, `rgba(${col},0)`)
        ctx.beginPath(); ctx.arc(cx, cy, CR * 2.4, 0, Math.PI * 2)
        ctx.fillStyle = gc; ctx.fill()
      } else if (idleBreathing) {
        particles.current = []
        const dim = 0.4 + 0.15 * Math.sin(t * 0.9)
        drawWaveSide(t, true,  amp, spd, dim)
        drawWaveSide(t, false, amp, spd, dim)

        const halo = 0.10 + 0.05 * Math.sin(t * 0.9)
        const gc = ctx.createRadialGradient(cx, cy, CR * 0.5, cx, cy, CR * 2.2)
        gc.addColorStop(0, `rgba(0,190,255,${halo})`)
        gc.addColorStop(1, 'rgba(0,190,255,0)')
        ctx.beginPath(); ctx.arc(cx, cy, CR * 2.2, 0, Math.PI * 2)
        ctx.fillStyle = gc; ctx.fill()
      } else {
        particles.current = []
      }

      const fill = ctx.createRadialGradient(cx - CR * 0.22, cy - CR * 0.32, CR * 0.08, cx, cy, CR)
      fill.addColorStop(0, '#1e3250')
      fill.addColorStop(1, '#0b1622')
      ctx.beginPath(); ctx.arc(cx, cy, CR, 0, Math.PI * 2)
      ctx.fillStyle = fill; ctx.fill()

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
      } else if (idleBreathing) {
        const glow = 0.25 + 0.12 * Math.sin(timeRef.current * 0.9)
        const brd = ctx.createLinearGradient(cx - CR, cy, cx + CR, cy)
        brd.addColorStop(0, `rgba(0,230,210,${glow})`)
        brd.addColorStop(1, `rgba(0,160,255,${glow})`)
        ctx.strokeStyle = brd; ctx.lineWidth = 2
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
