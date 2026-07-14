/**
 * Lightweight canvas confetti burst — zero dependencies.
 * Fires a short particle burst from the top of the viewport and cleans
 * itself up after the animation finishes.
 */

const COLORS = ['#378ADD', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#10b981']

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  rotation: number
  rotationSpeed: number
  shape: 'rect' | 'circle'
}

export function fireConfetti(opts?: { particleCount?: number; durationMs?: number }) {
  if (typeof window === 'undefined') return
  const particleCount = opts?.particleCount ?? 140
  const durationMs = opts?.durationMs ?? 2600

  const canvas = document.createElement('canvas')
  canvas.style.position = 'fixed'
  canvas.style.inset = '0'
  canvas.style.width = '100vw'
  canvas.style.height = '100vh'
  canvas.style.pointerEvents = 'none'
  canvas.style.zIndex = '9999'
  const dpr = window.devicePixelRatio || 1
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  if (!ctx) { canvas.remove(); return }
  ctx.scale(dpr, dpr)

  const w = window.innerWidth
  const h = window.innerHeight

  const particles: Particle[] = Array.from({ length: particleCount }, () => ({
    x: w / 2 + (Math.random() - 0.5) * w * 0.5,
    y: -20,
    vx: (Math.random() - 0.5) * 6,
    vy: Math.random() * 3 + 2,
    size: Math.random() * 7 + 5,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 14,
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
  }))

  const gravity = 0.12
  const drag = 0.995
  const start = performance.now()
  let rafId: number

  function frame(now: number) {
    const elapsed = now - start
    ctx!.clearRect(0, 0, w, h)

    for (const p of particles) {
      p.vy += gravity
      p.vx *= drag
      p.x += p.vx
      p.y += p.vy
      p.rotation += p.rotationSpeed

      const fadeStart = durationMs * 0.7
      const alpha = elapsed > fadeStart ? Math.max(0, 1 - (elapsed - fadeStart) / (durationMs - fadeStart)) : 1

      ctx!.save()
      ctx!.globalAlpha = alpha
      ctx!.translate(p.x, p.y)
      ctx!.rotate((p.rotation * Math.PI) / 180)
      ctx!.fillStyle = p.color
      if (p.shape === 'rect') {
        ctx!.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
      } else {
        ctx!.beginPath()
        ctx!.arc(0, 0, p.size / 2, 0, Math.PI * 2)
        ctx!.fill()
      }
      ctx!.restore()
    }

    if (elapsed < durationMs) {
      rafId = requestAnimationFrame(frame)
    } else {
      cancelAnimationFrame(rafId)
      canvas.remove()
    }
  }

  rafId = requestAnimationFrame(frame)
}
