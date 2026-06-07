import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase, createAdminSupabase, checkAndDeductCredits } from '@/lib/supabase-server'
import { CREDIT_COST, MARKET } from '@/lib/constants'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const COST = CREDIT_COST.salarySim

interface SimMessage { role: 'user' | 'assistant'; content: string }

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const role     = typeof body.role     === 'string' ? body.role.trim().slice(0, 200)     : ''
  const company  = typeof body.company  === 'string' ? body.company.trim().slice(0, 200)  : 'the company'
  const offer    = typeof body.offer    === 'number' ? Math.max(0, body.offer)             : 0
  const target   = typeof body.target   === 'number' ? Math.max(0, body.target)            : 0
  const currency = typeof body.currency === 'string' ? body.currency.slice(0, 5)           : '€'
  const market   = body.market === MARKET.in ? MARKET.in : MARKET.eu
  const isFirst  = body.isFirst === true
  const isDebrief = body.debrief === true
  const messages: SimMessage[] = Array.isArray(body.messages)
    ? body.messages.slice(-20).map((m: SimMessage) => ({
        role: ['user', 'assistant'].includes(m.role) ? m.role : 'user',
        content: typeof m.content === 'string' ? m.content.slice(0, 1000) : '',
      }))
    : []

  if (!role || !offer) {
    return NextResponse.json({ error: 'role and offer are required' }, { status: 400 })
  }

  if (isFirst) {
    // Charge credit on the first message
    const credits = await checkAndDeductCredits(user.id, COST, 'salary_sim', user.email ?? '', market)
    if (!credits.ok) {
      return NextResponse.json({ error: 'Insufficient credits', credits: credits.remaining, required: COST }, { status: 402 })
    }
  } else {
    // Verify a session was actually paid for in the last 24h — prevents isFirst:false bypass
    const admin = createAdminSupabase()
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: paid } = await admin
      .from('usage_events')
      .select('id')
      .eq('user_id', user.id)
      .eq('action', 'salary_sim')
      .gte('created_at', since)
      .limit(1)
    if (!paid || paid.length === 0) {
      return NextResponse.json({ error: 'No active session. Please start a new simulation.' }, { status: 402 })
    }
  }

  // ── Debrief mode — analyse the full conversation and return JSON ──────────
  if (isDebrief) {
    const transcript = messages.map(m => `${m.role === 'user' ? 'Candidate' : 'HR Manager'}: ${m.content}`).join('\n')
    const prompt = `Analyse this salary negotiation. Return ONLY valid JSON, no markdown.

Role: ${role}
Company: ${company}
Initial offer: ${currency}${offer.toLocaleString()}
Candidate's target: ${currency}${target.toLocaleString()}

Transcript:
${transcript}

JSON format:
{
  "final_amount": <number — best estimate of agreed amount, or initial offer if rejected>,
  "improvement": <absolute amount gained vs initial offer>,
  "improvement_pct": <percentage improvement, 0 if none>,
  "outcome": "<win|partial|loss>",
  "tactics_used": ["<tactic name>"],
  "what_worked": ["<specific strength>"],
  "what_to_improve": ["<specific improvement>"],
  "overall_score": <1-10>,
  "verdict": "<one sentence summary>"
}`

    try {
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      })
      const raw = msg.content[0]?.type === 'text' ? msg.content[0].text : ''
      const found = raw.match(/\{[\s\S]*\}/)
      if (!found) throw new Error('No JSON')
      return NextResponse.json(JSON.parse(found[0]))
    } catch {
      return NextResponse.json({ error: 'Failed to generate debrief' }, { status: 500 })
    }
  }

  // ── Negotiation mode — stream hiring manager response ────────────────────
  // Budget: company can stretch to 70% of the gap between offer and target
  const budget = Math.round(offer + (target - offer) * 0.7)
  const fmt = (n: number) => n.toLocaleString()

  const systemPrompt = `You are Alex, a Senior HR Manager at ${company}. You are negotiating a ${role} offer with a strong candidate.

Current offer on the table: ${currency}${fmt(offer)}
Your internal budget ceiling: ${currency}${fmt(budget)} (do NOT reveal this number)
Candidate's apparent target: ${currency}${fmt(target)}

Negotiation rules:
- Keep responses to 2-3 sentences — be concise and professional
- Don't accept their first counter immediately; push back or offer a smaller increment
- If they cite a competing offer or specific expertise, you can be more flexible
- You can offer non-salary benefits (extra leave, remote flexibility, signing bonus) when appropriate
- After 5-7 exchanges, naturally conclude — either reach agreement or politely hold firm
- Never reveal your budget ceiling
- Sound like a real, experienced HR professional — warm but firm
- Respond only to the negotiation — do not break character`

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          system: systemPrompt,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          stream: true,
        })

        for await (const chunk of response) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`))
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Generation failed' })}\n\n`))
      }
      controller.close()
    },
  })

  return new NextResponse(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  })
}
