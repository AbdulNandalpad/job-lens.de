'use client'

import { useState, useEffect, useRef } from 'react'

interface DemoField { label: string; value: string; type?: string }

interface DemoData {
  url: string
  company: string
  formType: string
  fields: DemoField[]
}

const EU_DEMO: DemoData = {
  url: 'https://jobs.siemens.com/careers/apply/senior-engineer',
  company: 'Siemens AG',
  formType: 'Workday',
  fields: [
    { label: 'First Name',   value: 'Thomas' },
    { label: 'Last Name',    value: 'Müller' },
    { label: 'Email',        value: 'thomas.mueller@email.de',    type: 'email' },
    { label: 'Phone',        value: '+49 89 1234 5678',           type: 'tel' },
    { label: 'LinkedIn',     value: 'linkedin.com/in/thomasm',    type: 'url' },
    { label: 'Cover Letter', value: 'Dear Siemens Team, I am excited…', type: 'textarea' },
    { label: 'CV Upload',    value: '[CV attached]',              type: 'file' },
  ],
}

const IN_DEMO: DemoData = {
  url: 'https://careers.infosys.com/apply/senior-developer-bangalore',
  company: 'Infosys',
  formType: 'Taleo',
  fields: [
    { label: 'Full Name',     value: 'Priya Sharma' },
    { label: 'Email',         value: 'priya.sharma@gmail.com',    type: 'email' },
    { label: 'Phone',         value: '+91 98765 43210',           type: 'tel' },
    { label: 'Current CTC',   value: '₹12 LPA' },
    { label: 'Expected CTC',  value: '₹18 LPA' },
    { label: 'Notice Period', value: '30 days' },
    { label: 'Resume',        value: '[Resume attached]',         type: 'file' },
  ],
}

const GUIDE_STEPS = [
  { icon: '🔗', title: 'Paste any job URL',       desc: 'Drop in the direct application form link — Workday, Greenhouse, Lever, or any direct form.' },
  { icon: '🤖', title: 'Kira reads the form',     desc: 'A real browser opens the page, detects every field, and maps them to your CV automatically.' },
  { icon: '✏️', title: 'You review the values',   desc: 'See exactly what will be filled in. Edit anything before submitting.' },
  { icon: '🚀', title: 'Kira submits for you',    desc: 'One click — the browser fills every field and hits submit. You get a screenshot to confirm.' },
]

type Phase = 'url' | 'scanning' | 'fields' | 'mapping' | 'filling' | 'done'
type WidgetMode = 'guide' | 'demo'

function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)) }

function SpinnerIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"
      style={{ animation: 'aadSpin 0.9s linear infinite', flexShrink: 0 }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  )
}

export default function AutoApplyDemoWidget({
  market,
  onTryItYourself,
  onTryWithSample,
}: {
  market: 'eu' | 'in'
  onTryItYourself: () => void
  onTryWithSample: () => void
}) {
  const data = market === 'in' ? IN_DEMO : EU_DEMO
  const accent = market === 'in' ? '#FF9933' : '#378ADD'
  const accentDim = market === 'in' ? '#FF993322' : '#378ADD22'
  const accentBorder = market === 'in' ? '#FF993344' : '#378ADD44'

  const [widgetMode, setWidgetMode] = useState<WidgetMode>('guide')
  const [phase, setPhase] = useState<Phase>('url')
  const [urlTyped, setUrlTyped] = useState('')
  const [visibleFields, setVisibleFields] = useState(0)
  const [mappedFields, setMappedFields] = useState(0)
  const [fillProgress, setFillProgress] = useState(0)
  const [restartKey, setRestartKey] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (widgetMode !== 'demo') return

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setPhase('url')
    setUrlTyped('')
    setVisibleFields(0)
    setMappedFields(0)
    setFillProgress(0)

    async function run() {
      const url = data.url
      let typed = ''
      for (let i = 0; i < url.length; i++) {
        if (ctrl.signal.aborted) return
        typed += url[i]
        setUrlTyped(typed)
        await sleep(28)
      }
      await sleep(500)

      if (ctrl.signal.aborted) return
      setPhase('scanning')
      await sleep(2200)

      if (ctrl.signal.aborted) return
      setPhase('fields')
      for (let i = 1; i <= data.fields.length; i++) {
        if (ctrl.signal.aborted) return
        setVisibleFields(i)
        await sleep(180)
      }
      await sleep(500)

      if (ctrl.signal.aborted) return
      setPhase('mapping')
      for (let i = 1; i <= data.fields.length; i++) {
        if (ctrl.signal.aborted) return
        setMappedFields(i)
        await sleep(160)
      }
      await sleep(400)

      if (ctrl.signal.aborted) return
      setPhase('filling')
      for (let p = 0; p <= 100; p += 4) {
        if (ctrl.signal.aborted) return
        setFillProgress(p)
        await sleep(40)
      }
      setFillProgress(100)
      await sleep(500)

      if (ctrl.signal.aborted) return
      setPhase('done')
    }

    run()
    return () => ctrl.abort()
  }, [restartKey, widgetMode, market])

  const fieldIcon = (type?: string) => {
    if (type === 'email') return '✉'
    if (type === 'tel') return '📞'
    if (type === 'url') return '🔗'
    if (type === 'textarea') return '📝'
    if (type === 'file') return '📎'
    return '✎'
  }

  const startDemo = () => {
    setWidgetMode('demo')
    setRestartKey(k => k + 1)
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes aadSpin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes aadFadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes aadSlideIn { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:translateX(0); } }
        .aad-row { animation: aadFadeIn 0.25s ease both; }
        .aad-step { animation: aadSlideIn 0.3s ease both; }
        .aad-cta-primary:hover { opacity: 0.88; transform: translateY(-1px); }
        .aad-cta-outline:hover { background: rgba(255,255,255,0.06) !important; }
      `}</style>

      <div style={{
        background: 'linear-gradient(160deg, #0d1f30 0%, #091624 100%)',
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.32)',
        overflow: 'hidden',
      }}>

        {/* ── Window chrome (always visible) ── */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {['#ff5f57','#febc2e','#28c840'].map(c => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
            ))}
          </div>

          <div style={{
            flex: 1, background: 'rgba(255,255,255,0.07)', borderRadius: 6,
            padding: '5px 10px', fontSize: 11, color: 'rgba(255,255,255,0.55)',
            fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 6, minHeight: 26,
          }}>
            {widgetMode === 'guide' ? (
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>job-lens.de/app/auto-apply</span>
            ) : (phase === 'scanning' || phase === 'fields' || phase === 'mapping' || phase === 'filling' || phase === 'done') ? (
              <>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>{data.url}</span>
              </>
            ) : (
              <>
                <span>{urlTyped}</span>
                <span style={{ display: 'inline-block', width: 1, height: 11, background: accent, animation: 'aadFadeIn 0.6s ease infinite alternate' }} />
              </>
            )}
          </div>

          <div style={{
            fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
            background: widgetMode === 'guide' ? 'rgba(255,255,255,0.07)' : phase === 'done' ? '#22c55e22' : `${accent}22`,
            color: widgetMode === 'guide' ? 'rgba(255,255,255,0.3)' : phase === 'done' ? '#22c55e' : accent,
            whiteSpace: 'nowrap',
          }}>
            {widgetMode === 'guide' && '● How it works'}
            {widgetMode === 'demo' && phase === 'url'     && '● Navigating'}
            {widgetMode === 'demo' && phase === 'scanning'&& '● Scanning'}
            {widgetMode === 'demo' && phase === 'fields'  && '● Detecting fields'}
            {widgetMode === 'demo' && phase === 'mapping' && '● Mapping CV'}
            {widgetMode === 'demo' && phase === 'filling' && '● Filling form'}
            {widgetMode === 'demo' && phase === 'done'    && '✓ Submitted'}
          </div>
        </div>

        {/* ── GUIDE MODE ── */}
        {widgetMode === 'guide' && (
          <div style={{ padding: '28px 24px 8px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4, fontFamily: "'Outfit', sans-serif" }}>
              Auto Apply — how it works
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>
              Kira uses a real browser to fill job applications using your CV — you review before it submits.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 8 }}>
              {GUIDE_STEPS.map((step, i) => (
                <div key={i} className="aad-step" style={{
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                  animationDelay: `${i * 0.08}s`,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: `${accent}18`, border: `1px solid ${accent}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  }}>
                    {step.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 3 }}>
                      <span style={{ color: accent, marginRight: 6, fontSize: 11, fontWeight: 800 }}>
                        {i + 1}
                      </span>
                      {step.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.55 }}>
                      {step.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ height: 20 }} />
          </div>
        )}

        {/* ── DEMO MODE body ── */}
        {widgetMode === 'demo' && (
          <div style={{ padding: '20px 20px 4px' }}>

            {phase === 'scanning' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '28px 0', justifyContent: 'center' }}>
                <SpinnerIcon color={accent} size={22} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{data.formType} form detected</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>Reading application fields from {data.company}…</div>
                </div>
              </div>
            )}

            {phase === 'url' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '28px 0', justifyContent: 'center' }}>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Navigating to {data.company} application…</div>
              </div>
            )}

            {(phase === 'fields' || phase === 'mapping' || phase === 'filling' || phase === 'done') && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 4px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 0.7 }}>
                    Field · {data.formType}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 0.7 }}>
                    From your CV
                  </div>
                </div>

                {data.fields.slice(0, visibleFields).map((f, i) => (
                  <div key={f.label} className="aad-row" style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                    padding: '9px 4px',
                    borderBottom: i < data.fields.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    alignItems: 'center',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                        background: accentDim, border: `1px solid ${accentBorder}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
                      }}>
                        {fieldIcon(f.type)}
                      </span>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{f.label}</span>
                    </div>

                    {i < mappedFields ? (
                      <div className="aad-row" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {(phase === 'filling' || phase === 'done') ? (
                          <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#22c55e22', border: '1px solid #22c55e44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#22c55e', flexShrink: 0 }}>✓</span>
                        ) : (
                          <span style={{ width: 16, height: 16, borderRadius: '50%', background: accentDim, border: `1px solid ${accentBorder}`, flexShrink: 0 }} />
                        )}
                        <span style={{ fontSize: 12, color: f.type === 'file' ? accent : 'rgba(255,255,255,0.6)', fontStyle: f.type === 'file' ? 'italic' : 'normal', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.value}
                        </span>
                      </div>
                    ) : (
                      <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', width: '70%' }} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {phase === 'filling' && (
              <div style={{ padding: '16px 4px 4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Filling form…</span>
                  <span style={{ fontSize: 11, color: accent, fontWeight: 600 }}>{fillProgress}%</span>
                </div>
                <div style={{ height: 5, borderRadius: 5, background: 'rgba(255,255,255,0.08)' }}>
                  <div style={{ height: '100%', borderRadius: 5, background: `linear-gradient(90deg, ${accent}, ${accent}99)`, width: `${fillProgress}%`, transition: 'width 0.04s linear' }} />
                </div>
              </div>
            )}

            {phase === 'done' && (
              <div className="aad-row" style={{ padding: '18px 4px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: '#22c55e22', border: '1.5px solid #22c55e55', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                  ✓
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#22c55e' }}>Application submitted to {data.company}!</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>7 fields filled · CV attached · Cover letter included</div>
                </div>
              </div>
            )}

            <div style={{ height: 16 }} />
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>

          {/* Guide mode footer */}
          {widgetMode === 'guide' && (
            <>
              <button
                className="aad-cta-primary"
                onClick={startDemo}
                style={{
                  padding: '10px 22px', borderRadius: 10,
                  background: `linear-gradient(135deg, ${accent}, ${accent}bb)`,
                  color: '#fff', fontWeight: 700, fontSize: 13,
                  border: 'none', cursor: 'pointer',
                  boxShadow: `0 4px 18px ${accent}35`,
                  transition: 'all 0.15s', fontFamily: 'inherit',
                }}
              >
                ▶ Watch demo
              </button>
              <button
                className="aad-cta-outline"
                onClick={onTryWithSample}
                style={{
                  padding: '10px 18px', borderRadius: 10,
                  background: 'transparent',
                  border: `1px solid ${accent}55`,
                  color: accent, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                }}
              >
                Try with sample form →
              </button>
              <button
                className="aad-cta-outline"
                onClick={onTryItYourself}
                style={{
                  padding: '10px 16px', borderRadius: 10,
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.45)',
                  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                Use my own URL
              </button>
            </>
          )}

          {/* Demo running footer — progress dots */}
          {widgetMode === 'demo' && phase !== 'done' && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {(['url','scanning','fields','mapping','filling','done'] as Phase[]).map((p, i) => (
                <div key={p} style={{
                  width: phase === p ? 20 : 7, height: 7, borderRadius: 4,
                  background: (['url','scanning','fields','mapping','filling','done'] as Phase[]).indexOf(phase) >= i ? accent : 'rgba(255,255,255,0.12)',
                  transition: 'all 0.35s',
                }} />
              ))}
            </div>
          )}

          {/* Demo done footer — CTAs */}
          {widgetMode === 'demo' && phase === 'done' && (
            <>
              <button
                className="aad-cta-primary"
                onClick={onTryWithSample}
                style={{
                  padding: '10px 22px', borderRadius: 10,
                  background: `linear-gradient(135deg, ${accent}, ${accent}bb)`,
                  color: '#fff', fontWeight: 700, fontSize: 13,
                  border: 'none', cursor: 'pointer',
                  boxShadow: `0 4px 18px ${accent}35`,
                  transition: 'all 0.15s', fontFamily: 'inherit',
                }}
              >
                Try with sample form →
              </button>
              <button
                className="aad-cta-outline"
                onClick={onTryItYourself}
                style={{
                  padding: '10px 18px', borderRadius: 10, background: 'transparent',
                  border: `1px solid ${accent}55`, color: accent,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                }}
              >
                Use my own URL
              </button>
              <button
                onClick={() => { setWidgetMode('guide') }}
                style={{
                  padding: '10px 14px', borderRadius: 10, background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)',
                  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                ↻ Replay
              </button>
            </>
          )}
        </div>
      </div>

      {widgetMode === 'demo' && phase === 'done' && (
        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(100,116,139,0.7)', marginTop: 14 }}>
          Scripted demo — the real Auto Apply uses your actual CV data on live forms.
        </p>
      )}
    </div>
  )
}
