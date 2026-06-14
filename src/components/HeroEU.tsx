'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { theme } from '@/lib/theme'

const { fonts: f } = theme

// ── Slide definitions ────────────────────────────────────────────────────────

interface Slide {
  color: string
  bg: string
  tag:      { de: string; en: string }
  h1:       { de: string; en: string }
  h1Accent: { de: string; en: string }
  sub:      { de: string; en: string }
  cta:      { de: string; en: string }
  href: string
  comingSoon?: boolean
}

const SLIDES: Slide[] = [
  {
    color: '#378ADD',
    bg: 'rgba(55,138,221,0.07)',
    tag:      { de: 'Deutschland · Schweiz · Österreich', en: 'Germany · Switzerland · Austria' },
    h1:       { de: 'Dein komplettes', en: 'Your complete' },
    h1Accent: { de: 'KI-Bewerbungs-Toolkit.', en: 'AI job application toolkit.' },
    sub:      { de: 'CV-Analyse, Job-Matching, Lebenslauf, Anschreiben und Auto Apply — alles an einem Ort. Gebaut für den DACH-Markt.', en: 'CV analysis, job matching, tailored CV, cover letter and Auto Apply — all in one place. Built for the DACH market.' },
    cta:      { de: 'Kostenlos starten', en: 'Get started free' },
    href: '/app/career-scan',
  },
  {
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.07)',
    tag:      { de: 'Kira AI · KI-Karriereassistentin', en: 'Kira AI · Career Assistant' },
    h1:       { de: 'Dein nächster Job ist', en: 'Your next job is' },
    h1Accent: { de: 'ein Gespräch entfernt.', en: 'just a conversation away.' },
    sub:      { de: 'Sprich mit Kira — sie kennt den DACH-Markt in- und auswendig. Voice-first: Jobs finden, Lebenslauf analysieren, Gehalt einschätzen.', en: 'Talk to Kira — she knows the DACH market inside out. Voice-first: find jobs, analyse your CV, get real salary data.' },
    cta:      { de: 'Kira kennenlernen', en: 'Meet Kira' },
    href: '/app/ai',
  },
  {
    color: '#10B981',
    bg: 'rgba(16,185,129,0.07)',
    tag:      { de: 'Auto Apply · Beta', en: 'Auto Apply · Beta' },
    h1:       { de: 'Schluss mit copy-paste —', en: 'Stop copy-pasting —' },
    h1Accent: { de: 'Kira füllt dein Formular.', en: 'Kira fills your form.' },
    sub:      { de: 'Füge eine Job-URL ein. Kira öffnet das Formular, ordnet deinen Lebenslauf zu und füllt alle Felder. Du prüfst — dann wird abgesendet.', en: 'Paste a job URL. Kira opens the form, maps your CV, fills every field. You review — then it submits.' },
    cta:      { de: 'Auto Apply testen', en: 'Try Auto Apply' },
    href: '/app/auto-apply',
  },
  {
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.07)',
    tag:      { de: 'Demnächst · Job Case', en: 'Coming Soon · Job Case' },
    h1:       { de: 'Mehr als ein Lebenslauf —', en: 'More than a CV —' },
    h1Accent: { de: 'deine persönliche Fallstudie.', en: 'your personal case study.' },
    sub:      { de: 'KI analysiert die Stelle, du lieferst die Belege. Recruiter erhalten einen privaten Link — keine Registrierung, kein PDF, nur dein stärkstes Argument.', en: 'AI analyses the role, you supply the evidence. Recruiters get a private link — no sign-up, no PDF, just your strongest argument.' },
    cta:      { de: 'Coming Soon', en: 'Coming Soon' },
    href: '#',
    comingSoon: true,
  },
]

const INTERVAL   = 5500
const FADE_MS    = 300

// ── Animated score counter ───────────────────────────────────────────────────

function useCountUp(target: number, duration = 1400, delay = 500) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    setValue(0)
    const t = setTimeout(() => {
      const from  = Math.max(0, target - 26)
      const start = Date.now()
      const tick  = () => {
        const p = Math.min((Date.now() - start) / duration, 1)
        setValue(Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3))))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, delay)
    return () => clearTimeout(t)
  }, [target, duration, delay])
  return value
}

// ── Right-side mock (remounts on slide change) ───────────────────────────────

const JOBS = [
  { title: 'Senior Product Manager', company: 'SAP SE',     location: 'Berlin',  match: 91 },
  { title: 'Engineering Lead',       company: 'Siemens AG', location: 'München', match: 87 },
  { title: 'UX Designer',            company: 'Zalando',    location: 'Hamburg', match: 83 },
]

function ProductMock({ de }: { de: boolean }) {
  const score = useCountUp(84)
  const [visible, setVisible] = useState(0)

  useEffect(() => {
    const t = [
      setTimeout(() => setVisible(1), 900),
      setTimeout(() => setVisible(2), 1400),
      setTimeout(() => setVisible(3), 1900),
    ]
    return () => t.forEach(clearTimeout)
  }, [])

  return (
    <div style={{
      background: '#0b1825',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 18, padding: '24px 20px',
      boxShadow: '0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)',
    }}>
      {/* Score card */}
      <div style={{
        background: '#0d2035', border: '1px solid rgba(55,138,221,0.14)',
        borderRadius: 13, padding: '20px 20px 18px', marginBottom: 18,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -20, width: 140, height: 120, background: 'radial-gradient(ellipse, rgba(55,138,221,0.09) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: 1.6, textTransform: 'uppercase' as const, marginBottom: 14 }}>Career Score</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 16 }}>
          <span style={{ fontFamily: f.heading, fontSize: 54, fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: -2, fontVariantNumeric: 'tabular-nums' as const }}>{score}</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', marginBottom: 7 }}>/100</span>
          <div style={{ marginLeft: 'auto', marginBottom: 5, padding: '4px 10px', borderRadius: 20, background: 'rgba(61,214,140,0.1)', border: '1px solid rgba(61,214,140,0.22)', fontSize: 11, fontWeight: 700, color: '#3DD68C' }}>
            {de ? '↑ Stark' : '↑ Strong'}
          </div>
        </div>
        <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${score}%`, background: 'linear-gradient(90deg, #2563EB, #378ADD 60%, #3DD68C)', borderRadius: 2, transition: 'width 0.08s linear' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' as const }}>
          {(de ? ['Produktstrategie', 'Stakeholder', 'Datenanalyse'] : ['Product Strategy', 'Stakeholder Mgmt', 'Data Analysis']).map(tag => (
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
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 14px', background: '#0c1b2c',
              border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10,
              animation: 'heu-job 0.32s ease both',
            }}>
              <div style={{ width: 33, height: 33, borderRadius: 8, flexShrink: 0, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.35)', fontFamily: f.heading }}>
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

      {/* Footer */}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.18)', fontFamily: f.heading }}>Job-Lens AI</span>
        <div style={{ display: 'flex', gap: 5 }}>
          {['DE', 'CH', 'AT'].map(flag => (
            <span key={flag} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.22)', padding: '2px 7px', borderRadius: 5, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>{flag}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

interface Props {
  lang: 'DE' | 'EN'
  user?: { name: string } | null
}

export default function HeroEU({ lang, user }: Props) {
  const [active, setActive]   = useState(0)
  const [fading, setFading]   = useState(false)
  const activeRef             = useRef(0)
  const timerRef              = useRef<ReturnType<typeof setInterval> | null>(null)
  const pausedRef             = useRef(false)
  const animatingRef          = useRef(false)

  const advance = useCallback((next: number) => {
    if (animatingRef.current) return
    animatingRef.current = true
    setFading(true)
    setTimeout(() => {
      setActive(next)
      activeRef.current = next
      setFading(false)
      animatingRef.current = false
    }, FADE_MS)
  }, [])

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      if (!pausedRef.current) {
        advance((activeRef.current + 1) % SLIDES.length)
      }
    }, INTERVAL)
  }, [advance])

  useEffect(() => {
    startTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [startTimer])

  const manualGo = (idx: number) => { advance(idx); startTimer() }

  const slide = SLIDES[active]
  const de    = lang === 'DE'
  const go    = (path: string) => (path === '#' ? '#' : user ? path : `/login?next=${encodeURIComponent(path)}`)

  const PILL_LABELS = ['Overview', 'Kira AI', 'Auto Apply', 'Job Case']

  return (
    <section
      style={{ background: '#060d16', position: 'relative', overflow: 'hidden' }}
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}
    >
      <style>{`
        @keyframes heu-job { from{opacity:0;transform:translateX(12px)} to{opacity:1;transform:translateX(0)} }
        @keyframes heu-right-in { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }

        .heu-left-content {
          transition: opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease;
        }
        .heu-left-content.fading  { opacity: 0; transform: translateY(8px); }
        .heu-left-content.visible { opacity: 1; transform: translateY(0); }

        .heu-right-wrap { animation: heu-right-in 0.6s ease 0.2s both; }

        .heu-dot {
          height: 6px; border-radius: 3px; border: none; cursor: pointer; padding: 0;
          transition: width 0.3s ease, background 0.3s ease;
        }
        .heu-ghost {
          background: transparent; color: rgba(255,255,255,0.55);
          padding: 12px 24px; border-radius: 9px;
          border: 1px solid rgba(255,255,255,0.12);
          font-weight: 600; font-size: 14px; font-family: ${f.heading};
          text-decoration: none; display: inline-block;
          transition: border-color 0.16s, color 0.16s, transform 0.16s;
        }
        .heu-ghost:hover { border-color: rgba(255,255,255,0.3); color: #fff; transform: translateY(-1px); }

        .heu-pill {
          font-size: 11px; font-weight: 500; border-radius: 7px; padding: 5px 12px;
          border: none; cursor: pointer; font-family: ${f.heading};
          transition: background 0.25s, color 0.25s;
        }

        @media (max-width: 960px)  { .heu-right-wrap { display: none !important; } }
        @media (max-width: 600px)  { .heu-grid { padding: 52px 16px 44px !important; } }
      `}</style>

      {/* Ambient glow — colour follows slide */}
      <div style={{
        position: 'absolute', top: -140, right: '14%', width: 620, height: 500,
        background: `radial-gradient(ellipse, ${slide.bg} 0%, transparent 65%)`,
        pointerEvents: 'none', transition: 'background 0.6s ease',
      }} />

      <div className="heu-grid" style={{
        maxWidth: 1080, margin: '0 auto', padding: '80px 24px 60px',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center',
        position: 'relative', zIndex: 1,
      }}>

        {/* ── LEFT ── */}
        <div>
          <div className={`heu-left-content ${fading ? 'fading' : 'visible'}`}>
            {/* Eyebrow */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: slide.color, flexShrink: 0 }} />
              <span style={{ fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,0.32)', letterSpacing: 1.8, textTransform: 'uppercase' as const, fontFamily: f.heading }}>
                {de ? slide.tag.de : slide.tag.en}
              </span>
            </div>

            {/* Headline */}
            <h1 style={{
              fontFamily: f.heading, fontWeight: 800, lineHeight: 1.08,
              fontSize: 'clamp(28px, 3.6vw, 48px)',
              color: '#fff', margin: '0 0 16px', letterSpacing: -1.4,
            }}>
              {de ? slide.h1.de : slide.h1.en}<br />
              <span style={{ color: slide.color }}>{de ? slide.h1Accent.de : slide.h1Accent.en}</span>
            </h1>

            {/* Sub */}
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', lineHeight: 1.78, margin: '0 0 32px', maxWidth: 400 }}>
              {de ? slide.sub.de : slide.sub.en}
            </p>

            {/* CTA */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const, marginBottom: 36, alignItems: 'center' }}>
              {slide.comingSoon ? (
                <span style={{
                  display: 'inline-block', padding: '12px 26px', borderRadius: 9,
                  background: `${slide.color}18`, border: `1.5px solid ${slide.color}44`,
                  color: slide.color, fontWeight: 700, fontSize: 14, fontFamily: f.heading,
                }}>
                  {de ? slide.cta.de : slide.cta.en}
                </span>
              ) : (
                <>
                  <Link href={go(slide.href)} style={{
                    background: slide.color, color: '#fff',
                    padding: '12px 26px', borderRadius: 9,
                    fontWeight: 700, fontSize: 14, fontFamily: f.heading,
                    textDecoration: 'none', display: 'inline-block',
                    boxShadow: `0 6px 24px ${slide.color}35`,
                    transition: 'opacity 0.16s, transform 0.16s',
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.88'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1';    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
                  >
                    {de ? slide.cta.de : slide.cta.en} →
                  </Link>
                  <Link href={go('/app/jobs')} className="heu-ghost">
                    {de ? 'Jobs entdecken' : 'Browse jobs'}
                  </Link>
                </>
              )}
            </div>

            {/* Trust */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.3 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#3DD68C' }} />
              <span style={{ fontSize: 11, color: '#fff', fontWeight: 500 }}>
                {de ? '5 kostenlose Credits bei Registrierung · Keine Karte nötig' : '5 free credits on signup · No card needed'}
              </span>
            </div>
          </div>

          {/* Nav dots + pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 36, flexWrap: 'wrap' as const }}>
            {SLIDES.map((s, i) => (
              <button key={i} className="heu-dot" onClick={() => manualGo(i)}
                style={{ width: i === active ? 28 : 8, background: i === active ? s.color : 'rgba(255,255,255,0.15)' }}
                aria-label={PILL_LABELS[i]}
              />
            ))}
            <div style={{ display: 'flex', gap: 6, marginLeft: 10, flexWrap: 'wrap' as const }}>
              {SLIDES.map((s, i) => (
                <button key={i} className="heu-pill" onClick={() => manualGo(i)} style={{
                  background: i === active ? `${s.color}18` : 'rgba(255,255,255,0.04)',
                  color: i === active ? s.color : 'rgba(255,255,255,0.3)',
                  outline: i === active ? `1px solid ${s.color}44` : '1px solid rgba(255,255,255,0.08)',
                }}>
                  {PILL_LABELS[i]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT — remounts on every slide change to replay animations ── */}
        <div className="heu-right-wrap">
          <ProductMock key={active} de={de} />
        </div>
      </div>

      {/* Progress bar resets with each slide */}
      <ProgressBar key={active} duration={INTERVAL} color={slide.color} />

      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
    </section>
  )
}

function ProgressBar({ duration, color }: { duration: number; color: string }) {
  const id = `heu-pb-${color.replace('#', '')}`
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.04)' }}>
      <style>{`@keyframes ${id} { from{width:0} to{width:100%} }`}</style>
      <div style={{ height: '100%', background: color, animation: `${id} ${duration}ms linear forwards`, opacity: 0.7 }} />
    </div>
  )
}
