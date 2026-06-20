'use client'

import { useState } from 'react'
import { API } from '@/lib/constants'

// Lightweight thumbs up/down capture on an AI output. Posts to /api/feedback,
// which records it in training_feedback for the future fine-tuning dataset.
export default function FeedbackButtons({
  feature,
  prompt,
  output,
  accent = '#378ADD',
}: {
  feature: string
  prompt?: string
  output?: string
  accent?: string
}) {
  const [rating, setRating] = useState<1 | -1 | 0>(0)
  const [sending, setSending] = useState(false)

  async function send(value: 1 | -1) {
    if (sending || rating !== 0) return
    setSending(true)
    setRating(value)   // optimistic
    try {
      await fetch(API.feedback, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature, rating: value, prompt, output }),
      })
    } catch {
      setRating(0)     // allow retry on failure
    } finally {
      setSending(false)
    }
  }

  if (rating !== 0) {
    return (
      <div style={{ fontSize: 12, color: 'rgba(120,130,145,.9)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>Thanks for the feedback{rating === 1 ? ' 👍' : ' 👎'}</span>
      </div>
    )
  }

  const btn = (active: boolean): React.CSSProperties => ({
    width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(120,130,145,.25)',
    background: active ? `${accent}18` : 'transparent', cursor: sending ? 'wait' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a8291',
    transition: 'all .15s',
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, color: 'rgba(120,130,145,.8)' }}>Was this helpful?</span>
      <button aria-label="Helpful" onClick={() => send(1)} disabled={sending} style={btn(false)}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>
      </button>
      <button aria-label="Not helpful" onClick={() => send(-1)} disabled={sending} style={btn(false)}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg>
      </button>
    </div>
  )
}
