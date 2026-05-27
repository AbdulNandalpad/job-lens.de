'use client'

import { useRef, useState } from 'react'

export interface CareerCardData {
  score: number
  readiness: string
  headline: string
  strengths: string[]
  salaryMin: number
  salaryMax: number
  salaryCurrency: string
  market: 'eu' | 'in'
  targetRole?: string
}

function scoreColor(s: number) {
  return s >= 80 ? '#1D9E75' : s >= 60 ? '#D97706' : '#DC2626'
}

function fmtSalary(n: number, currency: string, market: 'eu' | 'in') {
  if (market === 'in') return `${currency}${Math.round(n / 100000)}L`
  return `${currency}${Math.round(n / 1000)}k`
}

// The visual card — rendered off-screen and captured by html2canvas
function CardVisual({ data }: { data: CareerCardData }) {
  const col = scoreColor(data.score)
  const top3 = data.strengths.slice(0, 3)
  const salaryStr = data.salaryMin && data.salaryMax
    ? `${fmtSalary(data.salaryMin, data.salaryCurrency, data.market)} – ${fmtSalary(data.salaryMax, data.salaryCurrency, data.market)}`
    : null
  const flag = data.market === 'in' ? '🇮🇳 India' : '🇩🇪 DACH'
  const circ = 2 * Math.PI * 38
  const dash = (data.score / 100) * circ

  return (
    <div style={{
      width: 600, height: 320,
      background: 'linear-gradient(135deg, #061a2e 0%, #0a2540 60%, #0d1f35 100%)',
      borderRadius: 20,
      padding: '32px 36px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      boxSizing: 'border-box',
    }}>

      {/* Background accent glow */}
      <div style={{
        position: 'absolute', top: -60, right: -60,
        width: 260, height: 260,
        borderRadius: '50%',
        background: `radial-gradient(ellipse, ${col}18 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Top row: brand + market */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="20" height="20" viewBox="0 0 44 44">
            <circle cx="20" cy="20" r="13" fill="none" stroke="#378ADD" strokeWidth="2.5"/>
            <circle cx="20" cy="20" r="3" fill="#378ADD"/>
            <line x1="28" y1="28" x2="36" y2="36" stroke="#378ADD" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <span style={{ color: '#E6F1FB', fontSize: 13, fontWeight: 700, letterSpacing: 0.3 }}>
            Job-Lens <span style={{ color: '#378ADD' }}>AI</span>
          </span>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
          background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)',
          letterSpacing: 0.5,
        }}>{flag}</span>
      </div>

      {/* Middle: score ring + role info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>

        {/* Score ring */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width="96" height="96" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="48" cy="48" r="38" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7"/>
            <circle cx="48" cy="48" r="38" fill="none" stroke={col} strokeWidth="7"
              strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{data.score}</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, marginTop: 2 }}>/ 100</span>
          </div>
        </div>

        {/* Role details */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'inline-block', padding: '3px 12px', borderRadius: 20, marginBottom: 10,
            background: `${col}22`, border: `1px solid ${col}55`,
            color: col, fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
          }}>{data.readiness}</div>

          <div style={{
            color: '#fff', fontSize: 19, fontWeight: 700, lineHeight: 1.3,
            marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{data.headline}</div>

          {salaryStr && (
            <div style={{ color: '#378ADD', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
              {salaryStr} <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>est. salary</span>
            </div>
          )}

          {/* Strength pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {top3.map((s, i) => (
              <span key={i} style={{
                fontSize: 10, padding: '3px 10px', borderRadius: 20,
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.7)',
                maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>✓ {s}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: watermark */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, letterSpacing: 0.5 }}>
          Career Score · job-lens.de
        </span>
        <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10 }}>
          Generated with Job-Lens AI
        </span>
      </div>
    </div>
  )
}

export default function CareerCard({ data, accentColor }: { data: CareerCardData; accentColor?: string }) {
  const [show,        setShow]        = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [copied,      setCopied]      = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const accent  = accentColor || '#378ADD'

  async function download() {
    if (!cardRef.current || downloading) return
    setDownloading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      })
      const link = document.createElement('a')
      link.download = `career-card-${data.score}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch { /* ignore */ }
    setDownloading(false)
  }

  async function copyToClipboard() {
    if (!cardRef.current) return
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true, backgroundColor: null, logging: false })
      canvas.toBlob(async blob => {
        if (!blob) return
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    } catch { /* clipboard API not available */ }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setShow(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '9px 20px', borderRadius: 10,
          background: `${accent}18`, border: `1.5px solid ${accent}44`,
          color: accent, fontSize: 13, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
        }}>
        🎴 Share Career Card
      </button>

      {/* Modal */}
      {show && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16, backdropFilter: 'blur(6px)',
          }}
          onClick={() => setShow(false)}>
          <div
            style={{
              background: '#0a1520', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 20, padding: '28px 28px 24px', maxWidth: 680, width: '100%',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: "'Outfit', system-ui, sans-serif" }}>
                  Your Career Card
                </div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 2 }}>
                  Download and share on LinkedIn, Twitter, or WhatsApp
                </div>
              </div>
              <button onClick={() => setShow(false)}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', width: 28, height: 28, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ✕
              </button>
            </div>

            {/* Card preview (this div is captured) */}
            <div ref={cardRef} style={{ borderRadius: 20, overflow: 'hidden', width: '100%' }}>
              <div style={{ transform: 'scale(1)', transformOrigin: 'top left', width: 600 }}>
                <CardVisual data={data} />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={download} disabled={downloading}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 10,
                  background: downloading ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${accent}, #185FA5)`,
                  border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: downloading ? 'not-allowed' : 'pointer', fontFamily: "'Outfit', system-ui, sans-serif",
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                {downloading ? '⏳ Generating…' : '⬇ Download PNG'}
              </button>
              <button onClick={copyToClipboard}
                style={{
                  padding: '11px 18px', borderRadius: 10,
                  background: copied ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.07)',
                  border: `1px solid ${copied ? 'rgba(29,158,117,0.4)' : 'rgba(255,255,255,0.12)'}`,
                  color: copied ? '#1D9E75' : 'rgba(255,255,255,0.7)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}>
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>

            <div style={{ marginTop: 12, textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>
              Share your result and invite friends — they get 5 free credits on signup
            </div>
          </div>
        </div>
      )}
    </>
  )
}
