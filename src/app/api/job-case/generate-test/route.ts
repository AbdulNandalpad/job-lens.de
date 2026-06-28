/**
 * POST /api/job-case/generate-test
 * Generates 3 role-specific skill test questions.
 *
 * GDPR: CV text is anonymised (name/email stripped) before sending to Anthropic.
 * Questions are derived from job requirements + candidate skill claims only.
 */
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase, isUserRateLimited } from '@/lib/supabase-server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function scrubPii(text: string): string {
  return text
    .replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '[email]')
    .replace(/(\+?\d[\d\s\-().]{7,}\d)/g, '[phone]')
    // Strip common name patterns from CV headers (first 200 chars usually contain name)
    .replace(/^[\w\s]{2,40}\n/m, '[name]\n')
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (await isUserRateLimited(user.id, 'generate_test', 10)) {
      return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 })
    }

    const { requirements, evidence, cvText } = await req.json()
    if (!requirements?.length) {
      return NextResponse.json({ error: 'Requirements required' }, { status: 400 })
    }

    // GDPR: anonymise CV before sending to Anthropic
    const cleanCv = cvText ? scrubPii(cvText.slice(0, 8000)) : ''

    const reqSummary = requirements
      .map((r: { skill: string; description: string; essential: boolean }) =>
        `- ${r.skill} (${r.essential ? 'essential' : 'preferred'}): ${r.description}`
      ).join('\n')

    const evidenceSummary = evidence
      ? evidence
          .filter((e: { text: string }) => e.text?.trim())
          .map((e: { text: string }, i: number) => `Req ${i + 1}: ${e.text.slice(0, 300)}`)
          .join('\n')
      : ''

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are a senior hiring assessor. Generate exactly 3 skill test questions for a candidate applying for this role.

Job requirements:
${reqSummary}

${evidenceSummary ? `Candidate's claimed evidence:\n${evidenceSummary}` : ''}
${cleanCv ? `Candidate CV (anonymised):\n${cleanCv.slice(0, 4000)}` : ''}

Rules:
- Questions MUST be specific to what the candidate claimed AND what the role requires
- NEVER generate generic questions like "describe your experience with X"
- Generate situational questions that require demonstrating actual knowledge
- Each must be answerable in 150–250 words by someone who genuinely has the experience
- Cover 3 different requirements from the list
- Return JSON only — no markdown, no backticks

JSON shape:
[
  {
    "question": "<full question text>",
    "skill_being_tested": "<skill name from requirements>",
    "expected_signals": ["<what a good answer mentions>", "..."]
  }
]`,
      }],
    })

    const raw = (msg.content[0] as { text: string }).text.trim()
    const questions = JSON.parse(raw.replace(/```json|```/g, '').trim())

    return NextResponse.json({ questions: questions.slice(0, 3) })
  } catch (err) {
    console.error('/api/job-case/generate-test error:', err)
    return NextResponse.json({ error: 'Test generation failed' }, { status: 500 })
  }
}
