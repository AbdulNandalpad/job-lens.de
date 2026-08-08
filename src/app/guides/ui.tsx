// Shared chrome for the public /guides pages — slim marketing-style header,
// legal footer, JSON-LD escaping, and per-route accents. Server components
// only, no client JS.

import Link from 'next/link'
import { theme } from '@/lib/theme'
import type { VisaOptionId } from '@/lib/visaGuides'

const { colors: c, gradients: g } = theme

// One accent per visa route so the five guides read as distinct doors.
export const GUIDE_ACCENTS: Record<VisaOptionId, { color: string; emoji: string }> = {
  blue_card:            { color: '#2563C8', emoji: '💳' },
  fachkraft_academic:   { color: '#6D28D9', emoji: '🎓' },
  fachkraft_vocational: { color: '#1D9E75', emoji: '🔧' },
  chancenkarte:         { color: '#C98A00', emoji: '⭐' },
  anerkennungsvisum:    { color: '#E24B4A', emoji: '📜' },
}

// Small rounded German flag — the identity touch on guide pages.
export function GermanFlag({ width = 27 }: { width?: number }) {
  const h = Math.round(width * 0.6)
  return (
    <svg width={width} height={h} viewBox="0 0 30 18" style={{ borderRadius: 3, flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.18)' }} aria-label="Germany">
      <rect width="30" height="6" y="0" fill="#1a1a1a" />
      <rect width="30" height="6" y="6" fill="#DD0000" />
      <rect width="30" height="6" y="12" fill="#FFCC00" />
    </svg>
  )
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
      @media (max-width: 640px) {
        .gd-h1 { font-size: 26px !important; }
        .gd-figures td, .gd-figures th { font-size: 12px !important; }
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
