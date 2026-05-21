import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase, checkAndDeductCredits } from '@/lib/supabase-server'
import { CREDIT_COST, MARKET } from '@/lib/constants'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are Kira, an AI career assistant built into Job-Lens for the DACH job market (Germany, Austria, Switzerland).

WHAT YOU CAN DO DIRECTLY:
- Search live jobs via search_jobs (Adzuna)
- Score how well a CV matches a job via score_jobs
- Analyse skill gaps between a CV and job description via get_skill_gap
- Give salary insights for any role in DE/AT/CH via get_salary_info
- Answer questions about the DACH job market, visa requirements, in-demand skills, hiring norms, relocation, work permits
- Help users decide which jobs to prioritise

WHAT YOU HAND OFF TO THE APP (use suggest_action for these):
- Full CV analysis with scoring, market fit, AI risk score → suggest career_scan
- Tailoring a CV for a specific role → suggest cv_builder (pass the job title/description)
- Writing a cover letter → suggest cover_letter
- Auto-filling job application forms → suggest auto_apply
- Tracking job applications → suggest tracker

HAND-OFF RULES:
- When a user wants to tailor their CV or needs a full career analysis, always use suggest_action — never try to do it yourself in the chat
- After a job search, if a job looks like a strong match, proactively offer to check the skill gap or suggest CV Builder
- After scoring a job, if score < 60, suggest Career Scan for a full analysis

TONE AND FORMAT — CRITICAL:
- Plain conversational text only. No markdown whatsoever.
- No asterisks (*), no bold (**text**), no headers (#), no bullet dashes (-), no backticks
- Use numbered lists (1. 2. 3.) when listing jobs or steps
- Keep responses tight — 3 to 6 sentences for answers, concise job listings
- Be direct and helpful, not corporate`

// ── Tool definitions ─────────────────────────────────────────────────────────

const tools: Anthropic.Messages.Tool[] = [
  {
    name: 'search_jobs',
    description: 'Search for live job listings from Adzuna matching the query and location.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query:    { type: 'string', description: 'Job search query, e.g. "Senior React Developer" or "Marketing Manager fintech"' },
        location: { type: 'string', description: 'City or region, e.g. "Stuttgart" or "Munich"' },
        country:  { type: 'string', description: 'Country code: de, at, ch. Default: de' },
      },
      required: ['query'],
    },
  },
  {
    name: 'score_jobs',
    description: 'Score how well the user\'s CV matches a specific job. Returns a 0-100 match score plus key matching and missing skills.',
    input_schema: {
      type: 'object' as const,
      properties: {
        job_title:       { type: 'string' },
        job_description: { type: 'string' },
        cv_text:         { type: 'string' },
      },
      required: ['job_title', 'job_description', 'cv_text'],
    },
  },
  {
    name: 'get_skill_gap',
    description: 'Compare the user\'s CV against a job description and return matching skills and missing skills the user should highlight or acquire.',
    input_schema: {
      type: 'object' as const,
      properties: {
        cv_text:         { type: 'string', description: 'The user\'s CV text' },
        job_description: { type: 'string', description: 'The full job description' },
      },
      required: ['cv_text', 'job_description'],
    },
  },
  {
    name: 'get_salary_info',
    description: 'Return typical salary ranges for a role in the DACH job market based on Claude\'s training knowledge.',
    input_schema: {
      type: 'object' as const,
      properties: {
        role:       { type: 'string', description: 'Job title or role, e.g. "Senior Software Engineer"' },
        country:    { type: 'string', description: 'de, at, or ch. Default: de' },
        seniority:  { type: 'string', description: 'junior, mid, senior, lead. Optional.' },
      },
      required: ['role'],
    },
  },
  {
    name: 'suggest_action',
    description: 'Show the user a clickable button to navigate to a specific Job-Lens feature. Use this whenever the user\'s intent requires deeper work that the chat cannot do — CV tailoring, full analysis, cover letter, auto apply, or tracking.',
    input_schema: {
      type: 'object' as const,
      properties: {
        feature: {
          type: 'string',
          enum: ['career_scan', 'cv_builder', 'cover_letter', 'auto_apply', 'tracker'],
          description: 'Which app feature to send the user to',
        },
        reason: {
          type: 'string',
          description: 'One short sentence explaining why you are suggesting this feature (shown as button label context)',
        },
      },
      required: ['feature', 'reason'],
    },
  },
]

// ── Tool executors ────────────────────────────────────────────────────────────

interface SearchJobsInput  { query: string; location?: string; country?: string }
interface ScoreJobsInput   { job_title: string; job_description: string; cv_text: string }
interface SkillGapInput    { cv_text: string; job_description: string }
interface SalaryInfoInput  { role: string; country?: string; seniority?: string }
interface SuggestAction    { feature: string; reason: string }

const FEATURE_META: Record<'eu' | 'in', Record<string, { label: string; href: string }>> = {
  eu: {
    career_scan:  { label: 'Open Career Scan',   href: '/app/career-scan' },
    cv_builder:   { label: 'Open CV Builder',    href: '/app/cv-builder' },
    cover_letter: { label: 'Open Cover Letter',  href: '/app/cover-letter' },
    auto_apply:   { label: 'Open Auto Apply',    href: '/app/auto-apply' },
    tracker:      { label: 'Open Tracker',       href: '/app/tracker' },
  },
  in: {
    career_scan:  { label: 'Open Career Scan',   href: '/in/career-scan' },
    cv_builder:   { label: 'Open CV Builder',    href: '/in/cv-builder' },
    cover_letter: { label: 'Open Cover Letter',  href: '/in/cover-letter' },
    auto_apply:   { label: 'Open Auto Apply',    href: '/app/auto-apply' },
    tracker:      { label: 'Open Tracker',       href: '/in/tracker' },
  },
}

async function executeSearchJobs(input: SearchJobsInput, market: 'eu' | 'in' = 'eu'): Promise<string> {
  const appId   = process.env.ADZUNA_APP_ID!
  const appKey  = process.env.ADZUNA_APP_KEY!
  const country = input.country || (market === 'in' ? 'in' : 'de')
  const city    = (input.location || '').split(',')[0].trim()

  const params = new URLSearchParams({ app_id: appId, app_key: appKey, results_per_page: '8', what: input.query })
  if (city) params.set('where', city)

  try {
    const res  = await fetch(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`)
    if (!res.ok) return JSON.stringify({ error: 'Job search unavailable', jobs: [] })
    const data = await res.json()
    const jobs = (data.results || []).slice(0, 8).map((j: Record<string, unknown>) => {
      const loc     = j.location as Record<string, unknown> | undefined
      const areas   = loc?.area as string[] | undefined
      const company = j.company as Record<string, unknown> | undefined
      return {
        id:          String(j.id),
        title:       String(j.title || ''),
        company:     String(company?.display_name || ''),
        location:    areas?.[areas.length - 1] || city || country.toUpperCase(),
        description: String(j.description || '').slice(0, 400),
        apply_url:   String(j.redirect_url || ''),
        posted:      String(j.created || ''),
        salary_min:  (j.salary_min as number) || null,
        salary_max:  (j.salary_max as number) || null,
      }
    })
    return JSON.stringify({ jobs, total: data.count || jobs.length })
  } catch {
    return JSON.stringify({ error: 'Failed to fetch jobs', jobs: [] })
  }
}

async function executeScoreJobs(input: ScoreJobsInput): Promise<string> {
  try {
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Score this CV against the job. Return ONLY valid JSON, no markdown.

Job: ${input.job_title}
Description: ${input.job_description.slice(0, 1200)}

CV: ${input.cv_text.slice(0, 2500)}

Return: {"score": <0-100>, "matching_skills": ["skill1","skill2","skill3"], "missing_skills": ["skill1","skill2"], "verdict": "<1 plain sentence>"}`,
      }],
    })
    const text = res.content.find(b => b.type === 'text')
    if (!text || text.type !== 'text') return JSON.stringify({ score: 50, matching_skills: [], missing_skills: [], verdict: 'Scoring unavailable' })
    return text.text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
  } catch {
    return JSON.stringify({ score: 50, matching_skills: [], missing_skills: [], verdict: 'Scoring unavailable' })
  }
}

async function executeSkillGap(input: SkillGapInput): Promise<string> {
  try {
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Extract technical skills from this job description. Check which appear in the CV. Return ONLY valid JSON, no markdown.
{ "matching": ["skill1", "skill2"], "missing": ["skill3", "skill4"] }
Rules: max 8 each, concise 1-4 word items, technical/professional skills only.

JOB: ${input.job_description.slice(0, 1200)}
CV: ${input.cv_text.slice(0, 2000)}`,
      }],
    })
    const text = res.content.find(b => b.type === 'text')
    if (!text || text.type !== 'text') return JSON.stringify({ matching: [], missing: [] })
    return text.text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
  } catch {
    return JSON.stringify({ matching: [], missing: [] })
  }
}

async function executeSalaryInfo(input: SalaryInfoInput, market: 'eu' | 'in' = 'eu'): Promise<string> {
  try {
    const country     = input.country || (market === 'in' ? 'in' : 'de')
    const countryName = country === 'at' ? 'Austria' : country === 'ch' ? 'Switzerland' : country === 'in' ? 'India' : 'Germany'
    const currency    = country === 'ch' ? 'CHF' : country === 'in' ? 'INR' : 'EUR'
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Provide typical gross annual salary ranges for "${input.role}" in ${countryName}${input.seniority ? ` at ${input.seniority} level` : ''}.
Return ONLY valid JSON, no markdown:
{"currency": "${currency}", "junior": {"min": <num>, "max": <num>}, "mid": {"min": <num>, "max": <num>}, "senior": {"min": <num>, "max": <num>}, "note": "<one plain sentence about market context>"}`,
      }],
    })
    const text = res.content.find(b => b.type === 'text')
    if (!text || text.type !== 'text') return JSON.stringify({ error: 'Salary data unavailable' })
    return text.text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
  } catch {
    return JSON.stringify({ error: 'Salary data unavailable' })
  }
}

function executeSuggestAction(input: SuggestAction, market: 'eu' | 'in'): string {
  const meta = FEATURE_META[market][input.feature]
  if (!meta) return JSON.stringify({ error: 'Unknown feature' })
  return JSON.stringify({ feature: input.feature, label: meta.label, href: meta.href, reason: input.reason })
}

// ── Route handler ─────────────────────────────────────────────────────────────

interface ChatMessage { role: 'user' | 'assistant'; content: string }

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const body      = await req.json()
  const messages: ChatMessage[] = body.messages || []
  const cvText: string          = body.cvText || ''
  const market: 'eu' | 'in'    = body.market || MARKET.eu

  if (!messages.length) return new Response(JSON.stringify({ error: 'No messages' }), { status: 400 })

  const deduct = await checkAndDeductCredits(user.id, CREDIT_COST.aiChat, 'ai_chat', user.email ?? undefined, market)
  if (!deduct.ok) {
    return new Response(JSON.stringify({ error: 'insufficient_credits', remaining: deduct.remaining }), {
      status: 402, headers: { 'Content-Type': 'application/json' },
    })
  }

  const marketContext = market === 'in'
    ? '\n\nMARKET CONTEXT: You are helping a user in the Indian job market. Salaries are in INR. Focus on Indian cities (Bangalore, Hyderabad, Mumbai, Pune, Delhi, Chennai). Reference Indian hiring norms, IT sector trends, and service companies (TCS, Infosys, Wipro, HCL) vs product companies. Visa questions relate to H-1B, work abroad from India, or foreign companies hiring in India.\n\nLANGUAGE: The user may write or speak in Hindi or English. Detect their language from each message and respond in the same language. If they write in Hindi (Devanagari script or Hinglish), respond in Hindi. If they write in English, respond in English.'
    : '\n\nLANGUAGE: The user may write or speak in German or English. Detect their language from each message and respond in the same language. If they write in German, respond in German. If they write in English, respond in English.'

  const systemContent = cvText
    ? `${SYSTEM_PROMPT}${marketContext}\n\n---\nUser CV:\n${cvText.slice(0, 6000)}\n---`
    : `${SYSTEM_PROMPT}${marketContext}`

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))

      try {
        let currentMessages: Anthropic.Messages.MessageParam[] = messages.map(m => ({
          role: m.role, content: m.content,
        }))

        for (let i = 0; i < 5; i++) {
          const response = await client.messages.create({
            model: 'claude-opus-4-7',
            max_tokens: 2048,
            system: systemContent,
            tools,
            messages: currentMessages,
          })

          if (response.stop_reason === 'tool_use') {
            const toolBlocks = response.content.filter(b => b.type === 'tool_use') as Anthropic.Messages.ToolUseBlock[]

            for (const tb of toolBlocks) {
              if (tb.name !== 'suggest_action') send({ status: tb.name })
            }

            const toolResults: Anthropic.Messages.ToolResultBlockParam[] = await Promise.all(
              toolBlocks.map(async (tb) => {
                let result: string
                switch (tb.name) {
                  case 'search_jobs':    result = await executeSearchJobs(tb.input as SearchJobsInput, market); break
                  case 'score_jobs':     result = await executeScoreJobs(tb.input as ScoreJobsInput);           break
                  case 'get_skill_gap':  result = await executeSkillGap(tb.input as SkillGapInput);             break
                  case 'get_salary_info':result = await executeSalaryInfo(tb.input as SalaryInfoInput, market); break
                  case 'suggest_action': {
                    result = executeSuggestAction(tb.input as SuggestAction, market)
                    // Emit the action immediately so widget can render the button
                    try { send({ action: JSON.parse(result) }) } catch { /* ignore */ }
                    break
                  }
                  default: result = JSON.stringify({ error: 'Unknown tool' })
                }
                return { type: 'tool_result' as const, tool_use_id: tb.id, content: result }
              })
            )

            currentMessages = [
              ...currentMessages,
              { role: 'assistant', content: response.content },
              { role: 'user', content: toolResults },
            ]
          } else {
            const textBlocks = response.content.filter(b => b.type === 'text') as Anthropic.Messages.TextBlock[]
            const fullText   = textBlocks.map(b => b.text).join('')
            const words      = fullText.split(/(\s+)/)
            for (let w = 0; w < words.length; w += 3) {
              const chunk = words.slice(w, w + 3).join('')
              if (chunk) send({ text: chunk })
            }
            break
          }
        }

        send({ done: true })
      } catch (err) {
        console.error('Kira error:', err)
        send({ error: 'Something went wrong. Please try again.' })
      }

      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  })
}
