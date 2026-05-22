'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { theme } from '@/lib/theme'
import { SS, API } from '@/lib/constants'
import { useLanguage } from '@/lib/i18n'

const { colors: c, fonts: f, gradients: g } = theme

interface Job {
  title: string; company: string; location: string
  salary_min: number | null; salary_max: number | null
  apply_url: string; posted: string
}
interface FeatureAction { feature: string; label: string; href: string; reason: string }
interface Msg { role: 'user' | 'assistant'; content: string; status?: string; jobs?: Job[]; jobsTotal?: number; action?: FeatureAction }

const AGENT = 'Kira'

const GREETINGS: Record<string, string> = {
  eu_DE: 'Hallo! Ich bin Kira. Ich finde Jobs, bewerte deinen Lebenslauf und helfe dir bei der Bewerbung.',
  eu_EN: "Hi! I'm Kira. I can find live jobs, score your CV match, and guide your application.",
  in_EN: "Hi! I'm Kira. I can find jobs across India, score your CV, and help you land the right role.",
}

const SUGGESTIONS: Record<string, string[]> = {
  eu_DE: [
    'Softwareentwickler Jobs in München',
    'Remote Marketing Jobs in Deutschland',
    'Wie gut passt mein Lebenslauf zu diesen Jobs?',
  ],
  eu_EN: [
    'Software developer jobs in Munich',
    'Remote jobs in Germany',
    'Does my CV match a Senior React Developer role?',
  ],
  in_EN: [
    'Software engineer jobs in Bangalore',
    'Product manager roles in Hyderabad',
    'What am I missing for a senior dev role?',
  ],
}

const STATUS_LABELS: Record<string, Record<string, string>> = {
  eu_DE: { search_jobs: 'Suche Jobs...' },
  eu_EN: { search_jobs: 'Searching jobs...' },
  in_EN: { search_jobs: 'Searching jobs...' },
}

function fmtSalary(min: number | null, max: number | null, market: 'eu' | 'in'): string {
  if (!min && !max) return ''
  if (market === 'in') {
    const lo = min ? `₹${Math.round(min / 100000)}L` : ''
    const hi = max ? `₹${Math.round(max / 100000)}L` : ''
    return lo && hi ? `${lo} – ${hi} pa` : lo || hi
  }
  const lo = min ? `€${Math.round(min / 1000)}k` : ''
  const hi = max ? `€${Math.round(max / 1000)}k` : ''
  return lo && hi ? `${lo} – ${hi}` : lo || hi
}

export default function AIWidget({ market = 'eu' }: { market?: 'eu' | 'in' }) {
  const { lang } = useLanguage()
  const key    = market === 'in' ? 'in_EN' : `eu_${lang}`
  const accent = market === 'in' ? '#FF9933' : c.accent

  const [open, setOpen]       = useState(false)
  const [msgs, setMsgs]       = useState<Msg[]>([])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const cvRef     = useRef('')

  useEffect(() => {
    cvRef.current = sessionStorage.getItem(SS.cvText) || ''
    try {
      const saved = sessionStorage.getItem(SS.aiMessages)
      if (saved) setMsgs(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  useEffect(() => {
    if (msgs.length) sessionStorage.setItem(SS.aiMessages, JSON.stringify(msgs.slice(-20)))
  }, [msgs])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  async function send(text: string) {
    if (!text.trim() || loading) return

    const userMsg: Msg = { role: 'user', content: text.trim() }
    const history = [...msgs, userMsg]
    setMsgs(history)
    setInput('')
    setLoading(true)

    const idx = history.length
    setMsgs(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch(API.aiChat, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
          cvText: cvRef.current,
          market,
        }),
      })

      if (!res.ok || !res.body) throw new Error('Failed')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let assembled = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const evt = JSON.parse(line.slice(6))
            if (evt.text) {
              assembled += evt.text
              setMsgs(prev => {
                const cp = [...prev]
                cp[idx] = { role: 'assistant', content: assembled, jobs: cp[idx]?.jobs, action: cp[idx]?.action }
                return cp
              })
            } else if (evt.jobs) {
              setMsgs(prev => {
                const cp = [...prev]
                cp[idx] = { ...cp[idx], jobs: evt.jobs as Job[], jobsTotal: evt.total as number | undefined, status: undefined }
                return cp
              })
            } else if (evt.action) {
              setMsgs(prev => {
                const cp = [...prev]
                cp[idx] = { ...cp[idx], action: evt.action as FeatureAction, status: undefined }
                return cp
              })
            } else if (evt.status) {
              setMsgs(prev => {
                const cp = [...prev]
                cp[idx] = { role: 'assistant', content: '', status: evt.status as string }
                return cp
              })
            } else if (evt.error) {
              setMsgs(prev => {
                const cp = [...prev]
                cp[idx] = { role: 'assistant', content: evt.error as string }
                return cp
              })
            }
          } catch { /* ignore malformed chunk */ }
        }
      }
    } catch {
      setMsgs(prev => {
        const cp = [...prev]
        cp[idx] = { role: 'assistant', content: 'Connection error. Please try again.' }
        return cp
      })
    }

    setLoading(false)
    inputRef.current?.focus()
  }

  const greeting    = GREETINGS[key]    || GREETINGS['eu_EN']
  const suggestions = SUGGESTIONS[key]  || SUGGESTIONS['eu_EN']
  const statusMap   = STATUS_LABELS[key] || STATUS_LABELS['eu_EN']

  return (
    <>
      <style>{`
        @keyframes kira-slide { from{opacity:0;transform:translateY(12px) scale(.97)} to{opacity:1;transform:none} }
        @keyframes kira-dot   { 0%,60%,100%{opacity:.3;transform:translateY(0)} 30%{opacity:1;transform:translateY(-3px)} }
        @keyframes kira-spin  { to{transform:rotate(360deg)} }
        .kira-fab:hover        { transform:scale(1.08) !important }
        .kira-send:hover:not(:disabled) { opacity:.85 }
        .kira-send:disabled    { opacity:.4; cursor:not-allowed }
        .kira-suggest:hover    { border-color:${accent} !important; color:${accent} !important; background:rgba(55,138,221,.08) !important }
        .kira-close:hover      { background:rgba(255,255,255,.15) !important }
        .kira-input:focus      { outline:none }
        .kira-job-card:hover   { border-color:${accent}66 !important; background:rgba(255,255,255,.08) !important }
        .kira-apply:hover      { opacity:.85 }
        @media (max-width:480px) {
          .kira-panel { width:calc(100vw - 24px) !important; right:12px !important; left:12px !important; height:70vh !important; bottom:74px !important }
        }
      `}</style>

      {/* ── Panel ── */}
      {open && (
        <div className="kira-panel" style={{
          position: 'fixed', bottom: 80, right: 20, zIndex: 9999,
          width: 360, height: 520,
          background: 'linear-gradient(160deg,#0f1f33 0%,#0a1520 100%)',
          border: '1px solid rgba(255,255,255,.1)', borderRadius: 18,
          boxShadow: '0 20px 60px rgba(0,0,0,.5)',
          display: 'flex', flexDirection: 'column',
          animation: 'kira-slide .2s ease', overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,.07)', flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg,${accent}cc,${accent}55)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 44 44">
                <circle cx="20" cy="20" r="13" fill="none" stroke="white" strokeWidth="2.8"/>
                <circle cx="20" cy="20" r="3" fill="white"/>
                <line x1="28" y1="28" x2="36" y2="36" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: f.heading }}>{AGENT}</div>
              <div style={{ fontSize: 10, color: accent, fontWeight: 600 }}>AI Career Assistant</div>
            </div>
            {msgs.length > 0 && (
              <button onClick={() => { setMsgs([]); sessionStorage.removeItem(SS.aiMessages) }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.35)', fontSize: 11, cursor: 'pointer', padding: '2px 6px', fontFamily: f.body }}>
                Clear
              </button>
            )}
            <button className="kira-close" onClick={() => setOpen(false)}
              style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,.08)', cursor: 'pointer', color: 'rgba(255,255,255,.6)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              ✕
            </button>
          </div>

          {/* ── Messages ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
            {msgs.length === 0 ? (
              <div>
                <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 12, lineHeight: 1.65, marginBottom: 14 }}>{greeting}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {suggestions.map(s => (
                    <button key={s} className="kira-suggest" onClick={() => send(s)}
                      style={{ textAlign: 'left', padding: '7px 12px', borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.55)', fontSize: 12, cursor: 'pointer', transition: 'all .15s', fontFamily: f.body }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {msgs.map((m, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 6, alignItems: 'flex-end' }}>
                      {m.role === 'assistant' && (
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: `linear-gradient(135deg,${accent},${accent}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="10" height="10" viewBox="0 0 44 44">
                            <circle cx="20" cy="20" r="13" fill="none" stroke="white" strokeWidth="3"/>
                            <circle cx="20" cy="20" r="3" fill="white"/>
                            <line x1="28" y1="28" x2="36" y2="36" stroke="white" strokeWidth="4" strokeLinecap="round"/>
                          </svg>
                        </div>
                      )}
                      {(m.content || m.status || (!m.jobs && !m.action)) && (
                        <div style={{
                          maxWidth: '78%', padding: '8px 12px', fontSize: 13, lineHeight: 1.55, color: '#fff', fontFamily: f.body,
                          borderRadius: m.role === 'user' ? '14px 14px 3px 14px' : '3px 14px 14px 14px',
                          background: m.role === 'user' ? `linear-gradient(135deg,${accent}cc,${accent}88)` : 'rgba(255,255,255,.07)',
                          border: m.role === 'assistant' ? '1px solid rgba(255,255,255,.08)' : 'none',
                        }}>
                          {m.status ? (
                            <span style={{ color: 'rgba(255,255,255,.5)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                              <span style={{ display: 'inline-flex', gap: 3 }}>
                                {[0, 1, 2].map(j => <span key={j} style={{ width: 4, height: 4, borderRadius: '50%', background: accent, display: 'inline-block', animation: `kira-dot 1.2s ease-in-out ${j * .2}s infinite` }}/>)}
                              </span>
                              {statusMap[m.status] || 'Thinking...'}
                            </span>
                          ) : i === msgs.length - 1 && m.role === 'assistant' && m.content === '' ? (
                            <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
                              {[0, 1, 2].map(j => <span key={j} style={{ width: 4, height: 4, borderRadius: '50%', background: accent, display: 'inline-block', animation: `kira-dot 1.2s ease-in-out ${j * .2}s infinite` }}/>)}
                            </span>
                          ) : (
                            <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Job cards */}
                    {m.jobs && m.jobs.length > 0 && (
                      <div style={{ marginTop: 6, marginLeft: 28, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', marginBottom: 2, fontFamily: f.body }}>
                          {m.jobsTotal && m.jobsTotal > m.jobs.length
                            ? `Showing ${m.jobs.length} of ${m.jobsTotal.toLocaleString()} jobs`
                            : `${m.jobs.length} job${m.jobs.length !== 1 ? 's' : ''} found`}
                        </div>
                        {m.jobs.map((job, ji) => {
                          const salary = fmtSalary(job.salary_min, job.salary_max, market)
                          return (
                            <div key={ji} className="kira-job-card" style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: '10px 12px', transition: 'all .15s' }}>
                              <div style={{ fontWeight: 700, fontSize: 12, color: '#fff', fontFamily: f.heading, lineHeight: 1.3 }}>{job.title}</div>
                              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginTop: 3, fontFamily: f.body }}>{job.company} · {job.location}</div>
                              {salary && <div style={{ fontSize: 11, color: accent, marginTop: 3, fontWeight: 600 }}>{salary}</div>}
                              {job.apply_url && (
                                <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="kira-apply"
                                  style={{ display: 'inline-block', marginTop: 7, fontSize: 11, padding: '4px 10px', borderRadius: 6, background: accent, color: '#fff', textDecoration: 'none', fontWeight: 600, transition: 'opacity .15s' }}>
                                  View Job →
                                </a>
                              )}
                            </div>
                          )
                        })}
                        <Link href={market === 'in' ? '/in/jobs' : '/app/jobs'}
                          style={{ display: 'block', marginTop: 2, padding: '7px 12px', borderRadius: 8, border: `1px solid ${accent}44`, color: accent, textDecoration: 'none', fontSize: 11, fontWeight: 600, textAlign: 'center', fontFamily: f.heading }}>
                          Browse all jobs →
                        </Link>
                      </div>
                    )}

                    {/* Feature action button */}
                    {m.action && (
                      <div style={{ marginTop: 6, marginLeft: 28 }}>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginBottom: 5, fontFamily: f.body }}>{m.action.reason}</div>
                        <Link href={m.action.href}
                          style={{ display: 'inline-block', padding: '7px 14px', borderRadius: 8, background: `linear-gradient(135deg,${accent},${accent}99)`, color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 600, fontFamily: f.heading }}>
                          {m.action.label} →
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={bottomRef}/>
              </>
            )}
          </div>

          {/* ── Input ── */}
          <div style={{ padding: '10px 12px 12px', borderTop: '1px solid rgba(255,255,255,.07)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, padding: '7px 8px' }}>
              <textarea ref={inputRef} className="kira-input"
                value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
                placeholder={lang === 'DE' ? 'Frage Kira nach Jobs, Gehalt, Lebenslauf...' : 'Ask Kira about jobs, salary, your CV...'}
                disabled={loading} rows={1}
                style={{ flex: 1, resize: 'none', border: 'none', background: 'transparent', fontFamily: f.body, fontSize: 13, color: '#fff', lineHeight: 1.5, maxHeight: 80, overflowY: 'auto' }}/>
              <button className="kira-send" onClick={() => send(input)} disabled={!input.trim() || loading}
                style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: g.button, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, transition: 'opacity .2s' }}>
                {loading
                  ? <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'kira-spin .8s linear infinite' }}/>
                  : '↑'}
              </button>
            </div>
            <div style={{ textAlign: 'center', marginTop: 5, color: 'rgba(255,255,255,.2)', fontSize: 10 }}>Enter to send</div>
          </div>
        </div>
      )}

      {/* ── FAB ── */}
      <button className="kira-fab" onClick={() => setOpen(o => !o)}
        style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999, width: 52, height: 52, borderRadius: '50%', border: 'none',
          background: `linear-gradient(135deg,${accent},${accent}99)`,
          cursor: 'pointer', boxShadow: `0 4px 20px ${accent}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform .2s',
        }}>
        {open
          ? <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/></svg>
          : <svg width="20" height="20" viewBox="0 0 44 44">
              <circle cx="20" cy="20" r="13" fill="none" stroke="white" strokeWidth="2.8"/>
              <circle cx="20" cy="20" r="3" fill="white"/>
              <line x1="28" y1="28" x2="36" y2="36" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
            </svg>
        }
      </button>
    </>
  )
}
