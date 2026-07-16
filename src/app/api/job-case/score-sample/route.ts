import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase, isUserRateLimited } from '@/lib/supabase-server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (await isUserRateLimited(user.id, 'score_sample', 20)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const question = typeof body.question === 'string' ? body.question.slice(0, 500) : ''
    const answer   = typeof body.answer   === 'string' ? body.answer.slice(0, 2000)  : ''
    const skill    = typeof body.skill    === 'string' ? body.skill.slice(0, 100)    : ''

    if (!question || !answer || answer.trim().length < 20) {
      return NextResponse.json({ error: 'Answer too short' }, { status: 400 })
    }

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      temperature: 0,   // deterministic — same answer should score the same every time
      messages: [{
        role: 'user',
        content: `You are scoring a practice answer for a job interview skill test. Be encouraging but honest.

Skill being tested: ${skill}
Question: ${question}
Answer: ${answer}

Score this answer 0–100 and give 2–3 sentences of specific feedback. Focus on:
- Specificity (did they give a real example, not a generic one?)
- Outcome (did they mention a measurable result?)
- Clarity (is the answer easy to follow?)

Respond with JSON only: { "score": <number>, "feedback": "<2-3 sentences>" }`,
      }],
    })

    const raw = (msg.content[0] as { text: string }).text.trim()
    const json = JSON.parse(raw.replace(/```json|```/g, '').trim())

    return NextResponse.json({ score: json.score, feedback: json.feedback })
  } catch {
    return NextResponse.json({ error: 'Scoring failed' }, { status: 500 })
  }
}
