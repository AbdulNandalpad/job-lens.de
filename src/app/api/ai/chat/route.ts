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

WHAT YOU DO — only these three things:
1. Find live jobs — call search_jobs immediately when asked. Never invent listings.
2. Salary guidance — give specific ranges. DACH: entry €45-65k, mid €65-90k, senior €90-130k+ (Munich 15-20% higher). India: entry 4-8 LPA, mid 8-20 LPA, senior 20-50 LPA.
3. CV scoring — score /10 with 2 specific strengths and 2 gaps. Reference the actual CV. Ask one question at a time when doing a CV review.

SEARCH_JOBS RULES:
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
]

// ── Adzuna job search ─────────────────────────────────────────────────────────

interface SearchInput { query: string; location?: string; country?: string }

function mapJobs(results: Record<string, unknown>[], fallbackCity: string, country: string) {
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
      apply_url:   String(j.redirect_url || ''),
      description: String(j.description || '').slice(0, 400),
    }
  }).sort((a, b) => new Date(b.posted).getTime() - new Date(a.posted).getTime())
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
  const body                       = await req.json()
  const messages: ChatMessage[]    = body.messages || []
  const cvText: string             = body.cvText   || ''
  const market: 'eu' | 'in'       = body.market   || MARKET.eu
  const mode: string               = body.mode     || ''
  const isVoice: boolean           = !!body.isVoice

  if (!messages.length) return new Response('No messages', { status: 400 })

  // Build system prompt
  const marketCtx = market === 'in'
    ? '\n\nMARKET: India. Salaries in INR (LPA). Top cities: Bangalore, Hyderabad, Mumbai, Pune, Delhi NCR. Detect language (English/Hindi/Kannada/Telugu) and respond naturally in kind.'
    : '\n\nMARKET: DACH (Germany, Austria, Switzerland). Salaries in EUR/CHF. Respond in German if user writes German, English if English.'

  const cvCtx = cvText
    ? `\n\nUSER CV (use this to personalise advice and score job matches):\n${cvText.slice(0, 5000)}`
    : '\n\nNo CV uploaded yet — you can still help, but cannot personalise match scores without one.'

  const basePrompt = mode === 'cv_discuss' ? CV_DISCUSS_SYSTEM : BASE_SYSTEM
  const systemContent = basePrompt + marketCtx + cvCtx

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
                  const parsed = JSON.parse(result) as { jobs?: unknown[]; total?: number; error?: string }
                  if (parsed.jobs && parsed.jobs.length > 0) {
                    safeSend({ jobs: parsed.jobs, total: parsed.total ?? parsed.jobs.length, query: inp.query, location: inp.location || '' })
                  }
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

        // Track message count — charge 1 credit per AI_CHAT_FREE_MESSAGES block after free tier
        const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
        if (!adminEmails.includes((user.email ?? '').toLowerCase())) {
          try {
            const admin = createAdminSupabase()
            const { data } = await admin
              .from('profiles')
              .select('ai_message_count')
              .eq('id', user.id)
              .single()

            const newCount = (data?.ai_message_count ?? 0) + 1
            await admin.from('profiles').update({ ai_message_count: newCount }).eq('id', user.id)

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
