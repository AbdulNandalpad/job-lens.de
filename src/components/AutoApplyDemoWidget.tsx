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

type Phase = 'url' | 'scanning' | 'fields' | 'mapping' | 'filling' | 'done'

function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)) }

function SpinnerIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.5"
      style={{ animation: 'aadSpin 0.9s linear infinite', flexShrink: 0 }}
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  )
}

export default function AutoApplyDemoWidget({
  market,
  onTryItYourself,
}: {
  market: 'eu' | 'in'
  onTryItYourself: () => void
}) {
  const data = market === 'in' ? IN_DEMO : EU_DEMO
  const accent = market === 'in' ? '#FF9933' : '#378ADD'
  const accentDim = market === 'in' ? '#FF993322' : '#378ADD22'
  const accentBorder = market === 'in' ? '#FF993344' : '#378ADD44'

  const [phase, setPhase] = useState<Phase>('url')
  const [urlTyped, setUrlTyped] = useState('')
  const [visibleFields, setVisibleFields] = useState(0)
  const [mappedFields, setMappedFields] = useState(0)
  const [fillProgress, setFillProgress] = useState(0)
  const [restartKey, setRestartKey] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setPhase('url')
    setUrlTyped('')
    setVisibleFields(0)
    setMappedFields(0)
    setFillProgress(0)

    async function run() {
      // Phase: url — type URL character by character
      const url = data.url
      let typed = ''
      for (let i = 0; i < url.length; i++) {
        if (ctrl.signal.aborted) return
        typed += url[i]
        setUrlTyped(typed)
        await sleep(28)
      }
      await sleep(500)

      // Phase: scanning
      if (ctrl.signal.aborted) return
      setPhase('scanning')
      await sleep(2200)

      // Phase: fields — appear one by one
      if (ctrl.signal.aborted) return
      setPhase('fields')
      for (let i = 1; i <= data.fields.length; i++) {
        if (ctrl.signal.aborted) return
        setVisibleFields(i)
        await sleep(180)
      }
      await sleep(500)

      // Phase: mapping — values populate one by one
      if (ctrl.signal.aborted) return
      setPhase('mapping')
      for (let i = 1; i <= data.fields.length; i++) {
        if (ctrl.signal.aborted) return
        setMappedFields(i)
        await sleep(160)
      }
      await sleep(400)

      // Phase: filling — progress bar sweeps
      if (ctrl.signal.aborted) return
      setPhase('filling')
      for (let p = 0; p <= 100; p += 4) {
        if (ctrl.signal.aborted) return
        setFillProgress(p)
        await sleep(40)
      }
      setFillProgress(100)
      await sleep(500)

      // Phase: done
      if (ctrl.signal.aborted) return
      setPhase('done')
    }

    run()
    return () => ctrl.abort()
  }, [restartKey, market])

  const fieldIcon = (type?: string) => {
    if (type === 'email') return '✉'
    if (type === 'tel') return '📞'
    if (type === 'url') return '🔗'
    if (type === 'textarea') return '📝'
    if (type === 'file') return '📎'
    return '✎'
  }

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    overflow: 'hidden',
  }

  return (
    <div style={{ maxWidth: 660, margin: '0 auto', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes aadSpin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes aadFadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .aad-row { animation: aadFadeIn 0.25s ease both; }
        .aad-cta:hover { opacity: 0.9; transform: translateY(-1px); }
      `}</style>

      <div style={{
        background: 'linear-gradient(160deg, #0d1f30 0%, #091624 100%)',
        borderRadius: 18,
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.32)',
        overflow: 'hidden',
      }}>

        {/* ── Window chrome ── */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {['#ff5f57','#febc2e','#28c840'].map(c => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
            ))}
          </div>

          {/* URL bar */}
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.07)',
            borderRadius: 6,
            padding: '5px 10px',
            fontSize: 11,
            color: 'rgba(255,255,255,0.55)',
            fontFamily: 'monospace',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            minHeight: 26,
          }}>
            {phase === 'scanning' || phase === 'fields' || phase === 'mapping' || phase === 'filling' || phase === 'done'
              ? (
                <>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>{data.url}</span>
                </>
              )
              : (
                <>
                  <span>{urlTyped}</span>
                  <span style={{ display: 'inline-block', width: 1, height: 11, background: accent, animation: 'aadFadeIn 0.6s ease infinite alternate' }} />
                </>
              )
            }
          </div>

          {/* Status badge */}
          <div style={{
            fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
            background: phase === 'done' ? '#22c55e22' : `${accent}22`,
            color: phase === 'done' ? '#22c55e' : accent,
            whiteSpace: 'nowrap',
          }}>
            {phase === 'url'     && '● Navigating'}
            {phase === 'scanning'&& '● Scanning'}
            {phase === 'fields'  && '● Detecting fields'}
            {phase === 'mapping' && '● Mapping CV'}
            {phase === 'filling' && '● Filling form'}
            {phase === 'done'    && '✓ Submitted'}
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '20px 20px 4px' }}>

          {/* Scanning spinner */}
          {phase === 'scanning' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '28px 0', justifyContent: 'center' }}>
              <SpinnerIcon color={accent} size={22} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
                  {data.formType} form detected
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                  Reading application fields from {data.company}…
                </div>
              </div>
            </div>
          )}

          {/* URL typing placeholder */}
          {phase === 'url' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '28px 0', justifyContent: 'center' }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
                Navigating to {data.company} application…
              </div>
            </div>
          )}

          {/* Fields + Mapping grid */}
          {(phase === 'fields' || phase === 'mapping' || phase === 'filling' || phase === 'done') && (
            <div>
              {/* Header row */}
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
                  {/* Field label */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                      background: accentDim, border: `1px solid ${accentBorder}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11,
                    }}>
                      {fieldIcon(f.type)}
                    </span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
                      {f.label}
                    </span>
                  </div>

                  {/* Mapped value */}
                  {i < mappedFields ? (
                    <div className="aad-row" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {(phase === 'filling' || phase === 'done') ? (
                        <span style={{
                          width: 16, height: 16, borderRadius: '50%', background: '#22c55e22',
                          border: '1px solid #22c55e44', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 9, color: '#22c55e', flexShrink: 0,
                        }}>✓</span>
                      ) : (
                        <span style={{
                          width: 16, height: 16, borderRadius: '50%', background: accentDim,
                          border: `1px solid ${accentBorder}`, flexShrink: 0,
                        }} />
                      )}
                      <span style={{
                        fontSize: 12,
                        color: f.type === 'file' ? accent : 'rgba(255,255,255,0.6)',
                        fontStyle: f.type === 'file' ? 'italic' : 'normal',
                        maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {f.value}
                      </span>
                    </div>
                  ) : (
                    <div style={{
                      height: 8, borderRadius: 4,
                      background: 'rgba(255,255,255,0.06)',
                      width: '70%',
                    }} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Progress bar */}
          {phase === 'filling' && (
            <div style={{ padding: '16px 4px 4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Filling form…</span>
                <span style={{ fontSize: 11, color: accent, fontWeight: 600 }}>{fillProgress}%</span>
              </div>
              <div style={{ height: 5, borderRadius: 5, background: 'rgba(255,255,255,0.08)' }}>
                <div style={{
                  height: '100%', borderRadius: 5,
                  background: `linear-gradient(90deg, ${accent}, ${accent}99)`,
                  width: `${fillProgress}%`,
                  transition: 'width 0.04s linear',
                }} />
              </div>
            </div>
          )}

          {/* Done state */}
          {phase === 'done' && (
            <div className="aad-row" style={{ padding: '18px 4px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: '#22c55e22', border: '1.5px solid #22c55e55',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16,
              }}>
                ✓
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#22c55e' }}>
                  Application submitted to {data.company}!
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                  7 fields filled · CV attached · Cover letter included
                </div>
              </div>
            </div>
          )}

          <div style={{ height: 16 }} />
        </div>

        {/* ── Footer ── */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
          {phase === 'done' ? (
            <>
              <button
                className="aad-cta"
                onClick={onTryItYourself}
                style={{
                  padding: '10px 24px', borderRadius: 10,
                  background: `linear-gradient(135deg, ${accent}, ${accent}bb)`,
                  color: '#fff', fontWeight: 700, fontSize: 13,
                  border: 'none', cursor: 'pointer',
                  boxShadow: `0 4px 18px ${accent}40`,
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                }}
              >
                Try it yourself →
              </button>
              <button
                onClick={() => setRestartKey(k => k + 1)}
                style={{
                  padding: '10px 16px', borderRadius: 10,
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.14)',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: 12, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                ↻ Replay
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {(['url','scanning','fields','mapping','filling','done'] as Phase[]).map((p, i) => (
                <div key={p} style={{
                  width: phase === p ? 20 : 7,
                  height: 7,
                  borderRadius: 4,
                  background: (['url','scanning','fields','mapping','filling','done'] as Phase[]).indexOf(phase) >= i
                    ? accent
                    : 'rgba(255,255,255,0.12)',
                  transition: 'all 0.35s',
                }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {phase === 'done' && (
        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(100,116,139,0.7)', marginTop: 14 }}>
          Scripted demo. The real Auto Apply uses your CV to fill actual forms.
        </p>
      )}
    </div>
  )
}
