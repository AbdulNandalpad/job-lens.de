'use client'

// Interactive tile for the guides pages: cursor-following 3D tilt, a radial
// light that tracks the mouse, accent glow + border on hover, and a shine
// sweep (CSS ::after in GuideStyles). Direct DOM style mutation on mousemove —
// no React re-renders per frame.

import Link from 'next/link'
import { useRef, type ReactNode, type CSSProperties, type MouseEvent } from 'react'

export default function TiltCard({ href, accent, children, style, className = '' }: {
  href: string
  accent: string
  children: ReactNode
  style?: CSSProperties
  className?: string
}) {
  const ref = useRef<HTMLAnchorElement>(null)

  const onMove = (e: MouseEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    el.style.setProperty('--mx', `${px * 100}%`)
    el.style.setProperty('--my', `${py * 100}%`)
    const rx = (0.5 - py) * 7
    const ry = (px - 0.5) * 9
    el.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px) scale(1.015)`
    el.style.boxShadow = `0 18px 42px -12px ${accent}66`
    el.style.borderColor = `${accent}99`
  }

  const onLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.transform = ''
    el.style.boxShadow = ''
    el.style.borderColor = ''
  }

  return (
    <Link ref={ref} href={href} onMouseMove={onMove} onMouseLeave={onLeave}
      className={`gd-tilt ${className}`}
      style={{ ...style, '--tg': `${accent}26` } as CSSProperties}>
      <span aria-hidden className="gd-tilt-glow" />
      {children}
    </Link>
  )
}
