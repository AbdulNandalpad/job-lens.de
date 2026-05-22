import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase } from '@/lib/supabase-server'
import { MARKET } from '@/lib/constants'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── System prompt ─────────────────────────────────────────────────────────────

const BASE_SYSTEM = `You are Kira, an AI career assistant built into Job-Lens. You are warm, direct, and genuinely helpful — like a smart friend who knows the job market well.

PERSONALITY:
- Conversational and natural. Use contractions: you'll, I'd, let's, I've.
- Short punchy sentences. React naturally: "Oh nice!", "Okay so here's the thing —", "Found some good ones."
- Show enthusiasm for strong matches. Show empathy when things are tough.
- Never sound like you're reading from a report.

FORMAT — CRITICAL:
- Plain text only. Zero markdown. No asterisks, no bold, no headers, no bullet dashes.
- Keep responses tight — 2 to 5 sentences max. Brief and punchy.
- When jobs are found: job cards are shown automatically to the user, so just give a short spoken intro like "Found some good ones in Munich." Don't repeat job details in text.
- Each insight in one sentence maximum.

SEARCH_JOBS PARAMETER RULES — READ CAREFULLY:
- query: ONLY the job title or skill keywords. Strip location words. Examples:
    User says "software developer jobs in Munich" → query="software developer", location="Munich"
    User says "find me React jobs" → query="React developer", location="" (empty)
    User says "Marketing Manager Berlin" → query="Marketing Manager", location="Berlin"
- location: the city or region extracted separately. Never include it in query.
- country: pick based on location — "de" for German cities, "at" for Austria, "ch" for Switzerland, "in" for Indian cities. Default: "de" for DACH market, "in" for India market.

WHAT YOU CAN DO:
1. Search live jobs via search_jobs — ALWAYS call this when asked about jobs. Never make up listings.
2. Score CV match — when user asks "does my CV match X?" or "how do I score for Y role?", read their CV from context and give: a score out of 10, 2 strengths, 2 gaps. No tool needed — just analyse.
3. Skill gap — when user asks "what am I missing for X?", compare their CV to the role requirements. List 2-4 missing skills concisely.
4. Salary guidance — give real ranges from your knowledge. Be specific. DACH: entry €45-65k, mid €65-90k, senior €90-130k+ (Munich 15-20% higher). India: entry 4-8 LPA, mid 8-20 LPA, senior 20-50 LPA (Bangalore/Hyderabad top end).
5. Suggest features via suggest_feature when relevant.

CV SCORING EXAMPLE (when CV is available):
User: "Does my CV match a Senior React Developer role?"
You: "You'd score about 7/10 for that. Strong on React and TypeScript, solid project history. You're missing GraphQL and testing experience — worth adding if you have any. Want me to search for openings?"

RULES:
- Job search: call search_jobs immediately. Do not answer from memory.
- After jobs are shown: offer one follow-up — CV match score or cover letter help.
- If no results: say so honestly, suggest broadening the search.
- If no CV in context: still help, just say you can't personalise without a CV upload.`

// ── Tools ─────────────────────────────────────────────────────────────────────

const tools: Anthropic.Messages.Tool[] = [
  {
    name: 'search_jobs',
    description: 'Search live job listings from Adzuna. Call this whenever the user wants to find or see jobs.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query:    { type: 'string', description: 'Job title or keywords, e.g. "Senior React Developer"' },
        location: { type: 'string', description: 'City or region, e.g. "Munich" or "Bangalore"' },
        country:  { type: 'string', description: 'Country code: de, at, ch, in. Defaults to de for DACH, in for India.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'suggest_feature',
    description: 'Show a button directing the user to a Job-Lens feature. Use when they need CV tailoring, career analysis, cover letter, or application tracking.',
    input_schema: {
      type: 'object' as const,
      properties: {
        feature: {
          type: 'string',
          enum: ['career_scan', 'cv_builder', 'cover_letter', 'tracker'],
          description: 'Which feature to link to',
        },
        reason: { type: 'string', description: 'One short sentence explaining why you are suggesting this' },
      },
      required: ['feature', 'reason'],
    },
  },
]

// ── Feature link map ──────────────────────────────────────────────────────────

const FEATURE_LINKS: Record<'eu' | 'in', Record<string, { label: string; href: string }>> = {
  eu: {
    career_scan:  { label: 'Open Career Scan',  href: '/app/career-scan' },
    cv_builder:   { label: 'Open CV Builder',   href: '/app/cv-builder' },
    cover_letter: { label: 'Open Cover Letter', href: '/app/cover-letter' },
    tracker:      { label: 'Open Tracker',      href: '/app/tracker' },
  },
  in: {
    career_scan:  { label: 'Open Career Scan',  href: '/in/career-scan' },
    cv_builder:   { label: 'Open CV Builder',   href: '/in/cv-builder' },
    cover_letter: { label: 'Open Cover Letter', href: '/in/cover-letter' },
    tracker:      { label: 'Open Tracker',      href: '/in/tracker' },
  },
}

// ── Adzuna job search ─────────────────────────────────────────────────────────

interface SearchInput { query: string; location?: string; country?: string }

function mapJobs(results: Record<string, unknown>[], fallbackCity: string, country: string) {
  return results.map(j => {
    const loc     = j.location as Record<string, unknown> | undefined
    const areas   = loc?.area as string[] | undefined
    const company = j.company as Record<string, unknown> | undefined
    return {
      title:      String(j.title || ''),
      company:    String(company?.display_name || ''),
      location:   areas?.[areas.length - 1] || fallbackCity || country.toUpperCase(),
      posted:     String(j.created || ''),
      salary_min: (j.salary_min as number) || null,
      salary_max: (j.salary_max as number) || null,
      apply_url:  String(j.redirect_url || ''),
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

  if (!messages.length) return new Response('No messages', { status: 400 })

  // Build system prompt
  const marketCtx = market === 'in'
    ? '\n\nMARKET: India. Salaries in INR (LPA). Top cities: Bangalore, Hyderabad, Mumbai, Pune, Delhi NCR. Detect language (English/Hindi/Kannada/Telugu) and respond naturally in kind.'
    : '\n\nMARKET: DACH (Germany, Austria, Switzerland). Salaries in EUR/CHF. Respond in German if user writes German, English if English.'

  const cvCtx = cvText
    ? `\n\nUSER CV (use this to personalise advice and score job matches):\n${cvText.slice(0, 5000)}`
    : '\n\nNo CV uploaded yet — you can still help, but cannot personalise match scores without one.'

  const systemContent = BASE_SYSTEM + marketCtx + cvCtx

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
            model:      'claude-sonnet-4-6',
            max_tokens: 800,
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
              if (tb.name !== 'suggest_feature') safeSend({ status: tb.name })
            }

            // Execute tools in parallel
            const toolResults: Anthropic.Messages.ToolResultBlockParam[] = await Promise.all(
              toolUses.map(async tb => {
                let result: string

                if (tb.name === 'search_jobs') {
                  result = await searchJobs(tb.input as SearchInput, market)
                  const parsed = JSON.parse(result) as { jobs?: unknown[]; total?: number; error?: string }
                  if (parsed.jobs && parsed.jobs.length > 0) {
                    safeSend({ jobs: parsed.jobs, total: parsed.total ?? parsed.jobs.length })
                  }

                } else if (tb.name === 'suggest_feature') {
                  const inp  = tb.input as { feature: string; reason: string }
                  const meta = FEATURE_LINKS[market][inp.feature]
                  if (meta) {
                    result = JSON.stringify({ feature: inp.feature, label: meta.label, href: meta.href, reason: inp.reason })
                    safeSend({ action: JSON.parse(result) })
                  } else {
                    result = JSON.stringify({ error: 'Unknown feature' })
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
