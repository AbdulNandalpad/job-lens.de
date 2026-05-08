import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (message.content[0] as { text: string }).text
    const clean = raw.replace(/```json|```/g, '').trim()
    const data = JSON.parse(clean)

    // Ensure all array fields exist with defaults
    const safe = {
      score: data.score ?? 50,
      readiness: data.readiness ?? 'Developing',
      headline: data.headline ?? 'Professional profile',
      summary: data.summary ?? '',
      strengths: Array.isArray(data.strengths) ? data.strengths : [],
      gaps: Array.isArray(data.gaps) ? data.gaps : [],
      quick_wins: Array.isArray(data.quick_wins) ? data.quick_wins : [],
      role_suggestions: Array.isArray(data.role_suggestions) ? data.role_suggestions : [],
      salary_min: data.salary_min ?? 60000,
      salary_max: data.salary_max ?? 90000,
      salary_currency: data.salary_currency ?? 'EUR',
      top_keyword: data.top_keyword ?? '',
      market_insight: data.market_insight ?? '',
    }

    return NextResponse.json(safe)
  } catch (err) {
    console.error('Career scan error:', err)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}