/**
 * POST /api/job-case/analyse
 * Analyses a job posting and returns requirements + quality score.
 *
 * GDPR: no personal data sent to Anthropic. Job posting text only.
 * PII scrubbing removes email addresses and phone numbers from posting text
 * before it is sent to the AI.
 */
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase } from '@/lib/supabase-server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/** Strip email addresses and phone numbers from text before sending to Anthropic. */
function scrubPii(text: string): string {
  return text
    .replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '[email]')
    .replace(/(\+?\d[\d\s\-().]{7,}\d)/g, '[phone]')
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { jobText, jobUrl } = await req.json()
    if (!jobText?.trim() && !jobUrl?.trim()) {
      return NextResponse.json({ error: 'Job text or URL required' }, { status: 400 })
    }

    // GDPR: scrub any PII before sending to Anthropic
    const cleanText = scrubPii((jobText ?? '').slice(0, 12000))

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: `You are a job requirements analyst. Extract the top 5–7 concrete requirements from this job posting. Return JSON only — no markdown, no backticks.

Job posting:
${cleanText}

Return this exact JSON shape:
{
  "job_title": "<role title>",
  "company_name": "<company name or empty string>",
  "quality_score": "clear" | "vague" | "poor",
  "quality_reason": "<one sentence>",
  "requirements": [
    { "id": "1", "skill": "<skill name>", "description": "<1 sentence>", "essential": true | false }
  ]
}

quality_score rules:
- "clear": specific, measurable requirements with years/technologies named
- "vague": generic buzzwords without specifics
- "poor": < 3 concrete requirements or incomprehensible posting`,
      }],
    })

    const raw = (msg.content[0] as { text: string }).text.trim()
    const json = JSON.parse(raw.replace(/```json|```/g, '').trim())

    return NextResponse.json({
      jobTitle:     json.job_title ?? '',
      companyName:  json.company_name ?? '',
      qualityScore: json.quality_score,
      qualityReason: json.quality_reason ?? '',
      requirements: (json.requirements ?? []).slice(0, 7).map((r: { id?: string; skill: string; description: string; essential: boolean }, i: number) => ({
        id:          String(r.id ?? i + 1),
        skill:       r.skill,
        description: r.description,
        essential:   r.essential ?? true,
      })),
    })
  } catch (err) {
    console.error('/api/job-case/analyse error:', err)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
