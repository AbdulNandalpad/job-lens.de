'use client'

import { useState, useRef } from 'react'
import { API, CREDIT_COST, MARKET } from '@/lib/constants'
import SvgIcon from '@/components/SvgIcon'

const accent = '#FF9933'
const navy   = '#042C53'
const f = { body: "'DM Sans', sans-serif", heading: "'Outfit', sans-serif" }

interface Question {
  id: number
  question: string
  type: 'behavioural' | 'technical' | 'situational'
  tip: string
}
interface Feedback {
  score: number
  label: string
  strengths: string[]
  improvements: string[]
  sample_answer: string
}

const TYPE_CONFIG = {
  behavioural: { label: 'Behavioural', bg: 'rgba(255,153,51,0.10)', color: '#c05c00' },
  technical:   { label: 'Technical',   bg: 'rgba(19,136,8,0.10)',   color: '#0a6600' },
  situational: { label: 'Situational', bg: 'rgba(55,138,221,0.10)', color: '#1a6db0' },
}

const SCORE_COLOR = (s: number) => s >= 8 ? '#0a6600' : s >= 6 ? '#c05c00' : '#c53030'

export default function IndiaInterviewPage() {
  const [role,      setRole]      = useState('')
  const [company,   setCompany]   = useState('')
  const [jdText,    setJdText]    = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers,   setAnswers]   = useState<Record<number, string>>({})
  const [feedbacks, setFeedbacks] = useState<Record<number, Feedback>>({})
  const [loading,   setLoading]   = useState(false)
  const [loadingFb, setLoadingFb] = useState<Record<number, boolean>>({})
  const [recording, setRecording] = useState<number | null>(null)
  const [error,     setError]     = useState('')
  const mediaRef  = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  async function generateQuestions() {
    if (!role.trim()) { setError('Please enter the job title'); return }
    setError(''); setLoading(true); setQuestions([]); setAnswers({}); setFeedbacks({})
    try {
      const res  = await fetch(API.interviewQuestions, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, company, jdText, market: MARKET.in }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to generate questions'); return }
      setQuestions(data.questions)
    } catch { setError('Something went wrong. Please try again.') }
    setLoading(false)
  }

  async function getFeedback(q: Question) {
    const answer = answers[q.id]?.trim()
    if (!answer) return
    setLoadingFb(p => ({ ...p, [q.id]: true }))
    try {
      const res  = await fetch(API.interviewFeedback, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, question: q.question, answer }),
      })
      const data = await res.json()
      if (res.ok) setFeedbacks(p => ({ ...p, [q.id]: data }))
    } catch {}
    setLoadingFb(p => ({ ...p, [q.id]: false }))
  }

  async function startVoice(qId: number) {
    if (recording !== null) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const fd = new FormData()
        fd.append('file', blob, 'answer.webm')
        fd.append('language', 'en')
        try {
          const res = await fetch(API.aiStt, { method: 'POST', body: fd })
          const d   = await res.json()
          if (d.text) setAnswers(p => ({ ...p, [qId]: (p[qId] ? p[qId] + ' ' : '') + d.text }))
        } catch {}
        setRecording(null)
      }
      mr.start(); mediaRef.current = mr; setRecording(qId)
    } catch { setError('Microphone access denied') }
  }

  function stopVoice() { mediaRef.current?.stop() }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid #dce4ef', fontSize: 13, fontFamily: f.body,
    outline: 'none', color: '#1a2332', background: '#fff', boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: f.body }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        .iv-form { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 768px) { .iv-form { grid-template-columns: 1fr; } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .recording-dot { animation: pulse 1s ease-in-out infinite; }
      `}</style>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px' }}>

        <div style={{ paddingLeft: 14, borderLeft: `3px solid ${accent}`, marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: navy, fontFamily: f.heading }}>Interview Prep</div>
          <div style={{ fontSize: 13, color: '#6b7c93', marginTop: 3 }}>
            5 role-specific questions · AI feedback · Voice or type
            <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, color: accent, background: 'rgba(255,153,51,0.12)', padding: '2px 8px', borderRadius: 20 }}>
              {CREDIT_COST.interviewPrep} credit
            </span>
          </div>
        </div>

        {/* Setup */}
        <div style={{ background: '#fff', border: '1px solid #edf1f6', borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: navy, marginBottom: 16, fontFamily: f.heading }}>What role are you interviewing for?</div>
          <div className="iv-form" style={{ marginBottom: 12 }}>
            <input placeholder="Job title *  e.g. Software Engineer" value={role} onChange={e => setRole(e.target.value)} style={inputStyle} />
            <input placeholder="Company (optional)" value={company} onChange={e => setCompany(e.target.value)} style={inputStyle} />
          </div>
          <textarea placeholder="Paste job description (optional but recommended)" value={jdText} onChange={e => setJdText(e.target.value)}
            style={{ ...inputStyle, height: 90, resize: 'vertical' as const, marginBottom: 16 }} />
          {error && <div style={{ fontSize: 12, color: '#c53030', marginBottom: 12 }}>{error}</div>}
          <button onClick={generateQuestions} disabled={loading}
            style={{ padding: '10px 28px', borderRadius: 8, background: loading ? '#dce4ef' : `linear-gradient(135deg, ${accent}, #e67300)`, color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: f.heading, fontSize: 14, fontWeight: 700 }}>
            {loading ? 'Generating…' : questions.length > 0 ? '↺ Regenerate' : 'Generate Questions →'}
          </button>
        </div>

        {/* Questions */}
        {questions.map((q, idx) => {
          const typeCfg = TYPE_CONFIG[q.type] || TYPE_CONFIG.situational
          const fb      = feedbacks[q.id]
          const ans     = answers[q.id] || ''
          const isRec   = recording === q.id
          const loadF   = loadingFb[q.id]
          return (
            <div key={q.id} style={{ background: '#fff', border: '1px solid #edf1f6', borderRadius: 16, padding: 24, marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg,${accent},#e67300)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{idx + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: typeCfg.bg, color: typeCfg.color }}>{typeCfg.label}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: navy, lineHeight: 1.5, fontFamily: f.heading }}>{q.question}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6b7c93', marginTop: 6, fontStyle: 'italic' }}><SvgIcon name="bulb" size={12} color="#6b7c93" /> {q.tip}</div>
                </div>
              </div>

              <div style={{ position: 'relative' as const }}>
                <textarea placeholder="Type your answer, or use the mic…" value={ans}
                  onChange={e => setAnswers(p => ({ ...p, [q.id]: e.target.value }))}
                  style={{ ...inputStyle, height: 100, resize: 'vertical' as const, paddingRight: 44 }} />
                <button onClick={() => isRec ? stopVoice() : startVoice(q.id)}
                  style={{ position: 'absolute' as const, right: 10, top: 10, width: 30, height: 30, borderRadius: '50%', border: 'none', cursor: 'pointer', background: isRec ? '#e53e3e' : accent, color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isRec ? <span className="recording-dot">■</span> : <SvgIcon name="mic" size={14} color="#fff" />}
                </button>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center' }}>
                <button onClick={() => getFeedback(q)} disabled={!ans.trim() || loadF}
                  style={{ padding: '8px 20px', borderRadius: 8, background: !ans.trim() || loadF ? '#edf1f6' : `linear-gradient(135deg,${accent},#e67300)`, color: !ans.trim() || loadF ? '#9aafbc' : '#fff', border: 'none', cursor: !ans.trim() || loadF ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, fontFamily: f.heading }}>
                  {loadF ? 'Evaluating…' : fb ? '↺ Re-evaluate' : 'Get Feedback'}
                </button>
                {fb && <div style={{ fontSize: 13, fontWeight: 700, color: SCORE_COLOR(fb.score) }}>{fb.score}/10 — {fb.label}</div>}
              </div>

              {fb && (
                <div style={{ marginTop: 16, background: '#fafbfd', border: '1px solid #edf1f6', borderRadius: 12, padding: 18 }}>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#6b7c93' }}>Score</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: SCORE_COLOR(fb.score) }}>{fb.score}/10</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: '#edf1f6' }}>
                      <div style={{ height: 6, borderRadius: 3, background: SCORE_COLOR(fb.score), width: `${fb.score * 10}%`, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#0a6600', letterSpacing: 0.5, textTransform: 'uppercase' as const, marginBottom: 8 }}>✓ What worked</div>
                      {fb.strengths.map((s, i) => <div key={i} style={{ fontSize: 12, color: '#1a2332', marginBottom: 5, paddingLeft: 10, borderLeft: '2px solid #0a6600' }}>{s}</div>)}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#c05c00', letterSpacing: 0.5, textTransform: 'uppercase' as const, marginBottom: 8 }}>↑ Improve this</div>
                      {fb.improvements.map((s, i) => <div key={i} style={{ fontSize: 12, color: '#1a2332', marginBottom: 5, paddingLeft: 10, borderLeft: '2px solid #c05c00' }}>{s}</div>)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: accent, letterSpacing: 0.5, textTransform: 'uppercase' as const, marginBottom: 8 }}>★ Strong answer example</div>
                    <div style={{ fontSize: 12, color: '#6b7c93', lineHeight: 1.6, background: 'rgba(255,153,51,0.06)', padding: '12px 14px', borderRadius: 8, borderLeft: `3px solid ${accent}` }}>{fb.sample_answer}</div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Salary Sim CTA */}
      {questions.length > 0 && (
        <div style={{ maxWidth: 740, margin: '0 auto', padding: '0 24px 48px' }}>
          <div style={{
            background: `linear-gradient(135deg, ${accent}12, ${accent}06)`,
            border: `1px solid ${accent}33`,
            borderRadius: 16, padding: '24px 28px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
            flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2332', marginBottom: 4 }}>
                Ready to negotiate your salary?
              </div>
              <div style={{ fontSize: 13, color: '#6b7c93', lineHeight: 1.5 }}>
                Practice with an AI HR manager and get a debrief on your tactics — before the real offer call.
              </div>
            </div>
            <a
              href="/in/salary-sim"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 22px', borderRadius: 10, textDecoration: 'none',
                background: `linear-gradient(135deg, ${accent}, #e07000)`,
                color: '#fff', fontSize: 13, fontWeight: 700,
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>
              Practice Salary Negotiation →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
