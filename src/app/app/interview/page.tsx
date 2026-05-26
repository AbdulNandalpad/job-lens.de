'use client'

import { useState, useRef } from 'react'
import Navbar from '../components/Navbar'
import { theme } from '@/lib/theme'
import { useLanguage } from '@/lib/i18n'
import { API, CREDIT_COST, MARKET } from '@/lib/constants'

const { colors: c, gradients: g, fonts: f } = theme

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
  behavioural: { label: 'Behavioural', bg: 'rgba(55,138,221,0.10)', color: '#1a6db0' },
  technical:   { label: 'Technical',   bg: 'rgba(56,161,105,0.10)', color: '#276749' },
  situational: { label: 'Situational', bg: 'rgba(237,137,54,0.12)', color: '#c05c00' },
}

const SCORE_COLOR = (s: number) =>
  s >= 8 ? '#276749' : s >= 6 ? '#c05c00' : '#c53030'

export default function InterviewPrepPage() {
  const { lang } = useLanguage()
  const [role,    setRole]    = useState('')
  const [company, setCompany] = useState('')
  const [jdText,  setJdText]  = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers,   setAnswers]   = useState<Record<number, string>>({})
  const [feedbacks, setFeedbacks] = useState<Record<number, Feedback>>({})
  const [loading,    setLoading]    = useState(false)
  const [loadingFb,  setLoadingFb]  = useState<Record<number, boolean>>({})
  const [recording,  setRecording]  = useState<number | null>(null)
  const [error,      setError]      = useState('')
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  async function generateQuestions() {
    if (!role.trim()) { setError('Please enter the job title'); return }
    setError('')
    setLoading(true)
    setQuestions([])
    setAnswers({})
    setFeedbacks({})
    try {
      const res  = await fetch(API.interviewQuestions, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ role, company, jdText, market: MARKET.eu }),
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
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ role, question: q.question, answer }),
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
        fd.append('language', lang === 'DE' ? 'de' : 'en')
        try {
          const res = await fetch(API.aiStt, { method: 'POST', body: fd })
          const d   = await res.json()
          if (d.text) setAnswers(p => ({ ...p, [qId]: (p[qId] ? p[qId] + ' ' : '') + d.text }))
        } catch {}
        setRecording(null)
      }
      mr.start()
      mediaRef.current = mr
      setRecording(qId)
    } catch { setError('Microphone access denied') }
  }

  function stopVoice() {
    mediaRef.current?.stop()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: `1px solid ${c.borderLight}`, fontSize: 13,
    fontFamily: f.body, outline: 'none', color: c.text,
    background: c.bg, boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', background: c.bg, fontFamily: f.body }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');
        .iv-form { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 768px) { .iv-form { grid-template-columns: 1fr; } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .recording-dot { animation: pulse 1s ease-in-out infinite; }
      `}</style>
      <Navbar />

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px' }}>

        {/* Header */}
        <div style={{ paddingLeft: 14, borderLeft: `3px solid ${c.accent}`, marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: c.primary, fontFamily: f.heading }}>Interview Prep</div>
          <div style={{ fontSize: 13, color: c.textMuted, marginTop: 3 }}>
            5 role-specific questions · AI feedback on each answer · Voice or type
            <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, color: c.accent, background: `${c.accent}15`, padding: '2px 8px', borderRadius: 20 }}>
              {CREDIT_COST.interviewPrep} credit
            </span>
          </div>
        </div>

        {/* Setup card */}
        <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: c.primary, marginBottom: 16, fontFamily: f.heading }}>What role are you interviewing for?</div>
          <div className="iv-form" style={{ marginBottom: 12 }}>
            <input placeholder="Job title *  e.g. Product Manager" value={role} onChange={e => setRole(e.target.value)} style={inputStyle} />
            <input placeholder="Company (optional)" value={company} onChange={e => setCompany(e.target.value)} style={inputStyle} />
          </div>
          <textarea
            placeholder="Paste job description (optional but recommended — questions will be much more targeted)"
            value={jdText} onChange={e => setJdText(e.target.value)}
            style={{ ...inputStyle, height: 90, resize: 'vertical' as const, marginBottom: 16 }}
          />
          {error && <div style={{ fontSize: 12, color: c.danger, marginBottom: 12 }}>{error}</div>}
          <button onClick={generateQuestions} disabled={loading}
            style={{ padding: '10px 28px', borderRadius: 8, background: loading ? c.border : g.primaryBtn, color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: f.heading, fontSize: 14, fontWeight: 700 }}>
            {loading ? 'Generating questions…' : questions.length > 0 ? '↺ Regenerate' : 'Generate Questions →'}
          </button>
        </div>

        {/* Questions */}
        {questions.map((q, idx) => {
          const typeCfg  = TYPE_CONFIG[q.type] || TYPE_CONFIG.situational
          const fb       = feedbacks[q.id]
          const ans      = answers[q.id] || ''
          const isRec    = recording === q.id
          const loadingF = loadingFb[q.id]

          return (
            <div key={q.id} style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, marginBottom: 16 }}>

              {/* Question header */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: g.primaryBtn, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, fontFamily: f.heading }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' as const }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: typeCfg.bg, color: typeCfg.color }}>
                      {typeCfg.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: c.primary, lineHeight: 1.5, fontFamily: f.heading }}>{q.question}</div>
                  <div style={{ fontSize: 12, color: c.textMuted, marginTop: 6, fontStyle: 'italic' }}>💡 {q.tip}</div>
                </div>
              </div>

              {/* Answer area */}
              <div style={{ position: 'relative' as const }}>
                <textarea
                  placeholder="Type your answer here, or use the mic to speak it…"
                  value={ans}
                  onChange={e => setAnswers(p => ({ ...p, [q.id]: e.target.value }))}
                  style={{ ...inputStyle, height: 100, resize: 'vertical' as const, paddingRight: 44 }}
                />
                {/* Voice button */}
                <button
                  onClick={() => isRec ? stopVoice() : startVoice(q.id)}
                  title={isRec ? 'Stop recording' : 'Record voice answer'}
                  style={{ position: 'absolute' as const, right: 10, top: 10, width: 30, height: 30, borderRadius: '50%', border: 'none', cursor: 'pointer', background: isRec ? '#e53e3e' : c.accent, color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isRec ? <span className="recording-dot">■</span> : '🎙'}
                </button>
              </div>

              {/* Feedback button */}
              <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center' }}>
                <button
                  onClick={() => getFeedback(q)}
                  disabled={!ans.trim() || loadingF}
                  style={{ padding: '8px 20px', borderRadius: 8, background: !ans.trim() || loadingF ? c.borderLight : g.primaryBtn, color: !ans.trim() || loadingF ? c.textFaint : '#fff', border: 'none', cursor: !ans.trim() || loadingF ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, fontFamily: f.heading }}>
                  {loadingF ? 'Evaluating…' : fb ? '↺ Re-evaluate' : 'Get Feedback'}
                </button>
                {fb && (
                  <div style={{ fontSize: 13, fontWeight: 700, color: SCORE_COLOR(fb.score) }}>
                    {fb.score}/10 — {fb.label}
                  </div>
                )}
              </div>

              {/* Feedback card */}
              {fb && (
                <div style={{ marginTop: 16, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: 18 }}>
                  {/* Score bar */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: c.textMuted }}>Score</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: SCORE_COLOR(fb.score) }}>{fb.score}/10</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: c.borderLight }}>
                      <div style={{ height: 6, borderRadius: 3, background: SCORE_COLOR(fb.score), width: `${fb.score * 10}%`, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    {/* Strengths */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#276749', letterSpacing: 0.5, textTransform: 'uppercase' as const, marginBottom: 8 }}>✓ What worked</div>
                      {fb.strengths.map((s, i) => (
                        <div key={i} style={{ fontSize: 12, color: c.text, marginBottom: 5, paddingLeft: 10, borderLeft: '2px solid #276749' }}>{s}</div>
                      ))}
                    </div>
                    {/* Improvements */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#c05c00', letterSpacing: 0.5, textTransform: 'uppercase' as const, marginBottom: 8 }}>↑ Improve this</div>
                      {fb.improvements.map((s, i) => (
                        <div key={i} style={{ fontSize: 12, color: c.text, marginBottom: 5, paddingLeft: 10, borderLeft: '2px solid #c05c00' }}>{s}</div>
                      ))}
                    </div>
                  </div>

                  {/* Sample answer */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: c.accent, letterSpacing: 0.5, textTransform: 'uppercase' as const, marginBottom: 8 }}>★ Strong answer example</div>
                    <div style={{ fontSize: 12, color: c.textMuted, lineHeight: 1.6, background: `${c.accent}08`, padding: '12px 14px', borderRadius: 8, borderLeft: `3px solid ${c.accent}` }}>
                      {fb.sample_answer}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}

      </div>
    </div>
  )
}
