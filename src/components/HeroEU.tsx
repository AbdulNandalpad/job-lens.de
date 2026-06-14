'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { theme } from '@/lib/theme'

const { fonts: f } = theme

function useCountUp(target: number, duration = 1400, delay = 700) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => {
      const from = Math.max(0, target - 26)
      const start = Date.now()
      const tick = () => {
        const p = Math.min((Date.now() - start) / duration, 1)
        const eased = 1 - Math.pow(1 - p, 3)
        setValue(Math.round(from + (target - from) * eased))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, delay)
    return () => clearTimeout(t)
  }, [target, duration, delay])
  return value
}

interface Props {
  lang: 'DE' | 'EN'
  user?: { name: string } | null
}

const JOBS = [
  { title: 'Senior Product Manager', company: 'SAP SE',     location: 'Berlin',  match: 91 },
  { title: 'Engineering Lead',       company: 'Siemens AG', location: 'München', match: 87 },
  { title: 'UX Designer',            company: 'Zalando',    location: 'Hamburg', match: 83 },
]

export default function HeroEU({ lang, user }: Props) {
  const score = useCountUp(84)
  const [visible, setVisible] = useState(0)

  useEffect(() => {
    const t = [
      setTimeout(() => setVisible(1), 1300),
      setTimeout(() => setVisible(2), 1800),
      setTimeout(() => setVisible(3), 2300),
    ]
    return () => t.forEach(clearTimeout)
  }, [])

  const de = lang === 'DE'
  const go = (path: string) => user ? path : `/login?next=${encodeURIComponent(path)}`

  return (
    <section style={{ background: '#060d16', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes heu-up   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes heu-in   { from{opacity:0;transform:translateX(14px)} to{opacity:1;transform:translateX(0)} }
        @keyframes heu-pill { from{opacity:0;transform:translateY(6px)}  to{opacity:1;transform:translateY(0)} }

        .heu-left  { animation: heu-up 0.62s ease 0.08s both }
        .heu-right { animation: heu-up 0.62s ease 0.22s both }

        .heu-primary {
          background: #fff; color: #060d16;
          padding: 13px 28px; border-radius: 9px;
          font-weight: 700; font-size: 14px; font-family: ${f.heading};
          text-decoration: none; display: inline-block; border: none; cursor: pointer;
          transition: background 0.16s, transform 0.16s;
        }
        .heu-primary:hover { background: #dde7f0; transform: translateY(-1px); }

        .heu-ghost {
          background: transparent; color: rgba(255,255,255,0.6);
          padding: 13px 28px; border-radius: 9px;
          border: 1px solid rgba(255,255,255,0.12);
          font-weight: 600; font-size: 14px; font-family: ${f.heading};
          text-decoration: none; display: inline-block; cursor: pointer;
          transition: border-color 0.16s, color 0.16s, transform 0.16s;
        }
        .heu-ghost:hover { border-color: rgba(255,255,255,0.32); color: #fff; transform: translateY(-1px); }

        .heu-pill {
          font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.38);
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 7px; padding: 5px 12px;
          animation: heu-pill 0.4s ease both;
        }
        .heu-job {
          display: flex; align-items: center; gap: 12px;
          padding: 11px 14px;
          background: #0c1b2c; border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px;
          animation: heu-in 0.32s ease both;
        }
        .heu-job:hover { border-color: rgba(255,255,255,0.12); }

        @media (max-width: 960px) { .heu-right { display: none !important; } }
        @media (max-width: 600px) { .heu-hero-grid { padding: 56px 0 52px !important; } }
      `}</style>

      {/* Ambient glow — restrained */}
      <div style={{ position: 'absolute', top: -120, right: '20%', width: 560, height: 420, background: 'radial-gradient(ellipse, rgba(55,138,221,0.055) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -60, left: '8%', width: 320, height: 220, background: 'radial-gradient(ellipse, rgba(55,138,221,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div
        className="heu-hero-grid"
        style={{
          maxWidth: 1080, margin: '0 auto', padding: '80px 24px 72px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center',
          position: 'relative', zIndex: 1,
        }}
      >
        {/* ── LEFT ── */}
        <div className="heu-left">
          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 26 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#378ADD', flexShrink: 0 }} />
            <span style={{ fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: 1.8, textTransform: 'uppercase' as const, fontFamily: f.heading }}>
              {de ? 'Deutschland · Schweiz · Österreich' : 'Germany · Switzerland · Austria'}
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: f.heading, fontWeight: 800, lineHeight: 1.08,
            fontSize: 'clamp(30px, 3.8vw, 50px)',
            color: '#ffffff', margin: '0 0 18px', letterSpacing: -1.5,
          }}>
            {de ? <>Dein nächster Job<br /><span style={{ color: '#378ADD' }}>im DACH-Markt.</span></> : <>Your next job<br /><span style={{ color: '#378ADD' }}>in the DACH market.</span></>}
          </h1>

          {/* Sub */}
          <p style={{
            fontSize: 15, color: 'rgba(255,255,255,0.42)', lineHeight: 1.78,
            margin: '0 0 34px', maxWidth: 400, fontWeight: 400,
          }}>
            {de
              ? 'CV-Analyse, Job-Matching, Lebenslauf, Anschreiben und Auto Apply — an einem Ort. Gebaut für den DACH-Markt.'
              : 'CV analysis, job matching, tailored CV, cover letter and Auto Apply — all in one place. Built for the DACH market.'}
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const, marginBottom: 36 }}>
            <Link href={go('/app/career-scan')} className="heu-primary">
              {de ? 'Kostenlos starten' : 'Get started free'}
            </Link>
            <Link href={go('/app/jobs')} className="heu-ghost">
              {de ? 'Jobs entdecken' : 'Browse jobs'}
            </Link>
          </div>

          {/* Feature pills */}
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' as const }}>
            {['Career Scan', 'Auto Apply', 'Kira AI', de ? 'Job Case · Bald' : 'Job Case · Soon'].map((label, i) => (
              <span key={label} className="heu-pill" style={{ animationDelay: `${0.5 + i * 0.08}s` }}>
                {label}
              </span>
            ))}
          </div>

          {/* Trust line */}
          <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 6, opacity: 0.35 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#3DD68C' }} />
            <span style={{ fontSize: 11, color: '#fff', fontWeight: 500 }}>
              {de ? '5 kostenlose Credits bei Registrierung · Keine Karte nötig' : '5 free credits on signup · No card needed'}
            </span>
          </div>
        </div>

        {/* ── RIGHT — product mock ── */}
        <div className="heu-right">
          <div style={{
            background: '#0b1825',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 18,
            padding: '24px 20px',
            boxShadow: '0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)',
          }}>

            {/* Score card */}
            <div style={{
              background: '#0d2035',
              border: '1px solid rgba(55,138,221,0.14)',
              borderRadius: 13,
              padding: '20px 20px 18px',
              marginBottom: 18,
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: -30, right: -20, width: 140, height: 120, background: 'radial-gradient(ellipse, rgba(55,138,221,0.09) 0%, transparent 70%)', pointerEvents: 'none' }} />

              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: 1.6, textTransform: 'uppercase' as const, marginBottom: 14 }}>
                {de ? 'Career Score' : 'Career Score'}
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 16 }}>
                <span style={{
                  fontFamily: f.heading, fontSize: 54, fontWeight: 800, color: '#fff',
                  lineHeight: 1, letterSpacing: -2, fontVariantNumeric: 'tabular-nums' as const,
                }}>
                  {score}
                </span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', marginBottom: 7 }}>/100</span>
                <div style={{ marginLeft: 'auto', marginBottom: 5, padding: '4px 10px', borderRadius: 20, background: 'rgba(61,214,140,0.1)', border: '1px solid rgba(61,214,140,0.22)', fontSize: 11, fontWeight: 700, color: '#3DD68C' }}>
                  {de ? '↑ Stark' : '↑ Strong'}
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${score}%`,
                  background: 'linear-gradient(90deg, #2563EB, #378ADD 60%, #3DD68C)',
                  borderRadius: 2, transition: 'width 0.08s linear',
                }} />
              </div>

              {/* Strength tags */}
              <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' as const }}>
                {(de
                  ? ['Produktstrategie', 'Stakeholder', 'Datenanalyse']
                  : ['Product Strategy', 'Stakeholder Mgmt', 'Data Analysis']
                ).map(tag => (
                  <span key={tag} style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 5, padding: '3px 9px' }}>{tag}</span>
                ))}
              </div>
            </div>

            {/* Matched jobs */}
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.22)', letterSpacing: 1.6, textTransform: 'uppercase' as const, marginBottom: 10 }}>
              {de ? 'Passende Stellen' : 'Matched roles'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 7 }}>
              {JOBS.map((job, i) => (
                visible > i ? (
                  <div key={i} className="heu-job" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div style={{
                      width: 33, height: 33, borderRadius: 8, flexShrink: 0,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.35)', fontFamily: f.heading,
                    }}>
                      {job.company[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 2, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.title}</div>
                      <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.25)' }}>{job.company} · {job.location}</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#3DD68C', flexShrink: 0 }}>{job.match}%</div>
                  </div>
                ) : (
                  <div key={i} style={{ height: 51, background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px dashed rgba(255,255,255,0.04)' }} />
                )
              ))}
            </div>

            {/* Footer row */}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.18)', fontFamily: f.heading }}>Job-Lens AI</span>
              <div style={{ display: 'flex', gap: 5 }}>
                {['DE', 'CH', 'AT'].map(flag => (
                  <span key={flag} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.22)', padding: '2px 7px', borderRadius: 5, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>{flag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
    </section>
  )
}
