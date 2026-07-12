import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface JobInput {
  job_id: string
  job_title: string
  job_description: string
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const query  = typeof body.query === 'string' ? body.query.slice(0, 200) : ''
  const cvText = typeof body.cvText === 'string' ? body.cvText : undefined
  const jobs   = Array.isArray(body.jobs) ? body.jobs as JobInput[] : []

  if (!jobs?.length || !query?.trim()) {
    return NextResponse.json({ scores: [] })
  }

  const batch = jobs.slice(0, 20)

  const jobLines = batch
    .map((j, i) => `${i + 1}. [ID:${j.job_id}] "${j.job_title}" — ${(j.job_description || '').slice(0, 220)}`)
    .join('\n')

  const cvSection = cvText
    ? `\nCandidate profile (from CV):\n${cvText.slice(0, 800)}`
    : ''

  const prompt = `You are a job relevance expert. Score how well each job matches this candidate.

Search query: "${query}"${cvSection}

Rate each job 0–100 (100 = perfect match). Consider: title relevance, required skills, seniority level, role type.

Jobs:
${jobLines}

Reply ONLY with valid JSON — no explanation, no markdown:
{"scores":[{"job_id":"<id>","score":<0-100>}]}`

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
    const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0]
    if (!jsonStr) return NextResponse.json({ scores: [] })

    const parsed = JSON.parse(jsonStr) as { scores: { job_id: string; score: number }[] }
    return NextResponse.json({ scores: parsed.scores ?? [] })
  } catch (err) {
    console.error('Job ranking error:', err)
    return NextResponse.json({ scores: [] })
  }
}
