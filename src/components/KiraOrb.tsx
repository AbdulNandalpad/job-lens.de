'use client'

// Kira's orb for light surfaces (Kira Home hero + docked header). A glass
// sphere with a slow brand-colored aurora inside, side waves, and a breathing
// halo. The dark-panel widget keeps its own VoiceOrb in AIWidget.tsx —
// this one is tuned for the light marketing-style canvas.

import { useEffect, useRef } from 'react'

export type OrbState = 'idle' | 'listening' | 'processing' | 'speaking'

// Brand palette (mirrors theme.ts — canvas needs raw rgb triplets)
const BLUE   = '55,138,221'   // #378ADD accent
const NAVY   = '24,95,165'    // #185FA5
const PURPLE = '109,40,217'   // #6D28D9 ai
const TEAL   = '29,158,117'   // #1D9E75 success
const PINK   = '236,72,153'   // marketing hero pink

function MicIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="9"  y1="22" x2="15" y2="22" />
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
        const a = Math.max(0, p.life) * 0.7
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.left ? `rgba(${BLUE},${a})` : `rgba(${PURPLE},${a})`
        ctx.fill()
      }
    }

    function drawWaveSide(t: number, left: boolean, amplitude: number, speed: number, dim = 1) {
      const startX = cx + (left ? -CR : CR)
      const endX   = left ? 0 : W
      const dir    = left ? -1 : 1
      const len    = Math.abs(endX - startX)

      const layers = [
        { fq: 1.0, am: 1.00, lw: 3.0, al: 0.65 * dim, ph: 0.0  },
        { fq: 1.7, am: 0.55, lw: 1.8, al: 0.40 * dim, ph: 1.3  },
        { fq: 0.7, am: 0.75, lw: 1.2, al: 0.24 * dim, ph: 2.9  },
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
          grad.addColorStop(0,   `rgba(${BLUE},${lyr.al})`)
          grad.addColorStop(0.5, `rgba(${TEAL},${lyr.al * 0.6})`)
          grad.addColorStop(1,   `rgba(${TEAL},0)`)
        } else {
          grad.addColorStop(0,   `rgba(${PURPLE},${lyr.al})`)
          grad.addColorStop(0.5, `rgba(${PINK},${lyr.al * 0.6})`)
          grad.addColorStop(1,   `rgba(${PINK},0)`)
        }
        ctx.strokeStyle = grad
        ctx.lineWidth   = lyr.lw
        ctx.lineCap     = 'round'
        ctx.stroke()
      }
    }

    // Slow-drifting color clouds inside the glass sphere
    function drawAurora(t: number, energy: number) {
      ctx.save()
      ctx.beginPath(); ctx.arc(cx, cy, CR - 1, 0, Math.PI * 2); ctx.clip()

      const blobs = [
        { col: BLUE,   a: 0.34, r: 1.05, sx: 0.55, sy: 0.35, spx: 0.50, spy: 0.36, ph: 0.0 },
        { col: PURPLE, a: 0.26, r: 0.95, sx: 0.50, sy: 0.45, spx: 0.33, spy: 0.47, ph: 2.1 },
        { col: TEAL,   a: 0.20, r: 0.85, sx: 0.45, sy: 0.50, spx: 0.42, spy: 0.29, ph: 4.2 },
      ]
      for (const b of blobs) {
        const bx = cx + Math.cos(t * b.spx + b.ph) * CR * b.sx
        const by = cy + Math.sin(t * b.spy + b.ph) * CR * b.sy
        const br = CR * b.r
        const g  = ctx.createRadialGradient(bx, by, 0, bx, by, br)
        g.addColorStop(0, `rgba(${b.col},${b.a * energy})`)
        g.addColorStop(1, `rgba(${b.col},0)`)
        ctx.fillStyle = g
        ctx.fillRect(cx - CR, cy - CR, CR * 2, CR * 2)
      }
      ctx.restore()
    }

    function draw(t: number) {
      const s   = stateRef.current
      const idleBreathing = s === 'idle' && breatheRef.current
      const amp = s === 'speaking' ? 58 : s === 'listening' ? 38 : s === 'processing' ? 20 : idleBreathing ? 9 : 0
      const spd = s === 'speaking' ? 3.4 : s === 'listening' ? 2.0 : idleBreathing ? 0.8 : 1.4

      ctx.clearRect(0, 0, W, H)

      // Soft halo behind the sphere — breathes in idle, brightens when active
      const haloBase = s === 'speaking' ? 0.22 : s === 'listening' ? 0.18 : s === 'processing' ? 0.14 : idleBreathing ? 0.10 + 0.04 * Math.sin(t * 0.9) : 0.08
      const haloCol  = s === 'speaking' ? PURPLE : BLUE
      const gc = ctx.createRadialGradient(cx, cy, CR * 0.55, cx, cy, CR * 2.3)
      gc.addColorStop(0, `rgba(${haloCol},${haloBase})`)
      gc.addColorStop(1, `rgba(${haloCol},0)`)
      ctx.beginPath(); ctx.arc(cx, cy, CR * 2.3, 0, Math.PI * 2)
      ctx.fillStyle = gc; ctx.fill()

      if (s !== 'idle') {
        emitParticles()
        stepParticles()
        drawWaveSide(t, true,  amp, spd)
        drawWaveSide(t, false, amp, spd)
        drawParticles()
      } else if (idleBreathing) {
        particles.current = []
        const dim = 0.45 + 0.15 * Math.sin(t * 0.9)
        drawWaveSide(t, true,  amp, spd, dim)
        drawWaveSide(t, false, amp, spd, dim)
      } else {
        particles.current = []
      }

      // Glass sphere — white glass with a top-left light source
      const fill = ctx.createRadialGradient(cx - CR * 0.30, cy - CR * 0.35, CR * 0.08, cx, cy, CR)
      fill.addColorStop(0,    '#ffffff')
      fill.addColorStop(0.55, '#f2f8ff')
      fill.addColorStop(1,    '#dcebfb')
      ctx.beginPath(); ctx.arc(cx, cy, CR, 0, Math.PI * 2)
      ctx.fillStyle = fill; ctx.fill()

      // Aurora inside the glass — livelier when Kira is active
      const energy = s === 'speaking' ? 1.5 : s === 'listening' ? 1.25 : s === 'processing' ? 1.1 : idleBreathing ? 0.9 + 0.15 * Math.sin(t * 0.7) : 0.8
      drawAurora(t, energy)

      // Depth: soft inner shadow along the bottom edge
      const depth = ctx.createRadialGradient(cx, cy + CR * 0.55, CR * 0.3, cx, cy + CR * 0.2, CR * 1.05)
      depth.addColorStop(0, `rgba(${NAVY},0.10)`)
      depth.addColorStop(1, `rgba(${NAVY},0)`)
      ctx.save()
      ctx.beginPath(); ctx.arc(cx, cy, CR - 1, 0, Math.PI * 2); ctx.clip()
      ctx.fillStyle = depth
      ctx.fillRect(cx - CR, cy - CR, CR * 2, CR * 2)
      ctx.restore()

      // Glass highlight — small bright arc top-left
      const hl = ctx.createRadialGradient(cx - CR * 0.35, cy - CR * 0.45, 0, cx - CR * 0.35, cy - CR * 0.45, CR * 0.55)
      hl.addColorStop(0, 'rgba(255,255,255,0.85)')
      hl.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.save()
      ctx.beginPath(); ctx.arc(cx, cy, CR - 1, 0, Math.PI * 2); ctx.clip()
      ctx.fillStyle = hl
      ctx.fillRect(cx - CR, cy - CR, CR * 2, CR * 2)
      ctx.restore()

      // Rim — brand gradient ring, stronger when active
      const rimA = s !== 'idle' ? 0.75 : idleBreathing ? 0.40 + 0.14 * Math.sin(t * 0.9) : 0.35
      const brd = ctx.createLinearGradient(cx - CR, cy - CR, cx + CR, cy + CR)
      brd.addColorStop(0, `rgba(${BLUE},${rimA})`)
      brd.addColorStop(1, `rgba(${PURPLE},${rimA})`)
      ctx.beginPath(); ctx.arc(cx, cy, CR, 0, Math.PI * 2)
      ctx.strokeStyle = brd; ctx.lineWidth = s !== 'idle' ? 2.5 : 2
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
              {[0,1,2].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(24,95,165,.75)', animation: `kira-dot 1.1s ease-in-out ${i * .18}s infinite` }} />)}
            </div>
          : <MicIcon size={22} color={state !== 'idle' ? '#6D28D9' : 'rgba(24,95,165,0.65)'} />
        }
      </div>
    </div>
  )
}
