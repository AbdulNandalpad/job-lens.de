import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase, createAdminSupabase, checkAndDeductCredits } from '@/lib/supabase-server'
import { MARKET, CREDIT_COST, AI_CHAT_FREE_MESSAGES } from '@/lib/constants'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── System prompt ─────────────────────────────────────────────────────────────

const BASE_SYSTEM = `You are Kira, an AI career assistant. Warm, direct, genuinely helpful — like a smart friend who knows the job market.

PERSONALITY:
- Conversational. Use contractions: you'll, I'd, let's.
- React naturally: "Oh nice!", "Got it —", "Found some good ones."
- Never sound like a report or a list of bullet points.

WHAT YOU DO:
1. Find live jobs — call search_jobs immediately when asked. Never invent listings.
2. Salary guidance — give specific ranges. DACH: entry €45-65k, mid €65-90k, senior €90-130k+ (Munich 15-20% higher). India: entry 4-8 LPA, mid 8-20 LPA, senior 20-50 LPA.
3. Quick CV snapshot — when asked to scan/review/analyse a CV: give a score /10, one strength, one gap in 2 sentences max. Then call suggest_feature with feature="career_scan" so the user can get the full ATS report and career path.
4. Feature suggestions — call suggest_feature when a Job-Lens tool fits better than a chat answer.

SUGGEST_FEATURE RULES — call it after your text reply when:
- User asks for CV scan / career scan / analyse my CV / review my profile → suggest "career_scan"
- User asks to tailor CV for a job / rewrite CV → suggest "cv_builder"
- User asks to write a cover letter → suggest "cover_letter"
- Never suggest a feature without giving a short answer first.
- Never suggest more than one feature per turn.

SEARCH_JOBS RULES:
- Only call search_jobs when the user explicitly asks to find or see jobs. Never call it during a CV scan, career scan, or feature suggestion flow.
- query: job title/skills only — strip location words
- location: city extracted separately
- country: de/at/ch/in based on city; default de for DACH, in for India

FORMAT — CRITICAL:
- Plain text only. Zero markdown. No asterisks, headers, or bullet dashes.
- 1-3 sentences max. Short and punchy.
- After jobs found: one spoken intro line only — job cards appear automatically, don't repeat details.`

// ── Tools ─────────────────────────────────────────────────────────────────────

const tools: Anthropic.Messages.Tool[] = [
  {
    name: 'search_jobs',
    description: 'Search live job listings from Adzuna. Call this whenever the user wants to find or see jobs.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query:    { type: 'string', description: 'Job title or keywords only — no location words' },
        location: { type: 'string', description: 'City or region extracted separately, e.g. "Munich"' },
        country:  { type: 'string', description: 'Country code: de, at, ch, in' },
      },
      required: ['query'],
    },
  },
  {
    name: 'suggest_feature',
    description: 'Show a Job-Lens feature card after your text reply. Use when a dedicated tool would give the user a much better result than chat alone.',
    input_schema: {
      type: 'object' as const,
      properties: {
        feature: {
          type: 'string',
          enum: ['career_scan', 'cv_builder', 'cover_letter'],
          description: 'Which Job-Lens feature to suggest',
        },
        reason: {
          type: 'string',
          description: 'One short sentence explaining what the full tool adds beyond what you just said',
        },
      },
      required: ['feature'],
    },
  },
]

// ── Feature suggestion map ────────────────────────────────────────────────────
interface FeatureDef { label: string; href: (market: string) => string }
const FEATURE_MAP: Record<string, FeatureDef> = {
  career_scan:  { label: 'Run Full Career Scan',    href: m => m === 'in' ? '/in/career-scan'  : '/app/career-scan'  },
  cv_builder:   { label: 'Tailor My CV',            href: m => m === 'in' ? '/in/cv-builder'   : '/app/cv-builder'   },
  cover_letter: { label: 'Write Cover Letter',      href: m => m === 'in' ? '/in/cover-letter' : '/app/cover-letter' },
}

// ── Adzuna job search ─────────────────────────────────────────────────────────

interface SearchInput { query: string; location?: string; country?: string }

interface MappedJob {
  title: string; company: string; location: string; posted: string
  salary_min: number | null; salary_max: number | null
  apply_url: string; description: string
  match_score?: number | null; matching_skills?: string[]; missing_skills?: string[]
}

interface JobScore { score: number; matching: string[]; missing: string[] }

function mapJobs(results: Record<string, unknown>[], fallbackCity: string, country: string): MappedJob[] {
  return results.map(j => {
    const loc     = j.location as Record<string, unknown> | undefined
    const areas   = loc?.area as string[] | undefined
    const company = j.company as Record<string, unknown> | undefined
    return {
      title:       String(j.title || ''),
      company:     String(company?.display_name || ''),
      location:    areas?.[areas.length - 1] || fallbackCity || country.toUpperCase(),
      posted:      String(j.created || ''),
      salary_min:  (j.salary_min as number) || null,
      salary_max:  (j.salary_max as number) || null,
      apply_url:   (() => { const u = String(j.redirect_url || ''); return u.startsWith('https://') || u.startsWith('http://') ? u : '' })(),
      description: String(j.description || '').slice(0, 400),
    }
  }).sort((a, b) => new Date(b.posted).getTime() - new Date(a.posted).getTime())
}

async function scoreJobsAgainstCv(jobs: MappedJob[], cvText: string): Promise<JobScore[]> {
  const jobList = jobs.map((j, i) =>
    `Job ${i + 1}: ${j.title} at ${j.company}\n${j.description.slice(0, 300)}`
  ).join('\n---\n')

  try {
    const res = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system:     'You score CV-to-job match. Respond ONLY with a valid JSON array — no prose, no markdown.',
      messages:   [{
        role:    'user',
        content: `CV:\n${cvText.slice(0, 2500)}\n\nJobs:\n${jobList}\n\nFor each job return score (0-100 integer), matching (up to 3 key matching skills as short strings), missing (up to 2 key gaps as short strings). Be realistic — a perfect match is rare.\n\nFormat: [{"score":82,"matching":["React","TypeScript"],"missing":["AWS"]},...]`,
      }],
    })

    const text  = res.content[0]?.type === 'text' ? res.content[0].text : ''
    const found = text.match(/\[[\s\S]*\]/)
    if (!found) return jobs.map(() => ({ score: 0, matching: [], missing: [] }))
    return JSON.parse(found[0]) as JobScore[]
  } catch {
    return jobs.map(() => ({ score: 0, matching: [], missing: [] }))
  }
}

async function fetchAdzuna(
  appId: string, appKey: string, country: string, query: string, city: string, signal: AbortSignal
): Promise<{ results: Record<string, unknown>[]; count: number } | null> {
  const params = new URLSearchParams({
    app_id:           appId,
    app_key:          appKey,
    results_per_page: '10',
    what:             query,
    where:            city,
  })
  const res = await fetch(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`, { signal })
  if (!res.ok) return null
  const data = await res.json()
  return { results: data.results || [], count: data.count || 0 }
}

async function searchJobs(input: SearchInput, market: string): Promise<string> {
  const appId  = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY

  if (!appId || !appKey) {
    return JSON.stringify({ error: 'Job search not configured', jobs: [] })
  }

  const country = input.country || (market === 'in' ? 'in' : 'de')
  const city    = (input.location || '').split(',')[0].trim()

  const ctrl  = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 10_000)

  try {
    // First: search with city filter
    let data = await fetchAdzuna(appId, appKey, country, input.query, city, ctrl.signal)

    // Fallback: retry without city if zero results and city was specified
    if (data && data.results.length === 0 && city) {
      data = await fetchAdzuna(appId, appKey, country, input.query, '', ctrl.signal)
    }

    clearTimeout(timer)

    if (!data) {
      return JSON.stringify({ error: 'Job search unavailable', jobs: [] })
    }

    const sorted = mapJobs(data.results, city, country)
    const jobs   = sorted.slice(0, 5)

    return JSON.stringify({ jobs, total: data.count })
  } catch {
    clearTimeout(timer)
    return JSON.stringify({ error: 'Job search timed out', jobs: [] })
  }
}

// ── CV Discussion system prompt ───────────────────────────────────────────────

const CV_DISCUSS_SYSTEM = `You are Kira, having a focused 1-on-1 career coaching conversation with the user about their CV. Your goal: understand their situation through natural back-and-forth, then give a clear, concrete verdict.

CONVERSATION STYLE:
- Ask ONE question at a time — never stack multiple questions
- React genuinely to what they say: "Oh that's solid.", "Interesting — so three years in that role?", "Got it, that makes sense."
- Keep turns short: 1-2 sentences until the conclusion
- Sound like a smart friend, not a consultant

QUESTIONS TO EXPLORE (pick the most relevant given their CV):
- What role are they targeting?
- What's their biggest career win so far?
- What gaps do they already know about?
- What's their timeline — actively applying or exploring?
- Anything specific about the CV they want to fix?

CONCLUSION (after 4–6 exchanges, when you have enough):
Give a verdict in this structure — still conversational, not a report:
1. Overall score out of 10 and one-line reason
2. Two specific strengths (reference actual CV content)
3. Two clear gaps to address
4. Two concrete next steps they can do this week

RULES:
- Reference their actual CV content — be specific, not generic
- No markdown, no bullet dashes — plain spoken text in the conversation, structure only at conclusion
- Do not rush to the conclusion — let the conversation breathe first`

// ── Route ─────────────────────────────────────────────────────────────────────

interface ChatMessage { role: 'user' | 'assistant'; content: string }

export async function POST(req: NextRequest) {
  // Auth
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // Parse body
  const body = await req.json()

  // Validate market at runtime — TypeScript types don't protect against crafted requests
  const rawMarket = body.market
  const market: 'eu' | 'in' = rawMarket === MARKET.in ? MARKET.in : MARKET.eu

  const mode: string     = body.mode === 'cv_discuss' ? 'cv_discuss' : ''
  const isVoice: boolean = !!body.isVoice

  // Cap CV text server-side (client may send full file)
  const cvText: string = typeof body.cvText === 'string' ? body.cvText.slice(0, 8000) : ''

  // Interview context — verify coachUnlocked server-side against usage_events
  // Client flag is untrusted; check DB for a recent interview_coaching payment
  let coachUnlockedVerified = false
  if (body.interviewCtx && typeof body.interviewCtx.role === 'string') {
    const admin = createAdminSupabase()
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: coachEvents } = await admin
      .from('usage_events')
      .select('id')
      .eq('user_id', user.id)
      .eq('action', 'interview_coaching')
      .gte('created_at', since)
      .limit(1)
    coachUnlockedVerified = (coachEvents?.length ?? 0) > 0
  }
  const interviewCtx = body.interviewCtx && typeof body.interviewCtx.role === 'string'
    ? { ...(body.interviewCtx as { role: string; company: string; currentQ: string }), coachUnlocked: coachUnlockedVerified }
    : null

  // Cap message history — prevent context explosion and API abuse
  const rawMessages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : []
  const messages = rawMessages
    .slice(-40)                                                // last 40 messages max
    .filter(m => m.role === 'user' || m.role === 'assistant') // only valid roles
    .map(m => ({ role: m.role, content: String(m.content ?? '').slice(0, 4000) })) // cap per message

  if (!messages.length) return new Response('No messages', { status: 400 })

  // Build system prompt
  const marketCtx = market === 'in'
    ? '\n\nMARKET: India. Salaries in INR (LPA). Top cities: Bangalore, Hyderabad, Mumbai, Pune, Delhi NCR. Detect language (English/Hindi/Kannada/Telugu) and respond naturally in kind.'
    : '\n\nMARKET: DACH (Germany, Austria, Switzerland). Salaries in EUR/CHF. Respond in German if user writes German, English if English.'

  const cvCtx = cvText
    ? `\n\nUSER CV (use this to personalise advice and score job matches):\n${cvText.slice(0, 5000)}`
    : '\n\nNo CV uploaded yet — you can still help, but cannot personalise match scores without one.'

  const interviewCtxStr = interviewCtx
    ? interviewCtx.coachUnlocked
      ? `\n\nINTERVIEW COACHING MODE (UNLOCKED): The user has paid for full interview coaching. They are preparing for a ${interviewCtx.role} role${interviewCtx.company ? ` at ${interviewCtx.company}` : ''}.${interviewCtx.currentQ ? ` Current question: "${interviewCtx.currentQ}". Give them a tailored STAR answer structure, specific examples relevant to this role, a sample strong answer, and flag common mistakes for this question type. Be their personal interview coach.` : ' Help with anything they need — STAR method, mock Q&A, what to expect, salary negotiation, nerves. Be thorough and specific to their role.'}`
      : `\n\nINTERVIEW LIMITED MODE: The user is on the Interview Prep page for a ${interviewCtx.role} role${interviewCtx.company ? ` at ${interviewCtx.company}` : ''}. Give ONE short general tip only (e.g. STAR method overview, or a quick confidence tip). Then say you can give them fully tailored coaching — STAR answers specific to their questions, mock Q&A, and role-specific advice — for 1 credit, and ask if they'd like to unlock it. Do not give role-specific or question-specific advice until unlocked.`
    : ''

  const basePrompt = mode === 'cv_discuss' ? CV_DISCUSS_SYSTEM : BASE_SYSTEM
  const systemContent = basePrompt + marketCtx + cvCtx + interviewCtxStr

  // Stream setup
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      let closed = false

      const safeSend = (data: Record<string, unknown>) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          closed = true
        }
      }

      const safeClose = () => {
        if (closed) return
        closed = true
        try { controller.close() } catch { /* already closed */ }
      }

      // Overall deadline
      const deadline = setTimeout(() => {
        safeSend({ error: 'Request timed out. Please try again.' })
        safeClose()
      }, 45_000)

      try {
        let currentMsgs: Anthropic.Messages.MessageParam[] = messages.map(m => ({
          role: m.role, content: m.content,
        }))

        // Agentic loop — max 3 rounds
        for (let round = 0; round < 3; round++) {
          const response = await client.messages.create({
            model:      isVoice ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-6',
            max_tokens: isVoice ? 150 : 700,
            system:     systemContent,
            tools,
            messages:   currentMsgs,
          })

          if (response.stop_reason === 'tool_use') {
            const toolUses = response.content.filter(
              (b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use'
            )

            // Signal tool activity to client
            for (const tb of toolUses) {
              safeSend({ status: tb.name })
            }

            // Execute tools in parallel
            const toolResults: Anthropic.Messages.ToolResultBlockParam[] = await Promise.all(
              toolUses.map(async tb => {
                let result: string

                if (tb.name === 'search_jobs') {
                  const inp = tb.input as SearchInput
                  result = await searchJobs(inp, market)
                  const parsed = JSON.parse(result) as { jobs?: MappedJob[]; total?: number; error?: string }
                  if (parsed.jobs && parsed.jobs.length > 0) {
                    let jobs = parsed.jobs

                    // Score against CV when available — single fast Haiku call
                    if (cvText) {
                      safeSend({ status: 'score_jobs' })
                      const scores = await scoreJobsAgainstCv(jobs, cvText)
                      jobs = jobs.map((j, i) => ({
                        ...j,
                        match_score:     scores[i]?.score    ?? null,
                        matching_skills: scores[i]?.matching ?? [],
                        missing_skills:  scores[i]?.missing  ?? [],
                      }))
                    }

                    safeSend({ jobs, total: parsed.total ?? jobs.length, query: inp.query, location: inp.location || '' })
                  }
                } else if (tb.name === 'suggest_feature') {
                  const inp    = tb.input as { feature: string; reason?: string }
                  const def    = FEATURE_MAP[inp.feature]
                  if (def) {
                    safeSend({
                      action: {
                        feature: inp.feature,
                        label:   def.label,
                        href:    def.href(market),
                        reason:  inp.reason ?? '',
                      },
                    })
                  }
                  result = JSON.stringify({ ok: true })
                } else {
                  result = JSON.stringify({ error: 'Unknown tool' })
                }

                return { type: 'tool_result' as const, tool_use_id: tb.id, content: result }
              })
            )

            currentMsgs = [
              ...currentMsgs,
              { role: 'assistant', content: response.content },
              { role: 'user',      content: toolResults },
            ]

          } else {
            // Final text — stream in small word chunks
            const fullText = response.content
              .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
              .map(b => b.text)
              .join('')

            const words = fullText.split(/(\s+)/)
            for (let w = 0; w < words.length; w += 3) {
              const chunk = words.slice(w, w + 3).join('')
              if (chunk) safeSend({ text: chunk })
            }
            break
          }
        }

        safeSend({ done: true })

        // Track message count — atomic increment, charge 1 credit per AI_CHAT_FREE_MESSAGES block
        const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
        if (!adminEmails.includes((user.email ?? '').toLowerCase())) {
          try {
            const admin = createAdminSupabase()
            const { data: newCount, error: rpcErr } = await admin
              .rpc('increment_ai_message_count', { p_user_id: user.id })

            if (rpcErr) throw rpcErr

            // Charge at message 21, 41, 61 … (first of each paid block)
            if (newCount > AI_CHAT_FREE_MESSAGES && (newCount - 1) % AI_CHAT_FREE_MESSAGES === 0) {
              await checkAndDeductCredits(user.id, CREDIT_COST.aiChat, 'ai_chat', user.email ?? '', market)
            }
          } catch (err) {
            console.error('[Kira credits]', err)
          }
        }

      } catch (err) {
        console.error('[Kira]', err)
        safeSend({ error: 'Something went wrong. Please try again.' })
      } finally {
        clearTimeout(deadline)
        safeClose()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}
