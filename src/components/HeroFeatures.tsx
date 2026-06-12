'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export interface HeroFeaturesProps {
  market: 'eu' | 'in'
  /** href for the primary CTA (login or auto-apply depending on auth) */
  autoApplyHref: string
  kiraHref: string
  loginHref: string
  lang?: 'DE' | 'EN'
}

// ── Auto Apply animation  (6 phases, 1 500 ms each = 9 s loop) ──────────────
// 0: url bar    1: scanning    2: field 1 filled    3: field 2 filled
// 4: field 3 filled    5: submitted success
const AA_PHASES = 6
const AA_MS     = 1500

// ── Kira animation  (7 phases, 1 400 ms each ≈ 10 s loop) ─────────────────
// 0: empty    1: user msg 1    2: typing    3: kira reply 1
// 4: user msg 2    5: typing 2    6: kira reply 2
const KR_PHASES = 7
const KR_MS     = 1400

const EU_FIELDS = [
  { label: 'First Name', value: 'Maria' },
  { label: 'Email',      value: 'm.schmidt@gmail.com' },
  { label: 'Phone',      value: '+49 89 1234 5678' },
]
const IN_FIELDS = [
  { label: 'Full Name',      value: 'Priya Sharma' },
  { label: 'Email',          value: 'priya.sharma@gmail.com' },
  { label: 'Current CTC',    value: '12 LPA' },
]

const EU_CHAT = {
  u1: 'Find senior QA roles in Munich',
  k1: 'Found 14 matches. Best fit: Siemens AG — €74k, 92% match.',
  u2: 'Tailor my CV for Siemens',
  k2: 'Done ✓ — added 6 keywords. ATS score: 48 → 81.',
}
const IN_CHAT = {
  u1: 'Find SDE roles in Bangalore',
  k1: 'Found 23 matches. Top pick: Flipkart — 28 LPA, 89% match.',
  u2: 'What keywords am I missing?',
  k2: 'Missing: Kubernetes, React, System Design. Adding now…',
}

export default function HeroFeatures({ market, autoApplyHref, kiraHref, loginHref, lang = 'EN' }: HeroFeaturesProps) {
  const isIn  = market === 'in'
  const accent     = isIn ? '#FF9933' : '#378ADD'
  const accentDim  = isIn ? 'rgba(255,153,51,0.15)' : 'rgba(55,138,221,0.15)'
  const accentBord = isIn ? 'rgba(255,153,51,0.3)'  : 'rgba(55,138,221,0.3)'
  const green      = isIn ? '#138808' : '#22c55e'

  const fields = isIn ? IN_FIELDS : EU_FIELDS
  const chat   = isIn ? IN_CHAT   : EU_CHAT
  const aaUrl  = isIn ? 'careers.infosys.com/apply' : 'jobs.siemens.com/apply'

  const h1 = isIn
    ? (lang === 'DE' ? 'Bewirb dich automatisch.\nKira coached dich.' : 'Beat the ATS.\nLand the offer.')
    : (lang === 'DE' ? 'Bewirb dich automatisch.\nKira coached dich.' : 'Apply automatically.\nKira coaches every step.')

  const sub = isIn
    ? 'Auto Apply fills every Naukri and company portal form. Kira finds the best-matched roles for your profile.'
    : (lang === 'DE'
        ? 'Auto Apply füllt jedes Formular aus. Kira findet passende Jobs und optimiert deinen Lebenslauf.'
        : 'Auto Apply fills every Workday, Greenhouse and direct form. Kira finds matching DACH roles and polishes your CV.')

  const [aaPhase, setAaPhase] = useState(0)
  const [krPhase, setKrPhase] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setAaPhase(p => (p + 1) % AA_PHASES), AA_MS)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    // offset Kira by half a cycle so they don't reset simultaneously
    const initial = setTimeout(() => {
      const t = setInterval(() => setKrPhase(p => (p + 1) % KR_PHASES), KR_MS)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).__kiraTimer = t
    }, KR_MS * 3)
    return () => {
      clearTimeout(initial)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      clearInterval((window as any).__kiraTimer)
    }
  }, [])

  // derived booleans
  const aaScanning = aaPhase === 1
  const aaDone     = aaPhase === 5
  const aaFields   = aaPhase >= 2 ? Math.min(aaPhase - 1, fields.length) : 0

  const krUser1  = krPhase >= 1
  const krType1  = krPhase === 2
  const krKira1  = krPhase >= 3
  const krUser2  = krPhase >= 4
  const krType2  = krPhase === 5
  const krKira2  = krPhase >= 6

  const cardStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    background: 'rgba(255,255,255,0.035)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 20,
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    backdropFilter: 'blur(12px)',
  }

  return (
    <div style={{
      background: `radial-gradient(ellipse at 20% 50%, ${accentDim} 0%, transparent 55%),
                   radial-gradient(ellipse at 80% 10%, rgba(109,40,217,0.12) 0%, transparent 50%),
                   linear-gradient(160deg,#09131e 0%,#0d1e30 60%,#091424 100%)`,
      padding: '64px 24px 72px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes hf-fadein  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes hf-pop     { 0%{opacity:0;transform:scale(0.94)} 100%{opacity:1;transform:scale(1)} }
        @keyframes hf-typing  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes hf-scan    { 0%,100%{opacity:0.3} 50%{opacity:1} }
        @keyframes hf-bar     { from{width:0%} to{width:100%} }
        @keyframes hf-pulse   { 0%,100%{box-shadow:0 0 0 0 ${accentBord}} 50%{box-shadow:0 0 0 8px transparent} }
        .hf-appear { animation: hf-fadein 0.35s ease both; }
        .hf-pop    { animation: hf-pop    0.3s  ease both; }
        .hf-dot    { animation: hf-typing 0.8s ease infinite; }
        .hf-dot:nth-child(2) { animation-delay: 0.15s; }
        .hf-dot:nth-child(3) { animation-delay: 0.30s; }
        @media(max-width:860px){ .hf-cards{flex-direction:column !important} }
        @media(max-width:520px){ .hf-h1{font-size:28px !important} }
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* ── Badge ── */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: accentDim, border: `1px solid ${accentBord}`,
            borderRadius: 20, padding: '5px 16px',
            fontSize: 12, fontWeight: 700, color: accent, letterSpacing: 0.5,
            fontFamily: "'Outfit',sans-serif",
          }}>
            {isIn ? '🇮🇳  Built for India · Kira AI + Auto Apply' : '🇩🇪  DACH Market · Kira AI + Auto Apply'}
          </span>
        </div>

        {/* ── Headline ── */}
        <h1 className="hf-h1" style={{
          fontFamily: "'Outfit',sans-serif",
          fontSize: 'clamp(32px,4.5vw,54px)',
          fontWeight: 800, color: '#fff',
          textAlign: 'center', lineHeight: 1.12,
          marginBottom: 16, letterSpacing: -0.5,
          whiteSpace: 'pre-line',
        }}>
          {h1.split('\n').map((line, i) => (
            <span key={i} style={{ display: 'block' }}>
              {i === 0 ? line : <span style={{ color: accent }}>{line}</span>}
            </span>
          ))}
        </h1>

        <p style={{
          textAlign: 'center', fontSize: 15,
          color: 'rgba(255,255,255,0.55)', maxWidth: 520,
          margin: '0 auto 40px', lineHeight: 1.75,
          fontFamily: "'DM Sans',sans-serif",
        }}>
          {sub}
        </p>

        {/* ── Feature cards ── */}
        <div className="hf-cards" style={{ display: 'flex', gap: 20, alignItems: 'stretch' }}>

          {/* ─── Auto Apply card ─── */}
          <div style={cardStyle}>
            {/* header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: accentDim, border: `1px solid ${accentBord}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill={accent} fillOpacity="0.2"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, color: '#fff' }}>Auto Apply</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>AI fills every field for you</div>
                </div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase',
                background: accentDim, color: accent, border: `1px solid ${accentBord}`,
                padding: '3px 10px', borderRadius: 20,
              }}>Beta</span>
            </div>

            {/* mini browser window */}
            <div style={{
              background: '#0a1520', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
              overflow: 'hidden', flex: 1, minHeight: 220,
            }}>
              {/* browser chrome */}
              <div style={{ background: '#111c2a', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f57', display: 'inline-block' }}/>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#febc2e', display: 'inline-block' }}/>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#28c840', display: 'inline-block' }}/>
                <div style={{
                  flex: 1, height: 20, borderRadius: 4, background: '#1a2a3a',
                  display: 'flex', alignItems: 'center', paddingLeft: 8, gap: 4, marginLeft: 6,
                }}>
                  <svg width="9" height="9" viewBox="0 0 16 16" fill="none">
                    <circle cx="7" cy="7" r="5.5" stroke="#22c55e" strokeWidth="1.5"/>
                    <path d="M9.5 9.5L12 12" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{aaUrl}</span>
                </div>
              </div>

              {/* content area */}
              <div style={{ padding: '14px 14px', minHeight: 180, position: 'relative' }}>
                {/* scanning */}
                {aaScanning && (
                  <div className="hf-appear" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ animation: 'hf-scan 0.9s ease infinite', fontSize: 10, color: accent }}>⬤</div>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'DM Sans',sans-serif" }}>Reading form fields…</span>
                  </div>
                )}

                {/* fields */}
                {!aaDone && fields.slice(0, aaFields).map((f, i) => (
                  <div key={i} className="hf-appear" style={{
                    marginBottom: 8, padding: '7px 10px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginBottom: 2, fontFamily: "'DM Sans',sans-serif" }}>{f.label}</div>
                      <div style={{ fontSize: 12, color: '#fff', fontFamily: "'DM Sans',sans-serif", fontWeight: 500 }}>{f.value}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="9" fill="#22c55e" fillOpacity="0.2"/>
                      <path d="M6 10l3 3 5-5" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                ))}

                {/* current filling field */}
                {!aaDone && aaPhase >= 2 && aaFields < fields.length && (
                  <div style={{
                    padding: '7px 10px', borderRadius: 8,
                    background: `${accentDim}`, border: `1px solid ${accentBord}`,
                  }}>
                    <div style={{ fontSize: 9, color: accent, marginBottom: 4, fontFamily: "'DM Sans',sans-serif" }}>{fields[aaFields]?.label ?? ''}</div>
                    <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 2, background: accent, animation: 'hf-bar 1.2s ease' }}/>
                    </div>
                  </div>
                )}

                {/* done */}
                {aaDone && (
                  <div className="hf-pop" style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', minHeight: 150, gap: 10, textAlign: 'center',
                  }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%',
                      background: 'rgba(34,197,94,0.15)', border: '2px solid #22c55e',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      animation: 'hf-pulse 1.5s ease infinite',
                    }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 700, color: '#22c55e' }}>Application Submitted!</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans',sans-serif" }}>All {fields.length} fields filled automatically</div>
                  </div>
                )}

                {/* idle state (phase 0) */}
                {aaPhase === 0 && (
                  <div style={{ padding: '20px 0', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: "'DM Sans',sans-serif" }}>
                      Paste any application URL to start
                    </div>
                    <div style={{ marginTop: 12, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', paddingLeft: 10, gap: 6 }}>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>https://</span>
                      <span style={{ display: 'inline-block', width: 2, height: 13, background: accent, animation: 'hf-scan 0.8s step-end infinite' }}/>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CTA */}
            <Link href={autoApplyHref} style={{
              display: 'block', marginTop: 16, padding: '11px 0', textAlign: 'center',
              borderRadius: 10, background: `linear-gradient(135deg,${accent},${isIn ? '#e07020' : '#2563eb'})`,
              color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none',
              fontFamily: "'Outfit',sans-serif",
              boxShadow: `0 6px 20px ${accentBord}`,
            }}>
              Try Auto Apply →
            </Link>
          </div>

          {/* ─── Kira AI card ─── */}
          <div style={cardStyle}>
            {/* header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(109,40,217,0.15)', border: '1px solid rgba(109,40,217,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="2" width="6" height="12" rx="3"/>
                    <path d="M5 10a7 7 0 0 0 14 0"/>
                    <line x1="12" y1="19" x2="12" y2="22"/>
                  </svg>
                  <span style={{ position: 'absolute', bottom: 1, right: 1, width: 8, height: 8, borderRadius: '50%', background: '#22c55e', border: '2px solid #09131e' }}/>
                </div>
                <div>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, color: '#fff' }}>Kira AI</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Career coach · Online now</div>
                </div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase',
                background: 'rgba(109,40,217,0.15)', color: '#a78bfa', border: '1px solid rgba(109,40,217,0.3)',
                padding: '3px 10px', borderRadius: 20,
              }}>Live</span>
            </div>

            {/* chat area */}
            <div style={{
              background: '#0a1520', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.08)',
              flex: 1, minHeight: 220, padding: '14px', display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              {/* user msg 1 */}
              {krUser1 && (
                <div className="hf-appear" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{
                    maxWidth: '75%', padding: '8px 12px', borderRadius: '14px 14px 4px 14px',
                    background: accentDim, border: `1px solid ${accentBord}`,
                    fontSize: 11, color: '#fff', fontFamily: "'DM Sans',sans-serif", lineHeight: 1.5,
                  }}>
                    {chat.u1}
                  </div>
                </div>
              )}

              {/* typing indicator 1 */}
              {krType1 && (
                <div className="hf-appear" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', width: 'fit-content', background: 'rgba(109,40,217,0.12)', border: '1px solid rgba(109,40,217,0.25)', borderRadius: '4px 14px 14px 14px' }}>
                  <span className="hf-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: '#a78bfa', display: 'inline-block' }}/>
                  <span className="hf-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: '#a78bfa', display: 'inline-block' }}/>
                  <span className="hf-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: '#a78bfa', display: 'inline-block' }}/>
                </div>
              )}

              {/* Kira reply 1 */}
              {krKira1 && (
                <div className="hf-appear" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#6D28D9,#378ADD)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="2" width="6" height="12" rx="3"/>
                      <path d="M5 10a7 7 0 0 0 14 0"/>
                    </svg>
                  </div>
                  <div style={{
                    maxWidth: '75%', padding: '8px 12px',
                    borderRadius: '4px 14px 14px 14px',
                    background: 'rgba(109,40,217,0.12)', border: '1px solid rgba(109,40,217,0.25)',
                    fontSize: 11, color: '#fff', fontFamily: "'DM Sans',sans-serif", lineHeight: 1.5,
                  }}>
                    {chat.k1}
                  </div>
                </div>
              )}

              {/* user msg 2 */}
              {krUser2 && (
                <div className="hf-appear" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{
                    maxWidth: '75%', padding: '8px 12px', borderRadius: '14px 14px 4px 14px',
                    background: accentDim, border: `1px solid ${accentBord}`,
                    fontSize: 11, color: '#fff', fontFamily: "'DM Sans',sans-serif", lineHeight: 1.5,
                  }}>
                    {chat.u2}
                  </div>
                </div>
              )}

              {/* typing indicator 2 */}
              {krType2 && (
                <div className="hf-appear" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', width: 'fit-content', background: 'rgba(109,40,217,0.12)', border: '1px solid rgba(109,40,217,0.25)', borderRadius: '4px 14px 14px 14px' }}>
                  <span className="hf-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: '#a78bfa', display: 'inline-block' }}/>
                  <span className="hf-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: '#a78bfa', display: 'inline-block' }}/>
                  <span className="hf-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: '#a78bfa', display: 'inline-block' }}/>
                </div>
              )}

              {/* Kira reply 2 */}
              {krKira2 && (
                <div className="hf-appear" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#6D28D9,#378ADD)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="2" width="6" height="12" rx="3"/>
                      <path d="M5 10a7 7 0 0 0 14 0"/>
                    </svg>
                  </div>
                  <div style={{
                    maxWidth: '75%', padding: '8px 12px',
                    borderRadius: '4px 14px 14px 14px',
                    background: 'rgba(109,40,217,0.12)', border: '1px solid rgba(109,40,217,0.25)',
                    fontSize: 11, color: '#fff', fontFamily: "'DM Sans',sans-serif", lineHeight: 1.5,
                  }}>
                    {chat.k2}
                  </div>
                </div>
              )}

              {/* placeholder when empty */}
              {krPhase === 0 && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: "'DM Sans',sans-serif", textAlign: 'center' }}>
                    Ask Kira anything about your job search…
                  </div>
                </div>
              )}
            </div>

            {/* CTA */}
            <Link href={kiraHref} style={{
              display: 'block', marginTop: 16, padding: '11px 0', textAlign: 'center',
              borderRadius: 10,
              background: 'linear-gradient(135deg,#6D28D9,#4f46e5)',
              color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none',
              fontFamily: "'Outfit',sans-serif",
              boxShadow: '0 6px 20px rgba(109,40,217,0.35)',
            }}>
              Chat with Kira →
            </Link>
          </div>
        </div>

        {/* ── trust bar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 16, flexWrap: 'wrap', marginTop: 28,
          fontSize: 12, color: 'rgba(255,255,255,0.28)',
          fontFamily: "'DM Sans',sans-serif",
        }}>
          {(isIn
            ? ['Built in Germany', '5 free credits to start', 'No credit card needed']
            : ['Made in Germany', '5 free credits', 'CV not stored']
          ).map((item, i, arr) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {item}
              {i < arr.length - 1 && <span style={{ opacity: 0.4 }}>·</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
