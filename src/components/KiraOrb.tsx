'use client'

// Kira's hero orb — a saturated, living gradient sphere in Kira's identity
// colors (the purple→blue of her corner bubble), with light drifting inside
// and a colored glow that grounds it on the light page. The dark-panel widget
// keeps its own VoiceOrb in AIWidget.tsx.

import { useEffect, useRef } from 'react'

export type OrbState = 'idle' | 'listening' | 'processing' | 'speaking'

// Kira identity palette (mirrors the FAB gradient + theme.ts accents)
const BLUE   = '55,138,221'   // #378ADD
const CYAN   = '0,220,255'
const PURPLE = '109,40,217'   // #6D28D9
const PINK   = '236,72,153'
const DEEP   = '30,20,80'

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
      const idleB = s === 'idle' && breatheRef.current
      if (s === 'idle' && !idleB) return
      // Idle: a slow, ambient drizzle of dots. Active: the full spray.
      const n = s === 'speaking' ? 5 : s === 'listening' ? 3 : s === 'processing' ? 1 : (Math.random() < 0.45 ? 1 : 0)
      for (let i = 0; i < n; i++) {
        const angle = Math.random() * Math.PI * 2
        const x     = cx + Math.cos(angle) * (CR + 4)
        const y     = cy + Math.sin(angle) * (CR + 4)
        const spd   = idleB ? 0.35 + Math.random() * 1.1 : 1 + Math.random() * 3
        particles.current.push({
          x, y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          life: 1,
          decay: idleB ? 0.006 + Math.random() * 0.010 : 0.022 + Math.random() * 0.028,
          r: idleB ? 1.0 + Math.random() * 2.0 : 1.2 + Math.random() * 2.8,
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
        const a = Math.max(0, p.life) * 0.75
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.left ? `rgba(${CYAN},${a})` : `rgba(${PINK},${a})`
        ctx.fill()
      }
    }

    function drawWaveSide(t: number, left: boolean, amplitude: number, speed: number, dim = 1) {
      const startX = cx + (left ? -CR : CR)
      const endX   = left ? 0 : W
      const dir    = left ? -1 : 1
      const len    = Math.abs(endX - startX)

      const layers = [
        { fq: 1.0, am: 1.00, lw: 3.4, al: 0.95 * dim, ph: 0.0  },
        { fq: 1.7, am: 0.55, lw: 2.2, al: 0.60 * dim, ph: 1.3  },
        { fq: 0.7, am: 0.75, lw: 1.5, al: 0.38 * dim, ph: 2.9  },
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
          grad.addColorStop(0.5, `rgba(${CYAN},${lyr.al * 0.6})`)
          grad.addColorStop(1,   `rgba(${CYAN},0)`)
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

    // Light drifting inside the sphere — cyan and pink glows over the gradient
    function drawInnerLight(t: number, energy: number) {
      ctx.save()
      ctx.beginPath(); ctx.arc(cx, cy, CR - 1, 0, Math.PI * 2); ctx.clip()

      const blobs = [
        { col: CYAN,          a: 0.30, r: 0.95, sx: 0.55, sy: 0.40, spx: 0.42, spy: 0.31, ph: 0.0 },
        { col: PINK,          a: 0.24, r: 0.85, sx: 0.50, sy: 0.45, spx: 0.30, spy: 0.44, ph: 2.4 },
        { col: '255,255,255', a: 0.18, r: 0.75, sx: 0.40, sy: 0.35, spx: 0.51, spy: 0.24, ph: 4.5 },
      ]
      for (const b of blobs) {
        const bx = cx + Math.cos(t * b.spx + b.ph) * CR * b.sx
        const by = cy + Math.sin(t * b.spy + b.ph) * CR * b.sy
        const g  = ctx.createRadialGradient(bx, by, 0, bx, by, CR * b.r)
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
      const amp = s === 'speaking' ? 58 : s === 'listening' ? 38 : s === 'processing' ? 20 : idleBreathing ? 12 : 0
      const spd = s === 'speaking' ? 3.4 : s === 'listening' ? 2.0 : idleBreathing ? 0.8 : 1.4

      ctx.clearRect(0, 0, W, H)

      // Ambient glow — blue on the left, purple on the right, breathing
      const glowA = s === 'speaking' ? 0.26 : s === 'listening' ? 0.22 : s === 'processing' ? 0.18 : idleBreathing ? 0.18 + 0.06 * Math.sin(t * 0.9) : 0.12
      for (const [col, ox] of [[BLUE, -0.5], [PURPLE, 0.5]] as [string, number][]) {
        const g = ctx.createRadialGradient(cx + CR * ox, cy, CR * 0.4, cx + CR * ox, cy, CR * 2.2)
        g.addColorStop(0, `rgba(${col},${glowA})`)
        g.addColorStop(1, `rgba(${col},0)`)
        ctx.beginPath(); ctx.arc(cx + CR * ox, cy, CR * 2.2, 0, Math.PI * 2)
        ctx.fillStyle = g; ctx.fill()
      }

      // Ground shadow — anchors the sphere on the page
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(cx, cy + CR * 1.28, CR * 0.72, CR * 0.14, 0, 0, Math.PI * 2)
      const gs = ctx.createRadialGradient(cx, cy + CR * 1.28, 0, cx, cy + CR * 1.28, CR * 0.72)
      gs.addColorStop(0, `rgba(${DEEP},0.18)`)
      gs.addColorStop(1, `rgba(${DEEP},0)`)
      ctx.fillStyle = gs; ctx.fill()
      ctx.restore()

      if (s !== 'idle') {
        emitParticles()
        stepParticles()
        drawWaveSide(t, true,  amp, spd)
        drawWaveSide(t, false, amp, spd)
        drawParticles()
      } else if (idleBreathing) {
        emitParticles()
        stepParticles()
        const dim = 0.78 + 0.16 * Math.sin(t * 0.9)
        drawWaveSide(t, true,  amp, spd, dim)
        drawWaveSide(t, false, amp, spd, dim)
        drawParticles()
      } else {
        particles.current = []
      }

      // The sphere — Kira's saturated purple→blue identity gradient, lit top-left
      const fill = ctx.createRadialGradient(cx - CR * 0.35, cy - CR * 0.40, CR * 0.10, cx, cy, CR)
      fill.addColorStop(0,    '#7db4ef')
      fill.addColorStop(0.45, '#4a86e0')
      fill.addColorStop(1,    '#5b21b6')
      ctx.beginPath(); ctx.arc(cx, cy, CR, 0, Math.PI * 2)
      ctx.fillStyle = fill; ctx.fill()

      // Living light inside — livelier when Kira is active
      const energy = s === 'speaking' ? 1.6 : s === 'listening' ? 1.3 : s === 'processing' ? 1.15 : idleBreathing ? 0.95 + 0.20 * Math.sin(t * 0.7) : 0.85
      drawInnerLight(t, energy)

      // Depth — darker toward the lower-right edge
      const depth = ctx.createRadialGradient(cx + CR * 0.3, cy + CR * 0.45, CR * 0.2, cx, cy, CR * 1.05)
      depth.addColorStop(0, `rgba(${DEEP},0.22)`)
      depth.addColorStop(1, `rgba(${DEEP},0)`)
      ctx.save()
      ctx.beginPath(); ctx.arc(cx, cy, CR - 1, 0, Math.PI * 2); ctx.clip()
      ctx.fillStyle = depth
      ctx.fillRect(cx - CR, cy - CR, CR * 2, CR * 2)
      ctx.restore()

      // Glass highlight — bright arc top-left
      const hl = ctx.createRadialGradient(cx - CR * 0.38, cy - CR * 0.48, 0, cx - CR * 0.38, cy - CR * 0.48, CR * 0.55)
      hl.addColorStop(0, 'rgba(255,255,255,0.55)')
      hl.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.save()
      ctx.beginPath(); ctx.arc(cx, cy, CR - 1, 0, Math.PI * 2); ctx.clip()
      ctx.fillStyle = hl
      ctx.fillRect(cx - CR, cy - CR, CR * 2, CR * 2)
      ctx.restore()

      // Rim — thin light edge so the sphere reads crisp against the glow
      const rimA = s !== 'idle' ? 0.55 : idleBreathing ? 0.30 + 0.10 * Math.sin(t * 0.9) : 0.28
      ctx.beginPath(); ctx.arc(cx, cy, CR, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255,255,255,${rimA})`
      ctx.lineWidth = 1.5
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
              {[0,1,2].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,.9)', animation: `kira-dot 1.1s ease-in-out ${i * .18}s infinite` }} />)}
            </div>
          : <MicIcon size={22} color={state !== 'idle' ? '#ffffff' : 'rgba(255,255,255,0.85)'} />
        }
      </div>
    </div>
  )
}
