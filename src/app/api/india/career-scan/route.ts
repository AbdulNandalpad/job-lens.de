import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase, checkAndDeductCredits, refundCredits } from '@/lib/supabase-server'
import { CREDIT_COST, MARKET } from '@/lib/constants'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const COST = CREDIT_COST.careerScan

const SYSTEM_PROMPT = `You are an ATS (Applicant Tracking System) expert specializing in Indian recruitment systems: Taleo, Workday, iCIMS, Naukri ATS, and SmartRecruiters.

ABSOLUTE RULES:
1. Return ONLY valid JSON. Zero markdown, zero backticks, zero text outside JSON.
2. missing_keywords: ONLY phrases present in the JD but absent from the CV. Never invent.
3. matched_keywords: ONLY phrases found in BOTH the JD and CV. Semantic matches count (ML = Machine Learning).
4. format_issues: Only real detected problems. Empty array if none.
5. Scores reflect actual evidence — never inflate.

DOMAIN MISMATCH — CHECK THIS FIRST, before any scoring:
Determine whether the CV's professional domain and the JD's required domain are fundamentally incompatible — not a skills gap, but entirely different fields (e.g. SAP CX consultant CV for a Sitecore developer role, accountant CV for a software engineering role, nurse CV for a data science role).

If the domains are fundamentally incompatible:
- Set "domain_mismatch": true
- Write a blunt, direct "mismatch_message" — name exactly what domain the CV is in, name the domain the JD requires, state plainly that no ATS keyword fix can bridge this gap, and say what real-world experience they would need before applying. Do NOT soften the message with tips, encouragement, or workarounds.
- Still return valid JSON with all fields, but all scores should be 2–8 and other text fields can be minimal.

If domains are the same or reasonably compatible, set "domain_mismatch": false and "mismatch_message": "".

SCORING RUBRIC:
- keyword_score (0-100): JD keywords found in CV / total JD keywords * 100
- format_score (0-100): Start 100. Deduct: tables (-20), multi-column (-15), graphics (-20), missing email/phone (-15), special characters in section headers (-5), no LinkedIn (-5)
- section_score (0-100): summary/objective (+25), skills section (+25), experience (+25), education (+25)
- impact_score (0-100): action verbs at bullet starts (+40), quantified results with numbers (+40), measurable achievements (+20)
- ats_score: keyword*0.40 + format*0.25 + section*0.20 + impact*0.15 (round to integer)`

function buildPrompt(cvText: string, jdText: string): string {
  return `CV TEXT:
---
${cvText.slice(0, 12000)}
---

JOB DESCRIPTION:
---
${jdText.slice(0, 3000)}
---

Return ONLY valid JSON matching this exact schema:
{
  "ats_score": <integer 0-100>,
  "keyword_score": <integer 0-100>,
  "format_score": <integer 0-100>,
  "section_score": <integer 0-100>,
  "impact_score": <integer 0-100>,
  "readiness": "<ATS Ready|Needs Work|High Risk>",
  "headline": "<one sentence: primary finding>",
  "matched_keywords": ["<keyword from JD found in CV>"],
  "missing_keywords": ["<keyword from JD missing in CV>"],
  "format_issues": ["<specific detected format problem>"],
  "section_gaps": ["<weak or missing section>"],
  "quick_fixes": ["<actionable fix 1>", "<fix 2>", "<fix 3>", "<fix 4>", "<fix 5>"],
  "rewrite_suggestions": [
    {"original": "<exact bullet from CV>", "improved": "<rewritten with action verb + metric>"},
    {"original": "<exact bullet>", "improved": "<improved version>"}
  ],
  "ats_verdict": "<2 sentences: which ATS systems would likely pass or reject this CV and why>",
  "top_missing_keyword": "<single most impactful missing keyword>",
  "domain_mismatch": <true|false>,
  "mismatch_message": "<blunt explanation if domain_mismatch is true, else empty string>"
}`
}

function extractJson(raw: string): string {
  const s = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON in response')
  return s.slice(start, end + 1)
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const credits = await checkAndDeductCredits(user.id, COST, 'india_ats_scan', user.email ?? '', MARKET.in)
  if (!credits.ok) {
    return NextResponse.json({ error: 'Insufficient credits', credits: credits.remaining, required: COST }, { status: 402 })
  }

  try {
    const { cvText, jdText } = await req.json()

    if (!cvText?.trim()) {
      await refundCredits(user.id, COST, 'india_ats_scan')
      return NextResponse.json({ error: 'CV text is required' }, { status: 400 })
    }
    if (!jdText?.trim()) {
      await refundCredits(user.id, COST, 'india_ats_scan')
      return NextResponse.json({ error: 'Job description is required' }, { status: 400 })
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      temperature: 0,   // deterministic — prevents hallucinated keyword matches
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildPrompt(cvText, jdText) }],
    })

    const raw = (message.content[0] as { text: string }).text

    let data: Record<string, unknown>
    try {
      data = JSON.parse(extractJson(raw))
    } catch (parseErr) {
      console.error('ATS scan JSON parse failed:', parseErr, '\nRaw:', raw.slice(0, 500))
      await refundCredits(user.id, COST, 'india_ats_scan')
      return NextResponse.json({ error: 'Analysis failed — credits refunded' }, { status: 500 })
    }

    const clamp = (v: unknown, fallback: number) =>
      typeof v === 'number' ? Math.max(0, Math.min(100, v)) : fallback

    const safe = {
      ats_score: clamp(data.ats_score, 50),
      keyword_score: clamp(data.keyword_score, 50),
      format_score: clamp(data.format_score, 50),
      section_score: clamp(data.section_score, 50),
      impact_score: clamp(data.impact_score, 50),
      readiness: (data.readiness as string) ?? 'Needs Work',
      headline: (data.headline as string) ?? '',
      matched_keywords: Array.isArray(data.matched_keywords) ? data.matched_keywords : [],
      missing_keywords: Array.isArray(data.missing_keywords) ? data.missing_keywords : [],
      format_issues: Array.isArray(data.format_issues) ? data.format_issues : [],
      section_gaps: Array.isArray(data.section_gaps) ? data.section_gaps : [],
      quick_fixes: Array.isArray(data.quick_fixes) ? data.quick_fixes : [],
      rewrite_suggestions: Array.isArray(data.rewrite_suggestions) ? data.rewrite_suggestions : [],
      ats_verdict: (data.ats_verdict as string) ?? '',
      top_missing_keyword: (data.top_missing_keyword as string) ?? '',
      domain_mismatch: data.domain_mismatch === true,
      mismatch_message: (data.mismatch_message as string) ?? '',
      creditsRemaining: credits.remaining,
    }

    return NextResponse.json(safe)
  } catch (err) {
    console.error('ATS scan error:', err)
    await refundCredits(user.id, COST, 'india_ats_scan')
    return NextResponse.json({ error: 'Analysis failed — credits refunded' }, { status: 500 })
  }
}
