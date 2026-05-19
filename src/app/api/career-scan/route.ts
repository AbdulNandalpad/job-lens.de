import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase, checkAndDeductCredits, refundCredits } from '@/lib/supabase-server'
import { CREDIT_COST, MARKET } from '@/lib/constants'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const COST = CREDIT_COST.careerScan

const SYSTEM_PROMPT = `You are a senior career analyst specializing in the DACH (Germany, Austria, Switzerland) job market with 20 years of recruitment and coaching experience.

ABSOLUTE RULES — violating any of these makes your output worthless:
1. Respond ONLY with valid JSON. Zero markdown, zero backticks, zero explanations outside the JSON.
2. NEVER invent, assume, or infer information not explicitly present in the CV text provided.
3. Every strength, gap, and roast_line MUST quote or directly reference specific text from the CV. If you cannot find evidence in the CV, do not mention it.
4. Roast lines must be surgical: quote exact job titles, company names, dates, or wording from the CV, then explain why it is weak for the target role. NEVER say "your CV lacks X" unless X is genuinely absent from the text shown.
5. Salary ranges must reflect real DACH market data for the seniority level evidenced in the CV.
6. Keep all string values concise — max 2 sentences each. Do not pad responses.

CONSISTENT SCORING RUBRIC (apply this exactly):
- 85–100: 10+ years directly relevant experience, strong DACH market presence, leadership credentials, 90%+ skills alignment with target role
- 70–84: Solid background, some leadership, 70–89% skills alignment, minor addressable gaps
- 55–69: Mid-level, 50–69% alignment, clear upskilling needed
- 35–54: Early career or domain mismatch, significant gaps vs. target role
- 0–34: Entry level, major gaps, career change territory

AI VULNERABILITY SCORING (0 = fully automation-proof, 100 = fully automatable today):
- High risk: pattern-matching, data entry, report generation, templated writing, basic analysis
- Low risk: physical presence, creative judgment, political navigation, stakeholder empathy, complex negotiation

DOMAIN MISMATCH — CHECK THIS FIRST, before any scoring:
Determine whether the CV's professional domain and the target role's domain are fundamentally incompatible — not a skills gap, but entirely different fields (e.g. SAP consultant CV for a Sitecore developer role, nurse CV for a data science role, accountant CV for a software engineering role, marketing manager CV for a DevOps position).

If the domains are fundamentally incompatible:
- Set "domain_mismatch": true
- Write a blunt, direct "mismatch_message" — name exactly what domain the CV is in, name the domain the role requires, state plainly that no amount of keyword editing will fix this, and say what real-world experience they would need before applying. Do NOT soften the message with tips, encouragement, or workarounds.
- Still return valid JSON with all fields, but scores should be 2–8 and other text fields can be minimal.

If domains are the same or reasonably compatible, set "domain_mismatch": false and "mismatch_message": "".`

function buildPrompt(cvText: string, role: string, market: string): string {
  const salaryUnit = market === 'Switzerland' ? 'CHF' : 'EUR'
  return `CV TEXT — read every word carefully; do not reference anything not explicitly present in this text:
---
${cvText.slice(0, 15000)}
---

Target role: "${role}"
Market: ${market}

Return ONLY valid JSON matching this schema exactly:
{
  "score": <integer 0-100>,
  "market_fit_score": <integer 0-100>,
  "keyword_score": <integer 0-100>,
  "readiness": "<Ready|Strong|Developing|Entry>",
  "headline": "<12 words max — neutral summary of actual profile>",
  "summary": "<2 sentences from CV content only>",
  "strengths": ["<CV evidence>", "<CV evidence>", "<CV evidence>", "<CV evidence>"],
  "gaps": ["<gap vs role>", "<gap vs role>", "<gap vs role>"],
  "quick_wins": ["<actionable fix>", "<actionable fix>", "<actionable fix>"],
  "role_suggestions": ["<title>", "<title>", "<title>", "<title>"],
  "salary_min": <annual gross ${salaryUnit}>,
  "salary_max": <annual gross ${salaryUnit}>,
  "salary_currency": "${salaryUnit}",
  "top_keyword": "<single ATS keyword>",
  "market_insight": "<1-2 sentences on ${role} demand in ${market}>",
  "ai_vulnerability": <integer 0-100>,
  "ai_vulnerability_label": "<Very High|High|Medium|Low|Very Low>",
  "ai_vulnerability_reason": "<2 sentences: name at-risk tasks and protective skills>",
  "career_path_steps": [
    {"timeframe": "Now — 2 weeks", "focus": "Profile overhaul", "actions": ["<action>", "<action>", "<action>"]},
    {"timeframe": "Month 1", "focus": "Skills & visibility", "actions": ["<action>", "<action>", "<action>"]},
    {"timeframe": "Month 2–3", "focus": "Active search", "actions": ["<action>", "<action>", "<action>"]}
  ],
  "roast_lines": [
    "<quote exact CV wording + explain weakness for role>",
    "<real visible gap — no assumptions>",
    "<strength vs poor positioning>",
    "<AI impact on this profile in 2-3 years>"
  ],
  "domain_mismatch": <true|false>,
  "mismatch_message": "<blunt explanation if domain_mismatch is true, else empty string>"
}`
}

function extractJson(raw: string): string {
  // Strip markdown fences
  let s = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  // Find outermost JSON object
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON object found in response')
  return s.slice(start, end + 1)
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const credits = await checkAndDeductCredits(user.id, COST, 'career_scan', user.email ?? '', MARKET.eu)
  if (!credits.ok) {
    return NextResponse.json({ error: 'Insufficient credits', credits: credits.remaining, required: COST }, { status: 402 })
  }

  try {
    const { cvText, role, market, lang } = await req.json()
    if (!cvText?.trim()) {
      await refundCredits(user.id, COST, 'career_scan')
      return NextResponse.json({ error: 'CV text is required' }, { status: 400 })
    }

    const languageInstruction = lang === 'DE'
      ? '\n\nIMPORTANT: Respond with ALL text fields (headline, summary, strengths, gaps, quick_wins, role_suggestions, market_insight, ai_vulnerability_reason, career_path_steps, roast_lines) written in German. Keep role titles and technical terms in their original language if that is standard in the DACH market.'
      : ''

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      temperature: 0,   // deterministic — prevents score drift and hallucinated evidence
      system: SYSTEM_PROMPT + languageInstruction,
      messages: [{ role: 'user', content: buildPrompt(cvText, role || 'the target role', market || 'Germany') }],
    })

    const raw = (message.content[0] as { text: string }).text

    let data: Record<string, unknown>
    try {
      data = JSON.parse(extractJson(raw))
    } catch (parseErr) {
      console.error('Career scan JSON parse failed:', parseErr, '\nRaw:', raw.slice(0, 500))
      await refundCredits(user.id, COST, 'career_scan')
      return NextResponse.json({ error: 'Analysis failed — credits refunded' }, { status: 500 })
    }

    const safe = {
      score: typeof data.score === 'number' ? Math.max(0, Math.min(100, data.score)) : 50,
      market_fit_score: typeof data.market_fit_score === 'number' ? Math.max(0, Math.min(100, data.market_fit_score)) : null,
      keyword_score: typeof data.keyword_score === 'number' ? Math.max(0, Math.min(100, data.keyword_score)) : null,
      readiness: (data.readiness as string) ?? 'Developing',
      headline: (data.headline as string) ?? 'Professional profile',
      summary: (data.summary as string) ?? '',
      strengths: Array.isArray(data.strengths) ? data.strengths : [],
      gaps: Array.isArray(data.gaps) ? data.gaps : [],
      quick_wins: Array.isArray(data.quick_wins) ? data.quick_wins : [],
      role_suggestions: Array.isArray(data.role_suggestions) ? data.role_suggestions : [],
      salary_min: (data.salary_min as number) ?? 60000,
      salary_max: (data.salary_max as number) ?? 90000,
      salary_currency: (data.salary_currency as string) ?? 'EUR',
      top_keyword: (data.top_keyword as string) ?? '',
      market_insight: (data.market_insight as string) ?? '',
      ai_vulnerability: typeof data.ai_vulnerability === 'number' ? Math.max(0, Math.min(100, data.ai_vulnerability)) : 50,
      ai_vulnerability_label: (data.ai_vulnerability_label as string) ?? 'Medium',
      ai_vulnerability_reason: (data.ai_vulnerability_reason as string) ?? '',
      career_path_steps: Array.isArray(data.career_path_steps) ? data.career_path_steps : [],
      roast_lines: Array.isArray(data.roast_lines) ? data.roast_lines : [],
      domain_mismatch: data.domain_mismatch === true,
      mismatch_message: (data.mismatch_message as string) ?? '',
      creditsRemaining: credits.remaining,
    }

    return NextResponse.json(safe)
  } catch (err) {
    console.error('Career scan error:', err)
    await refundCredits(user.id, COST, 'career_scan')
    return NextResponse.json({ error: 'Analysis failed — credits refunded' }, { status: 500 })
  }
}
