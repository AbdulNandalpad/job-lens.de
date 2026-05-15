import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Job-Lens AI — Find your next role in DACH'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #042C53 0%, #0a3d6e 50%, #073d6e 100%)',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Background grid lines */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.07, display: 'flex' }}>
          {[...Array(12)].map((_, i) => (
            <div key={i} style={{ flex: 1, borderRight: '1px solid #fff' }} />
          ))}
        </div>

        {/* Radar glow */}
        <div style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(55,138,221,0.18) 0%, transparent 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
        }} />

        {/* Logo + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 40 }}>
          {/* Radar SVG */}
          <svg width="80" height="80" viewBox="0 0 44 44">
            <circle cx="20" cy="20" r="13" fill="none" stroke="#378ADD" strokeWidth="2.5" />
            <circle cx="20" cy="20" r="8" fill="none" stroke="#85B7EB" strokeWidth="1.2" />
            <circle cx="20" cy="20" r="3" fill="#378ADD" />
            <line x1="7" y1="20" x2="33" y2="20" stroke="#378ADD" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.5" />
            <line x1="28" y1="28" x2="36" y2="36" stroke="#378ADD" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 64, fontWeight: 800, color: '#E6F1FB', letterSpacing: -1, lineHeight: 1 }}>
              Job-Lens <span style={{ color: '#378ADD' }}>AI</span>
            </span>
            <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.45)', fontWeight: 400, marginTop: 6 }}>
              job-lens.de
            </span>
          </div>
        </div>

        {/* Tagline */}
        <div style={{
          fontSize: 32,
          color: 'rgba(255,255,255,0.85)',
          fontWeight: 500,
          textAlign: 'center',
          maxWidth: 800,
          lineHeight: 1.4,
        }}>
          AI-powered job search for<br />
          <span style={{ color: '#378ADD', fontWeight: 700 }}>Germany · Switzerland · Austria</span>
        </div>

        {/* Pills */}
        <div style={{ display: 'flex', gap: 16, marginTop: 48 }}>
          {['CV Analysis', 'Job Matching', 'Cover Letter', '5 Free Credits'].map((label) => (
            <div key={label} style={{
              padding: '10px 22px',
              borderRadius: 30,
              border: '1px solid rgba(55,138,221,0.4)',
              background: 'rgba(55,138,221,0.12)',
              color: '#85B7EB',
              fontSize: 20,
              fontWeight: 600,
              display: 'flex',
            }}>
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  )
}
