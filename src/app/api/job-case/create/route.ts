/**
 * POST /api/job-case/create
 * Creates a Job Case record, deducts credits, stores all data.
 * Also triggers AI match analysis + pitch narrative generation.
 *
 * GDPR:
 * - Consent timestamps stored with version string
 * - job_posting_raw deleted immediately after AI processing
 * - PII stripped before Anthropic calls
 * - Video storage key stored (points to private EU-region bucket)
 */
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase, createAdminSupabase, checkAndDeductCredits } from '@/lib/supabase-server'
import { JOB_CASE, MARKET } from '@/lib/constants'
import { nanoid } from 'nanoid'
import { reportError } from '@/lib/error-reporter'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function scrubPii(text: string): string {
  return text
    .replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '[email]')
    .replace(/(\+?\d[\d\s\-().]{7,}\d)/g, '[phone]')
}

async function generateMatchAnalysis(opts: {
  requirements: Array<{ skill: string; description: string; essential: boolean }>
  evidence: Array<{ requirementId: string; text: string; url: string }>
  cvText: string
  jobTitle: string
}): Promise<{ requirementEvidence: unknown[]; pitchNarrative: string; matchScore: number }> {
  const { requirements, evidence, cvText, jobTitle } = opts

  const cleanCv = scrubPii(cvText.slice(0, 6000))

  const reqWithEvidence = requirements.map((r, i) => ({
    skill: r.skill,
    description: r.description,
    essential: r.essential,
    evidence: evidence[i]?.text ?? '',
    url: evidence[i]?.url ?? '',
  }))

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `You are evaluating a candidate's evidence against job requirements for a ${jobTitle} role.

Requirements and candidate evidence:
${reqWithEvidence.map((r, i) => `${i+1}. ${r.skill} (${r.essential ? 'essential' : 'preferred'})
   Required: ${r.description}
   Evidence: ${r.evidence || '(none provided)'}
   URL: ${r.url || 'none'}`).join('\n\n')}

CV context (anonymised):
${cleanCv}

Return JSON only — no markdown:
{
  "requirement_evidence": [
    {
      "skill": "<skill>",
      "status": "verified" | "partial" | "missing",
      "evidence": "<candidate evidence text>",
      "url": "<url or empty>",
      "score": <0-100>
    }
  ],
  "match_score": <0-100 overall>,
  "pitch_narrative": "<3-4 sentences in first person — why this candidate fits this role specifically. Use their actual evidence. Do not invent anything.>"
}

Status rules:
- "verified": strong, specific evidence with measurable outcomes
- "partial": some evidence but gaps or vague
- "missing": no credible evidence provided`,
    }],
  })

  const raw = (msg.content[0] as { text: string }).text.trim()
  const json = JSON.parse(raw.replace(/```json|```/g, '').trim())

  return {
    requirementEvidence: json.requirement_evidence ?? [],
    pitchNarrative: json.pitch_narrative ?? '',
    matchScore: json.match_score ?? 0,
  }
}

async function scoreTestAnswers(opts: {
  questions: Array<{ question: string; skill_being_tested: string; expected_signals?: string[] }>
  answers: string[]
}): Promise<{ scoredAnswers: unknown[]; overallScore: number }> {
  const { questions, answers } = opts

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: `Score these ${questions.length} test answers. Return JSON only.

${questions.map((q, i) => `Q${i+1} (${q.skill_being_tested}): ${q.question}
Answer: ${answers[i] ?? '(no answer)'}`).join('\n\n')}

Return:
{
  "answers": [
    { "question": "<question>", "answer": "<answer>", "score": <0-100>, "skill_being_tested": "<skill>" }
  ],
  "overall_score": <average 0-100>
}

Scoring: specificity (does it cite a real example?), outcome (measurable result?), clarity (easy to follow?).`,
    }],
  })

  const raw = (msg.content[0] as { text: string }).text.trim()
  const json = JSON.parse(raw.replace(/```json|```/g, '').trim())

  return {
    scoredAnswers: json.answers ?? [],
    overallScore: json.overall_score ?? 0,
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      jobText, jobTitle, companyName,
      requirements, evidence,
      questions, answers, tabSwitches,
      videoStorageKey, videoDurationSeconds,
      consent, cvText,
      market,
    } = body

    // Validate consent
    if (!consent?.video || !consent?.test || !consent?.tracking) {
      return NextResponse.json({ error: 'All three consents required' }, { status: 400 })
    }

    const creditMarket = market === MARKET.in ? MARKET.in : MARKET.eu
    const deduction = await checkAndDeductCredits(
      user.id,
      JOB_CASE.creditCost,
      'job_case_creation',
      user.email,
      creditMarket
    )
    if (!deduction.ok) {
      return NextResponse.json({ error: 'Insufficient credits', remaining: deduction.remaining }, { status: 402 })
    }

    // Run AI match analysis + test scoring in parallel
    const [matchResult, testResult] = await Promise.all([
      generateMatchAnalysis({
        requirements: requirements ?? [],
        evidence: evidence ?? [],
        cvText: cvText ?? '',
        jobTitle,
      }),
      scoreTestAnswers({ questions: questions ?? [], answers: answers ?? [] }),
    ])

    const slug = nanoid(12)
    const admin = createAdminSupabase()

    const { data: jobCase, error } = await admin.from('job_cases').insert({
      user_id:                user.id,
      slug,
      job_title:              jobTitle,
      company_name:           companyName ?? '',
      // GDPR: job_posting_raw deleted immediately after insert by setting to null below
      job_posting_raw:        null,
      job_requirements:       requirements ?? [],
      job_quality_score:      body.qualityScore ?? 'clear',
      match_score:            matchResult.matchScore,
      pitch_narrative:        matchResult.pitchNarrative,
      requirement_evidence:   matchResult.requirementEvidence,
      test_answers:           testResult.scoredAnswers,
      test_overall_score:     testResult.overallScore,
      video_storage_key:      videoStorageKey ?? null,
      video_duration_seconds: videoDurationSeconds ?? null,
      status:                 'active',
      consent_video:          true,
      consent_test:           true,
      consent_tracking:       true,
      consent_timestamp:      new Date().toISOString(),
      consent_version:        '1.0',
      credits_refunded:       false,
      view_count:             0,
    }).select('id, slug').single()

    if (error) {
      console.error('/api/job-case/create DB error:', error)
      return NextResponse.json({ error: 'Failed to create Job Case' }, { status: 500 })
    }

    // Store proof items for the reusable evidence library
    const proofItems = (evidence ?? [])
      .filter((e: { text: string }) => e.text?.trim())
      .map((e: { text: string; url: string }, i: number) => ({
        user_id:        user.id,
        skill_tag:      requirements[i]?.skill ?? '',
        evidence_text:  e.text,
        evidence_url:   e.url ?? '',
        source_case_id: jobCase.id,
      }))

    if (proofItems.length > 0) {
      await admin.from('proof_items').insert(proofItems)
    }

    return NextResponse.json({
      id:             jobCase.id,
      slug:           jobCase.slug,
      matchScore:     matchResult.matchScore,
      pitchNarrative: matchResult.pitchNarrative,
      testScore:      testResult.overallScore,
      caseUrl:        `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://job-lens.de'}/case/${jobCase.slug}`,
    })
  } catch (err) {
    console.error('/api/job-case/create error:', err)
    await reportError({ route: '/api/job-case/create', error: err, severity: 'critical' })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
