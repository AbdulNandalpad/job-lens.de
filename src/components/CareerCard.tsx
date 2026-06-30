'use client'

import { useRef, useState, useEffect } from 'react'

export interface CareerCardData {
  score: number
  readiness: string
  headline: string
  strengths: string[]
  salaryMin?: number
  salaryMax?: number
  salaryCurrency?: string
  market: 'eu' | 'in'
  targetRole?: string
  // full analysis — optional, used for PDF download
  summary?: string
  gaps?: string[]
  quick_wins?: string[]
  market_insight?: string
  career_path_steps?: { timeframe: string; focus: string; actions: string[] }[]
}

function scoreColor(s: number) {
  return s >= 80 ? '#1D9E75' : s >= 60 ? '#D97706' : '#DC2626'
}

function fmtSalary(n: number, currency: string, market: 'eu' | 'in') {
  if (market === 'in') return `${currency}${n}L`   // API returns value already in lakhs (e.g. 12 = ₹12L)
  return `${currency}${Math.round(n / 1000)}k`      // DACH returns full EUR (e.g. 70000 = €70k)
}

function CardVisual({ data }: { data: CareerCardData }) {
  const col = scoreColor(data.score)
  const top3 = data.strengths.slice(0, 3)
  const headline = data.headline.length > 60 ? data.headline.slice(0, 57) + '…' : data.headline
  const salaryStr = data.salaryMin && data.salaryMax
    ? `${fmtSalary(data.salaryMin, data.salaryCurrency ?? '', data.market)} – ${fmtSalary(data.salaryMax, data.salaryCurrency ?? '', data.market)}`
    : null
  const flagLabel = data.market === 'in' ? 'India' : 'DACH'
  const circ = 2 * Math.PI * 38
  const dash = (data.score / 100) * circ

  return (
    <div style={{
      width: 600, height: 320,
      background: 'linear-gradient(135deg, #061a2e 0%, #0a2540 60%, #0d1f35 100%)',
      borderRadius: 20, padding: '32px 36px',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      position: 'relative', overflow: 'hidden',
      fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif", boxSizing: 'border-box',
    }}>
      <style>{`.jl-cc-hl{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word;}`}</style>
      <div style={{ position: 'absolute', top: -60, right: -60, width: 260, height: 260, borderRadius: '50%', background: `radial-gradient(ellipse, ${col}18 0%, transparent 70%)`, pointerEvents: 'none' }} />

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
        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5 }}>{flagLabel}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 32 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width="96" height="96" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="48" cy="48" r="38" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7"/>
            <circle cx="48" cy="48" r="38" fill="none" stroke={col} strokeWidth="7" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{data.score}</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, marginTop: 2 }}>/ 100</span>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 20, marginBottom: 10, background: `${col}22`, border: `1px solid ${col}55`, color: col, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>{data.readiness}</div>
          <div className="jl-cc-hl" style={{ color: '#fff', fontSize: 14, fontWeight: 700, lineHeight: 1.35, marginBottom: 6 }}>{headline}</div>
          {salaryStr && (
            <div style={{ color: '#378ADD', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
              {salaryStr} <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>est. salary</span>
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {top3.map((s, i) => (
              <span key={i} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>✓ {s}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, letterSpacing: 0.5 }}>Career Score · job-lens.de</span>
        <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10 }}>Generated with Job-Lens AI</span>
      </div>
    </div>
  )
}

async function captureCard(el: HTMLDivElement): Promise<HTMLCanvasElement> {
  const html2canvas = (await import('html2canvas')).default
  return html2canvas(el, {
    scale: 2, useCORS: true, backgroundColor: '#061a2e', logging: false,
    width: 600, height: 320, windowWidth: 600, windowHeight: 320,
  })
}

async function generatePdf(data: CareerCardData) {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  let y = 0

  // Header
  doc.setFillColor(6, 26, 46)
  doc.rect(0, 0, W, 28, 'F')
  doc.setTextColor(55, 138, 221)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Job-Lens AI — Career Analysis', 14, 18)
  doc.setTextColor(180, 200, 220)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}  ·  job-lens.de`, W - 14, 18, { align: 'right' })
  y = 38

  // Score badge
  const col: [number, number, number] = data.score >= 80 ? [29, 158, 117] : data.score >= 60 ? [217, 119, 6] : [220, 38, 38]
  doc.setFillColor(col[0], col[1], col[2])
  doc.roundedRect(14, y, 36, 18, 3, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(String(data.score), 32, y + 12, { align: 'center' })
  doc.setTextColor(40, 40, 40)
  doc.setFontSize(14)
  doc.text(data.readiness, 56, y + 7)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  const headlineLines = doc.splitTextToSize(data.headline, W - 70)
  doc.text(headlineLines, 56, y + 14)
  y += 26

  const salaryStr = data.salaryMin && data.salaryMax
    ? `Estimated salary: ${fmtSalary(data.salaryMin, data.salaryCurrency ?? '', data.market)} – ${fmtSalary(data.salaryMax, data.salaryCurrency ?? '', data.market)}`
    : null
  if (salaryStr) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(55, 138, 221)
    doc.text(salaryStr, 14, y)
    y += 8
  }

  function section(title: string, items: string[], bullet: readonly [number, number, number]) {
    if (!items?.length) return
    if (y > 260) { doc.addPage(); y = 14 }
    doc.setDrawColor(220, 230, 240)
    doc.line(14, y, W - 14, y)
    y += 7
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text(title, 14, y)
    y += 5
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    for (const item of items) {
      if (y > 272) { doc.addPage(); y = 14 }
      doc.setFillColor(...bullet)
      doc.circle(17, y - 1.5, 1.2, 'F')
      doc.setTextColor(60, 60, 60)
      const wrapped = doc.splitTextToSize(item, W - 32)
      doc.text(wrapped, 21, y)
      y += wrapped.length * 5 + 1
    }
    y += 3
  }

  if (data.summary) {
    doc.setDrawColor(220, 230, 240)
    doc.line(14, y, W - 14, y)
    y += 7
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text('Summary', 14, y)
    y += 5
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    const lines = doc.splitTextToSize(data.summary, W - 28)
    doc.text(lines, 14, y)
    y += lines.length * 5 + 4
  }

  section('Strengths', data.strengths, [29, 158, 117] as const)
  section('Gaps to Address', data.gaps ?? [], [220, 38, 38] as const)
  section('Quick Wins', data.quick_wins ?? [], [55, 138, 221] as const)

  if (data.career_path_steps?.length) {
    if (y > 240) { doc.addPage(); y = 14 }
    doc.setDrawColor(220, 230, 240)
    doc.line(14, y, W - 14, y)
    y += 7
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text('Career Path', 14, y)
    y += 5
    for (const step of data.career_path_steps) {
      if (y > 265) { doc.addPage(); y = 14 }
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(55, 138, 221)
      doc.text(`${step.timeframe}  —  ${step.focus}`, 14, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(70, 70, 70)
      for (const a of step.actions ?? []) {
        if (y > 272) { doc.addPage(); y = 14 }
        doc.setFillColor(55, 138, 221)
        doc.circle(17, y - 1.5, 1.2, 'F')
        const wrapped = doc.splitTextToSize(a, W - 32)
        doc.text(wrapped, 21, y)
        y += wrapped.length * 5 + 1
      }
      y += 2
    }
  }

  if (data.market_insight) {
    if (y > 255) { doc.addPage(); y = 14 }
    doc.setDrawColor(220, 230, 240)
    doc.line(14, y, W - 14, y)
    y += 7
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text('Market Insight', 14, y)
    y += 5
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    const lines = doc.splitTextToSize(data.market_insight, W - 28)
    doc.text(lines, 14, y)
  }

  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFontSize(7)
    doc.setTextColor(160, 170, 180)
    doc.setFont('helvetica', 'normal')
    doc.text(`Job-Lens AI Career Analysis  ·  job-lens.de  ·  Page ${p} of ${pages}`, W / 2, 292, { align: 'center' })
  }

  doc.save(`career-analysis-${data.score}.pdf`)
}

// Scales the 600px card down to fit the available modal width on any screen size
function MobileScaledCard({ data }: { data: CareerCardData }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    function measure() {
      if (!ref.current) return
      const available = ref.current.parentElement?.clientWidth ?? 600
      setScale(Math.min(1, available / 600))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])
  return (
    <div ref={ref} style={{ borderRadius: 16, overflow: 'hidden', height: 320 * scale }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 600, height: 320 }}>
        <CardVisual data={data} />
      </div>
    </div>
  )
}

export default function CareerCard({ data, accentColor }: { data: CareerCardData; accentColor?: string }) {
  const [show,       setShow]       = useState(false)
  const [pngLoading, setPngLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [copied,     setCopied]     = useState(false)
  const offscreenRef = useRef<HTMLDivElement>(null)
  const accent = accentColor || '#378ADD'

  async function downloadPng() {
    if (!offscreenRef.current || pngLoading) return
    setPngLoading(true)
    try {
      const canvas = await captureCard(offscreenRef.current)
      const link = document.createElement('a')
      link.download = `career-card-${data.score}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch { /* ignore */ }
    setPngLoading(false)
  }

  async function copyToClipboard() {
    if (!offscreenRef.current) return
    try {
      const canvas = await captureCard(offscreenRef.current)
      canvas.toBlob(async blob => {
        if (!blob) return
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    } catch { /* clipboard API not supported */ }
  }

  async function handlePdf() {
    if (pdfLoading) return
    setPdfLoading(true)
    try { await generatePdf(data) } catch { /* ignore */ }
    setPdfLoading(false)
  }

  return (
    <>
      {/* Trigger buttons */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => setShow(true)} style={{
          padding: '7px 14px', borderRadius: 8,
          background: `${accent}18`, border: `1.5px solid ${accent}44`,
          color: accent, fontSize: 12, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
        }}>
          Share Card
        </button>
        <button onClick={handlePdf} disabled={pdfLoading} style={{
          padding: '7px 14px', borderRadius: 8,
          background: pdfLoading ? 'rgba(0,0,0,0.04)' : `${accent}10`,
          border: `1.5px solid ${pdfLoading ? '#ccc' : accent + '30'}`,
          color: pdfLoading ? '#aaa' : accent, fontSize: 12, fontWeight: 700,
          cursor: pdfLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
        }}>
          {pdfLoading ? 'Generating…' : '↓ PDF'}
        </button>
      </div>

      {/* Off-screen card — always rendered at native 600×320 for capture */}
      <div style={{ position: 'fixed', left: -9999, top: -9999, pointerEvents: 'none', zIndex: -1 }}>
        <div ref={offscreenRef}>
          <CardVisual data={data} />
        </div>
      </div>

      {/* Share modal */}
      {show && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(6px)' }}
          onClick={() => setShow(false)}>
          <div
            style={{ background: '#0a1520', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '24px 24px 20px', maxWidth: 660, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: "'Outfit', system-ui, sans-serif" }}>Your Career Card</div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 2 }}>Download and share on LinkedIn, Twitter, or WhatsApp</div>
              </div>
              <button onClick={() => setShow(false)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', width: 28, height: 28, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {/* Scaled preview — shrinks to fit on mobile without side-scroll */}
            <MobileScaledCard data={data} />

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={downloadPng} disabled={pngLoading} style={{
                flex: 1, padding: '11px 0', borderRadius: 10,
                background: pngLoading ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${accent}, #185FA5)`,
                border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: pngLoading ? 'not-allowed' : 'pointer', fontFamily: "'Outfit', system-ui, sans-serif",
              }}>
                {pngLoading ? 'Generating…' : '⬇ Download PNG'}
              </button>
              <button onClick={copyToClipboard} style={{
                padding: '11px 18px', borderRadius: 10,
                background: copied ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.07)',
                border: `1px solid ${copied ? 'rgba(29,158,117,0.4)' : 'rgba(255,255,255,0.12)'}`,
                color: copied ? '#1D9E75' : 'rgba(255,255,255,0.7)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>

            <div style={{ marginTop: 10, textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>
              Share your result and invite friends — they get 5 free credits on signup
            </div>
          </div>
        </div>
      )}
    </>
  )
}
