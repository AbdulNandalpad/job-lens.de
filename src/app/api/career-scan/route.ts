import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase, checkAndDeductCredits } from '@/lib/supabase-server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const COST = 2

const SYSTEM_PROMPT = `You are a senior career analyst specializing in the DACH (Germany, Austria, Switzerland) job market with 20 years of recruitment and coaching experience.

ABSOLUTE RULES — violating any of these makes your output worthless:
1. Respond ONLY with valid JSON. Zero markdown, zero backticks, zero explanations outside the JSON.
2. NEVER invent, assume, or infer information not explicitly present in the CV text provided.
3. Every strength, gap, and roast_line MUST quote or directly reference specific text from the CV. If you cannot find evidence in the CV, do not mention it.
4. Roast lines must be surgical: quote exact job titles, company names, dates, or wording from the CV, then explain why it is weak for the target role. NEVER say "your CV lacks X" unless X is genuinely absent from the text shown.
5. Salary ranges must reflect real DACH market data for the seniority level evidenced in the CV.

CONSISTENT SCORING RUBRIC (apply this exactly):
- 85–100: 10+ years directly relevant experience, strong DACH market presence, leadership credentials, 90%+ skills alignment with target role
- 70–84: Solid background, some leadership, 70–89% skills alignment, minor addressable gaps
- 55–69: Mid-level, 50–69% alignment, clear upskilling needed
- 35–54: Early career or domain mismatch, significant gaps vs. target role
- 0–34: Entry level, major gaps, career change territory

AI VULNERABILITY SCORING (0 = fully automation-proof, 100 = fully automatable today):
- Consider: how much of the listed work is pattern-matching, data entry, report generation, templated writing?
- Consider: how much requires physical presence, creative judgment, political navigation, stakeholder empathy?
- Be specific: name the tasks that are high-risk and those that provide protection.`

function buildPrompt(cvText: string, role: string, market: string): string {
  const salaryUnit = market === 'Switzerland' ? 'CHF' : 'EUR'
  return `CV TEXT — read every word; do not reference anything not present here:
---
${cvText.slice(0, 8000)}
---

Target role requested by candidate: "${role}"
Target market: ${market}

Return ONLY this exact JSON structure. No other text:
{
  "score": <integer 0-100 using the scoring rubric>,
  "market_fit_score": <integer 0-100, how well profile fits DACH demand for this role specifically>,
  "keyword_score": <integer 0-100, percentage of role-critical keywords present in the CV>,
  "readiness": "<exactly one of: Ready | Strong | Developing | Entry>",
  "headline": "<10-15 word neutral summary of the actual profile — no hype>",
  "summary": "<2 sentences based strictly on CV content, no assumptions>",
  "strengths": [
    "<specific strength with evidence from CV text>",
    "<specific strength with evidence from CV text>",
    "<specific strength with evidence from CV text>",
    "<specific strength with evidence from CV text>"
  ],
  "gaps": [
    "<gap relative to '${role}' with explanation>",
    "<gap relative to '${role}' with explanation>",
    "<gap relative to '${role}' with explanation>"
  ],
  "quick_wins": [
    "<specific, actionable fix #1 — reference CV content where relevant>",
    "<specific, actionable fix #2>",
    "<specific, actionable fix #3>"
  ],
  "role_suggestions": [
    "<best-fit role title given CV>",
    "<second-fit role title>",
    "<third-fit role title>",
    "<stretch role title>"
  ],
  "salary_min": <realistic annual gross in ${salaryUnit} for this seniority in ${market}>,
  "salary_max": <realistic annual gross in ${salaryUnit}>,
  "salary_currency": "${salaryUnit}",
  "top_keyword": "<single most impactful missing keyword for '${role}' ATS>",
  "market_insight": "<1-2 sentences on demand and competition for '${role}' in ${market} right now>",
  "ai_vulnerability": <integer 0-100 — how much of this role is automatable by AI today>,
  "ai_vulnerability_label": "<exactly one of: Very High | High | Medium | Low | Very Low>",
  "ai_vulnerability_reason": "<2-3 sentences: name specific tasks in this CV that are at risk and which skills provide protection. Be honest and specific, not reassuring.>",
  "career_path_steps": [
    {
      "timeframe": "Now — 2 weeks",
      "focus": "Profile & CV overhaul",
      "actions": [
        "<action referencing actual CV gaps>",
        "<action referencing quick win>",
        "<action>"
      ]
    },
    {
      "timeframe": "Month 1",
      "focus": "Skills & visibility",
      "actions": [
        "<specific certification or course for '${role}' in ${market}>",
        "<LinkedIn or community action>",
        "<application targets: number and seniority>"
      ]
    },
    {
      "timeframe": "Month 2–3",
      "focus": "Active search & offers",
      "actions": [
        "<interview prep specific to '${role}'>",
        "<salary negotiation target in ${salaryUnit}>",
        "<networking action>"
      ]
    }
  ],
  "roast_lines": [
    "<Line 1: quote exact wording from CV, explain why it signals weakness for '${role}'>",
    "<Line 2: identify a real gap that IS visible — no assumptions>",
    "<Line 3: contrast a genuine strength in the CV with poor presentation or positioning>",
    "<Line 4: honest, specific observation about how AI will affect this exact profile in 2–3 years>"
  ]
}`
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const credits = await checkAndDeductCredits(user.id, COST, 'career_scan', user.email ?? '')
  if (!credits.ok) {
    return NextResponse.json({ error: 'Insufficient credits', credits: credits.remaining, required: COST }, { status: 402 })
  }

  try {
    const { cvText, role, market } = await req.json()
    if (!cvText?.trim()) {
      return NextResponse.json({ error: 'CV text is required' }, { status: 400 })
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildPrompt(cvText, role || 'the target role', market || 'Germany') }],
    })

    const raw = (message.content[0] as { text: string }).text
    const clean = raw.replace(/```json\n?|```/g, '').trim()
    const data = JSON.parse(clean)

    const safe = {
      score: typeof data.score === 'number' ? Math.max(0, Math.min(100, data.score)) : 50,
      market_fit_score: typeof data.market_fit_score === 'number' ? Math.max(0, Math.min(100, data.market_fit_score)) : null,
      keyword_score: typeof data.keyword_score === 'number' ? Math.max(0, Math.min(100, data.keyword_score)) : null,
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
      ai_vulnerability: typeof data.ai_vulnerability === 'number' ? Math.max(0, Math.min(100, data.ai_vulnerability)) : 50,
      ai_vulnerability_label: data.ai_vulnerability_label ?? 'Medium',
      ai_vulnerability_reason: data.ai_vulnerability_reason ?? '',
      career_path_steps: Array.isArray(data.career_path_steps) ? data.career_path_steps : [],
      roast_lines: Array.isArray(data.roast_lines) ? data.roast_lines : [],
      creditsRemaining: credits.remaining,
    }

    return NextResponse.json(safe)
  } catch (err) {
    console.error('Career scan error:', err)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
