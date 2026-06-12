'use client'

import { useRouter } from 'next/navigation'
import AutoApplyDemoWidget from '@/components/AutoApplyDemoWidget'

const saffron = '#FF9933'
const white = '#FFFFFF'
const navy = '#042C53'

const bullets = [
  { icon: '🔗', text: 'Paste any Naukri, LinkedIn, or company portal URL' },
  { icon: '🤖', text: 'Kira reads the form and maps your profile — CTC, notice period, skills' },
  { icon: '✏️', text: 'Review the filled fields in 30 seconds before submitting' },
  { icon: '🚀', text: 'One click — application submitted, tracker updated' },
]

export default function AutoApplySpotlightIn() {
  const router = useRouter()

  function handleTryItYourself() {
    router.push('/in/auto-apply')
  }

  function handleTryWithSample() {
    router.push('/in/auto-apply?demo=1')
  }

  return (
    <section style={{
      background: 'linear-gradient(160deg, #0d1f30 0%, #091624 100%)',
      padding: '72px 24px',
      borderTop: `4px solid ${saffron}`,
    }}>
      <style>{`
        .in-aa-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; }
        @media (max-width: 900px) { .in-aa-grid { grid-template-columns: 1fr !important; gap: 40px !important; } }
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="in-aa-grid">

          {/* Left — copy */}
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: `rgba(255,153,51,0.12)`,
              border: `1px solid rgba(255,153,51,0.3)`,
              borderRadius: 20, padding: '5px 16px', marginBottom: 22,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={saffron} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill={saffron} fillOpacity="0.2"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 700, color: saffron, letterSpacing: 0.5 }}>NEW — Auto Apply Beta</span>
            </div>

            <h2 style={{
              fontFamily: "'Outfit', sans-serif", fontSize: 32, fontWeight: 800,
              color: white, lineHeight: 1.2, marginBottom: 16,
            }}>
              Fill any job form in
              <span style={{ color: saffron }}> 30 seconds</span>
              <br />— Kira does it for you
            </h2>

            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.75, marginBottom: 28, maxWidth: 440 }}>
              Stop copy-pasting your details into every company portal. Auto Apply reads the form,
              maps your CV and fills every field — including CTC, notice period, and LinkedIn links.
            </p>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {bullets.map((b, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{b.icon}</span>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{b.text}</span>
                </li>
              ))}
            </ul>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={handleTryItYourself}
                style={{
                  padding: '13px 28px', borderRadius: 10,
                  background: `linear-gradient(135deg, ${saffron} 0%, #e67300 100%)`,
                  color: white, fontWeight: 700, fontSize: 14,
                  border: 'none', cursor: 'pointer',
                  fontFamily: "'Outfit', sans-serif",
                  boxShadow: '0 6px 24px rgba(255,153,51,0.4)',
                }}
              >
                Try Auto Apply →
              </button>
              <button
                onClick={handleTryWithSample}
                style={{
                  padding: '13px 24px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: 14,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Try with sample form
              </button>
            </div>

            <div style={{ marginTop: 18, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
              3 credits per application · No credit card needed to try
            </div>
          </div>

          {/* Right — live demo widget */}
          <div>
            <AutoApplyDemoWidget
              market="in"
              onTryItYourself={handleTryItYourself}
              onTryWithSample={handleTryWithSample}
            />
          </div>

        </div>
      </div>
    </section>
  )
}
