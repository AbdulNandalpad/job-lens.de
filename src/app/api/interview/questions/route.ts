import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase, checkAndDeductCredits, refundCredits } from '@/lib/supabase-server'
import { CREDIT_COST, MARKET } from '@/lib/constants'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const COST = CREDIT_COST.interviewPrep

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body    = await req.json()
  const role    = typeof body.role    === 'string' ? body.role.trim().slice(0, 200)    : ''
  const company = typeof body.company === 'string' ? body.company.trim().slice(0, 200) : ''
  const jdText  = typeof body.jdText  === 'string' ? body.jdText.slice(0, 3000)        : ''
  const market  = body.market === MARKET.in ? MARKET.in : MARKET.eu

  if (!role) return NextResponse.json({ error: 'Role is required' }, { status: 400 })

  const credits = await checkAndDeductCredits(user.id, COST, 'interview_prep', user.email ?? '', market)
  if (!credits.ok) {
    return NextResponse.json({ error: 'Insufficient credits', credits: credits.remaining, required: COST }, { status: 402 })
  }

  const marketContext = market === MARKET.in
    ? 'Indian job market (focus on Indian companies, tech sector norms, Indian interview culture)'
    : 'DACH job market (Germany, Austria, Switzerland — include German workplace culture norms where relevant)'

  const prompt = `You are an expert interview coach for the ${marketContext}.

Generate exactly 5 interview questions for this candidate:
Role: ${role}${company ? `\nCompany: ${company}` : ''}${jdText ? `\n\nJob Description:\n${jdText}` : ''}

Include a mix of:
- 2 behavioural questions (STAR method — past experience)
- 2 technical/role-specific questions
- 1 situational or culture-fit question

For each question return:
- question: the interview question text
- type: "behavioural" | "technical" | "situational"
- tip: a one-line tip on what the interviewer is really looking for

Return ONLY valid JSON — no markdown, no explanation:
{
  "questions": [
    { "id": 1, "question": "...", "type": "behavioural", "tip": "..." },
    { "id": 2, "question": "...", "type": "technical", "tip": "..." },
    { "id": 3, "question": "...", "type": "behavioural", "tip": "..." },
    { "id": 4, "question": "...", "type": "technical", "tip": "..." },
    { "id": 5, "question": "...", "type": "situational", "tip": "..." }
  ]
}`

  try {
    const msg = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages:   [{ role: 'user', content: prompt }],
    })

    const raw   = msg.content[0]?.type === 'text' ? msg.content[0].text : ''
    const found = raw.match(/\{[\s\S]*\}/)
    if (!found) throw new Error('No JSON in response')

    const data = JSON.parse(found[0])
    if (!Array.isArray(data.questions) || data.questions.length === 0) throw new Error('Invalid questions')

    return NextResponse.json({ questions: data.questions, creditsRemaining: credits.remaining })
  } catch (err) {
    console.error('[interview/questions]', err)
    await refundCredits(user.id, COST, 'interview_prep')
    return NextResponse.json({ error: 'Failed to generate questions — credits refunded' }, { status: 500 })
  }
}
