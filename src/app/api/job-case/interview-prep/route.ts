import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase } from '@/lib/supabase-server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { requirements, jobText } = await req.json()
    if (!requirements?.length) return NextResponse.json({ error: 'requirements required' }, { status: 400 })

    const reqList = (requirements as Array<{ skill: string; essential: boolean }>)
      .map((r, i) => `${i + 1}. ${r.skill} (${r.essential ? 'essential' : 'preferred'})`)
      .join('\n')

    const prompt = `You are an interview coach preparing a candidate for a video interview.

Job requirements:
${reqList}

Job posting excerpt:
${(jobText ?? '').slice(0, 3000)}

Return JSON only — no markdown, no backticks:
{
  "top3Skills": ["<most critical skill to prove>", "<second>", "<third>"],
  "scenarios": [
    {
      "title": "<3-5 word scenario title>",
      "prompt": "<1-2 sentences — a specific, realistic scenario drawn from this actual role that the candidate will read on screen and speak to for 90 seconds. Make it concrete to this industry and role, not generic.>"
    },
    {
      "title": "<3-5 word scenario title>",
      "prompt": "<1-2 sentences — a different scenario testing a different essential skill>"
    }
  ]
}

Rules:
- top3Skills: the 3 essential requirements the candidate absolutely must address in their intro pitch
- scenarios: pull real context from the job posting — name the industry, team, technology, or challenge mentioned
- scenarios must be different from each other and test different skills`

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (msg.content[0] as { text: string }).text.trim()
    const json = JSON.parse(raw.replace(/```json|```/g, '').trim())

    return NextResponse.json({
      top3Skills: (json.top3Skills ?? []).slice(0, 3),
      scenarios:  (json.scenarios  ?? []).slice(0, 2),
    })
  } catch (err) {
    console.error('/api/job-case/interview-prep error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
