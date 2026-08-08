// Shared chrome for the public /guides pages — slim marketing-style header,
// legal footer, JSON-LD escaping, and per-route accents. Server components
// only, no client JS.

import Link from 'next/link'
import { theme } from '@/lib/theme'
import type { VisaOptionId } from '@/lib/visaGuides'
import { GermanFlag } from '@/components/Flags'

const { colors: c, gradients: g } = theme

export { GermanFlag }

// One accent per visa route so the five guides read as distinct doors.
export const GUIDE_ACCENTS: Record<VisaOptionId, { color: string }> = {
  blue_card:            { color: '#2563C8' },
  fachkraft_academic:   { color: '#6D28D9' },
  fachkraft_vocational: { color: '#1D9E75' },
  chancenkarte:         { color: '#C98A00' },
  anerkennungsvisum:    { color: '#E24B4A' },
}

// Outline SVG icon per visa route — replaces emoji (inconsistent rendering
// across OS/browsers, and never used as UI icons in this codebase).
export function GuideIcon({ id, size = 16, color = 'currentColor' }: { id: VisaOptionId; size?: number; color?: string }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (id) {
    case 'blue_card':
      return <svg {...props}><rect x="2" y="5" width="20" height="14" rx="2.5" /><line x1="2" y1="10" x2="22" y2="10" /><line x1="6" y1="15" x2="10" y2="15" /></svg>
    case 'fachkraft_academic':
      return <svg {...props}><path d="M2 9l10-5 10 5-10 5-10-5z" /><path d="M6 11.5V17c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5" /><line x1="22" y1="9" x2="22" y2="15" /></svg>
    case 'fachkraft_vocational':
      return <svg {...props}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L2 19l3 3 7.3-7.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2-2 2.5-2.5z" /></svg>
    case 'chancenkarte':
      return <svg {...props}><polygon points="12 2.5 15 9 22 10 17 14.8 18.2 21.5 12 18.2 5.8 21.5 7 14.8 2 10 9 9" /></svg>
    case 'anerkennungsvisum':
      return <svg {...props}><path d="M7 3h10a1 1 0 0 1 1 1v16l-4-2-2 2-2-2-4 2V4a1 1 0 0 1 1-1z" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="9" y1="12" x2="15" y2="12" /></svg>
  }
}

// Tricolor underline — a slim black-red-gold bar for headings.
export function TricolorBar({ width = 120 }: { width?: number }) {
  return (
    <span style={{ display: 'inline-flex', width, height: 5, borderRadius: 3, overflow: 'hidden' }}>
      <span style={{ flex: 1, background: '#1a1a1a' }} />
      <span style={{ flex: 1, background: '#DD0000' }} />
      <span style={{ flex: 1, background: '#FFCC00' }} />
    </span>
  )
}

// Escape JSON-LD so page content can never break out of the script tag
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}

export function formatVerifiedDate(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  } catch {
    return iso
  }
}

export function GuideStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700;800&display=swap');
      .gd-body { font-family: 'DM Sans', system-ui, sans-serif; color: ${c.text}; background: ${g.heroLight.replace(/\n/g, ' ')}; min-height: 100vh; }
      .gd-wrap { max-width: 860px; margin: 0 auto; padding: 0 20px; }
      .gd-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
      .gd-cta:hover { transform: translateY(-1px); }
      .gd-related:hover { border-color: ${c.accent}; }

      /* Interactive tiles — 3D tilt (TiltCard.tsx), cursor glow, shine sweep */
      .gd-tilt { position: relative; overflow: hidden; transform-style: preserve-3d; will-change: transform; transition: transform .3s cubic-bezier(.22,1,.36,1), box-shadow .35s ease, border-color .25s ease; }
      .gd-tilt-glow { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity .35s ease; background: radial-gradient(260px circle at var(--mx, 50%) var(--my, 50%), var(--tg, rgba(55,138,221,0.15)), transparent 65%); }
      .gd-tilt:hover .gd-tilt-glow { opacity: 1; }
      .gd-tilt::after { content: ''; position: absolute; top: -20%; left: -80%; width: 45%; height: 140%; background: linear-gradient(105deg, transparent, rgba(255,255,255,0.5), transparent); transform: skewX(-20deg); pointer-events: none; transition: left .01s; opacity: 0; }
      .gd-tilt:hover::after { left: 140%; opacity: 1; transition: left .65s ease, opacity .1s; }

      /* Staggered entrance */
      @keyframes gd-pop { from { opacity: 0; transform: translateY(18px) scale(.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
      .gd-pop { opacity: 0; animation: gd-pop .65s cubic-bezier(.22,1,.36,1) forwards; }

      /* Ambient aurora — slow drifting blurred orbs behind the hub hero */
      .gd-stage { position: relative; overflow: hidden; }
      .gd-stage > * { position: relative; z-index: 1; }
      @keyframes gd-drift1 { 0%,100% { transform: translate(0,0) scale(1) } 50% { transform: translate(60px,40px) scale(1.15) } }
      @keyframes gd-drift2 { 0%,100% { transform: translate(0,0) scale(1) } 50% { transform: translate(-50px,-30px) scale(1.1) } }
      .gd-orb { position: absolute; border-radius: 50%; filter: blur(70px); pointer-events: none; z-index: 0 !important; }
      .gd-orb-1 { width: 380px; height: 380px; top: -120px; right: -80px; background: rgba(55,138,221,0.16); animation: gd-drift1 14s ease-in-out infinite; }
      .gd-orb-2 { width: 320px; height: 320px; bottom: -100px; left: -90px; background: rgba(109,40,217,0.10); animation: gd-drift2 17s ease-in-out infinite; }
      .gd-orb-3 { width: 260px; height: 260px; top: 30%; left: 42%; background: rgba(255,204,0,0.08); animation: gd-drift1 20s ease-in-out infinite; }

      @media (max-width: 640px) {
        .gd-h1 { font-size: 26px !important; }
        .gd-figures td, .gd-figures th { font-size: 12px !important; }
        .gd-orb { display: none; }   /* heavy blur — skip on phones */
        .gd-wrap { padding: 0 16px; }
      }
      @media (prefers-reduced-motion: reduce) {
        .gd-tilt, .gd-pop, .gd-orb { animation: none !important; transition: none !important; }
        .gd-pop { opacity: 1 !important; }
      }
    `}</style>
  )
}

export function PublicHeader() {
  return (
    <div style={{ background: c.primary, padding: '0 20px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-icon.svg" alt="Job-Lens AI" width={26} height={26} style={{ display: 'block' }} />
        <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700, color: '#E6F1FB' }}>
          Job-Lens <span style={{ color: '#378ADD' }}>AI</span>
        </span>
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Link href="/guides" style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', textDecoration: 'none' }}>Visa Guides</Link>
        <Link href="/login" style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: 'rgba(55,138,221,0.25)', border: '1px solid rgba(55,138,221,0.5)', padding: '6px 16px', borderRadius: 8, textDecoration: 'none' }}>
          Sign in
        </Link>
      </div>
    </div>
  )
}

export function PublicFooter() {
  return (
    <footer style={{ marginTop: 56, padding: '28px 20px 32px', borderTop: `1px solid ${c.borderLight}`, textAlign: 'center' }}>
      <div style={{ fontSize: 12, color: c.textFaint, marginBottom: 12 }}>
        Job-Lens AI — Made in Germany. Independent guide; not legal advice. Always verify with the official sources linked on this page.
      </div>
      <div style={{ display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/" style={{ fontSize: 12, color: c.textMuted, textDecoration: 'none' }}>Home</Link>
        <Link href="/in" style={{ fontSize: 12, color: c.textMuted, textDecoration: 'none' }}>Job-Lens India</Link>
        <Link href="/guides" style={{ fontSize: 12, color: c.textMuted, textDecoration: 'none' }}>Visa Guides</Link>
        <Link href="/contact" style={{ fontSize: 12, color: c.textMuted, textDecoration: 'none' }}>Contact</Link>
        <Link href="/impressum" style={{ fontSize: 12, color: c.textMuted, textDecoration: 'none' }}>Impressum</Link>
        <Link href="/privacy" style={{ fontSize: 12, color: c.textMuted, textDecoration: 'none' }}>Privacy</Link>
      </div>
    </footer>
  )
}

export function CtaBand({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{ background: g.ctaBlock, borderRadius: 14, padding: compact ? '20px 22px' : '26px 26px', margin: '26px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: compact ? 16 : 19, fontWeight: 700, color: '#fff', lineHeight: 1.35 }}>
        Will you qualify? Check all 5 German visa routes in 2 minutes.
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>
        Job-Lens AI scores your profile against every route — Blue Card, skilled-worker visas, Chancenkarte and recognition visa — and shows what you&apos;re missing. Free to start.
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link href="/go/visa" className="gd-cta"
          style={{ display: 'inline-block', background: g.button, color: '#fff', padding: '11px 22px', borderRadius: 9, fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14, textDecoration: 'none', transition: 'transform .15s' }}>
          Check my eligibility →
        </Link>
        <Link href="/go/jobs" className="gd-cta"
          style={{ display: 'inline-block', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '11px 22px', borderRadius: 9, fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 14, textDecoration: 'none', transition: 'transform .15s' }}>
          Browse jobs in Germany
        </Link>
      </div>
    </div>
  )
}
