import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase } from '@/lib/supabase-server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const rl = new Map<string, { count: number; hour: number }>()
function rateLimit(userId: string, max = 30): boolean {
  const hour = Math.floor(Date.now() / 3_600_000)
  const key = `${userId}:${hour}`
  const cur = rl.get(key) ?? { count: 0, hour }
  if (cur.count >= max) return false
  rl.set(key, { count: cur.count + 1, hour })
  return true
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body     = await req.json()
  const role     = typeof body.role     === 'string' ? body.role.trim().slice(0, 200)     : ''
  const question = typeof body.question === 'string' ? body.question.trim().slice(0, 500) : ''
  const answer   = typeof body.answer   === 'string' ? body.answer.trim().slice(0, 2000)  : ''

  if (!question || !answer) {
    return NextResponse.json({ error: 'question and answer are required' }, { status: 400 })
  }
  if (!rateLimit(user.id)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const prompt = `You are an expert interview coach. Evaluate this interview answer honestly but constructively.

Role: ${role || 'unspecified'}
Question: ${question}
Candidate's answer: ${answer}

Score the answer and give specific, actionable feedback.

Return ONLY valid JSON:
{
  "score": <integer 1-10>,
  "label": "<Excellent|Good|Needs Work|Weak>",
  "strengths": ["<specific thing done well>", "<another strength>"],
  "improvements": ["<specific thing to improve>", "<another improvement>"],
  "sample_answer": "<a concise example of a strong answer to this question — 3-5 sentences>"
}`

  try {
    const msg = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages:   [{ role: 'user', content: prompt }],
    })

    const raw   = msg.content[0]?.type === 'text' ? msg.content[0].text : ''
    const found = raw.match(/\{[\s\S]*\}/)
    if (!found) throw new Error('No JSON in response')

    const data = JSON.parse(found[0])
    return NextResponse.json({
      score:         typeof data.score === 'number' ? Math.max(1, Math.min(10, data.score)) : 5,
      label:         typeof data.label === 'string' ? data.label : 'Needs Work',
      strengths:     Array.isArray(data.strengths)    ? data.strengths    : [],
      improvements:  Array.isArray(data.improvements) ? data.improvements : [],
      sample_answer: typeof data.sample_answer === 'string' ? data.sample_answer : '',
    })
  } catch (err) {
    console.error('[interview/feedback]', err)
    return NextResponse.json({ error: 'Failed to evaluate answer' }, { status: 500 })
  }
}
