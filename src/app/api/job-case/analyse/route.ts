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
import { createServerSupabase, isUserRateLimited } from '@/lib/supabase-server'

const SSRF_RE = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|169\.254\.|::1$|fc[0-9a-f]{2}:|fd)/i

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/** Strip email addresses and phone numbers from text before sending to Anthropic. */
function scrubPii(text: string): string {
  return text
    .replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '[email]')
    .replace(/(\+?\d[\d\s\-().]{7,}\d)/g, '[phone]')
}

/** Strip HTML tags and collapse whitespace to extract readable text. */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Fetch the job posting URL and extract readable text.
 * Times out after 8 s to avoid blocking the API response.
 * Returns null if the fetch fails or the page is not HTML.
 */
const MAX_REDIRECTS = 3

async function fetchJobText(url: string): Promise<string | null> {
  // SSRF guard — validate scheme and hostname before fetching
  if (!url.startsWith('https://')) return null
  try {
    const h = new URL(url).hostname
    if (SSRF_RE.test(h)) return null
  } catch {
    return null
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    let currentUrl = url
    let redirectsLeft = MAX_REDIRECTS
    let res: Response | null = null

    while (redirectsLeft-- >= 0) {
      res = await fetch(currentUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; JobLens/1.0; +https://job-lens.de)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        redirect: 'manual',
      })
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location') ?? ''
        if (!location.startsWith('https://')) break
        try {
          const rh = new URL(location).hostname
          if (SSRF_RE.test(rh)) break
        } catch { break }
        currentUrl = location
        continue
      }
      break
    }

    clearTimeout(timeout)
    if (!res) return null
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) return null
    const html = await res.text()
    const text = stripHtml(html)
    return text.length > 200 ? text : null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (await isUserRateLimited(user.id, 'job_case_analyse', 10)) {
      return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 })
    }

    const { jobText, jobUrl, cvText } = await req.json()
    if (!jobText?.trim() && !jobUrl?.trim()) {
      return NextResponse.json({ error: 'Job text or URL required' }, { status: 400 })
    }

    // Validate jobUrl before fetching — must be https and not internal
    const safeJobUrl = typeof jobUrl === 'string' ? jobUrl.trim() : ''
    if (safeJobUrl && !safeJobUrl.startsWith('https://')) {
      return NextResponse.json({ error: 'jobUrl must start with https://' }, { status: 400 })
    }
    if (safeJobUrl) {
      try {
        const h = new URL(safeJobUrl).hostname
        if (SSRF_RE.test(h)) return NextResponse.json({ error: 'Invalid job URL' }, { status: 400 })
      } catch {
        return NextResponse.json({ error: 'Invalid job URL' }, { status: 400 })
      }
    }

    // If a URL is provided, fetch the full page text and prefer it over the
    // (often truncated) Adzuna search snippet in jobText.
    let fullText = (jobText ?? '').trim()
    if (safeJobUrl) {
      const fetched = await fetchJobText(safeJobUrl)
      if (fetched && fetched.length > fullText.length) fullText = fetched
    }

    // GDPR: scrub any PII before sending to Anthropic
    const cleanJobText = scrubPii(fullText.slice(0, 12000))
    const cleanCvText  = cvText?.trim() ? scrubPii((cvText as string).slice(0, 8000)) : ''
    const hasCv = cleanCvText.length > 100

    const prompt = hasCv
      ? `You are a job requirements analyst. Extract the top 5–7 concrete requirements from this job posting, then score how well the candidate's CV covers each requirement. Return JSON only — no markdown, no backticks.

Job posting:
${cleanJobText}

Candidate CV:
${cleanCvText}

Return this exact JSON shape:
{
  "job_title": "<role title>",
  "company_name": "<company name or empty string>",
  "quality_score": "clear" | "vague" | "poor",
  "quality_reason": "<one sentence explaining the quality score>",
  "match_score": <integer 0-100 reflecting how well the CV covers the requirements overall>,
  "requirements": [
    { "id": "1", "skill": "<skill name>", "description": "<1 sentence>", "essential": true | false }
  ]
}

quality_score rules:
- "clear": specific, measurable requirements with years/technologies named
- "vague": generic buzzwords without specifics
- "poor": < 3 concrete requirements or incomprehensible posting

match_score rules:
- Score based only on evidence in the CV — do not assume skills not mentioned
- 80–100: strong overlap, most essential requirements clearly evidenced
- 50–79: partial match, some essential requirements missing or unclear
- 0–49: weak match, most essential requirements not evidenced`
      : `You are a job requirements analyst. Extract the top 5–7 concrete requirements from this job posting. Return JSON only — no markdown, no backticks.

Job posting:
${cleanJobText}

Return this exact JSON shape:
{
  "job_title": "<role title>",
  "company_name": "<company name or empty string>",
  "quality_score": "clear" | "vague" | "poor",
  "quality_reason": "<one sentence explaining the quality score>",
  "requirements": [
    { "id": "1", "skill": "<skill name>", "description": "<1 sentence>", "essential": true | false }
  ]
}

quality_score rules:
- "clear": specific, measurable requirements with years/technologies named
- "vague": generic buzzwords without specifics
- "poor": < 3 concrete requirements or incomprehensible posting`

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      temperature: 0,   // deterministic — same job posting should analyse the same every time
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (msg.content[0] as { text: string }).text.trim()
    const json = JSON.parse(raw.replace(/```json|```/g, '').trim())

    return NextResponse.json({
      jobTitle:     json.job_title ?? '',
      companyName:  json.company_name ?? '',
      qualityScore: json.quality_score,
      qualityReason: json.quality_reason ?? '',
      // null when no CV — UI shows "—" instead of a meaningless number
      matchScore:   hasCv && typeof json.match_score === 'number' ? json.match_score : null,
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
