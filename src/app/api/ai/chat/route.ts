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
- When listing jobs: "First up is... Then there's... And another one is..."
- Keep responses tight — 2 to 5 sentences. Brief and punchy.
- Each job in one sentence: title, company, location, one standout thing.

WHAT YOU CAN DO:
- Search live jobs via the search_jobs tool — ALWAYS use this when asked about jobs. Never make up job listings.
- Give salary insights, market advice, skills guidance from your knowledge.
- Suggest the user go to CV Builder, Career Scan, Cover Letter, or Tracker when relevant — use suggest_feature for this.

RULES:
- When user asks to find, search, or show jobs — call search_jobs immediately. Do not answer from memory.
- After showing jobs, offer to help with CV tailoring or cover letter.
- If search returns no results, say so honestly and suggest broadening the search.`

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

async function searchJobs(input: SearchInput, market: string): Promise<string> {
  const appId  = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY

  if (!appId || !appKey) {
    return JSON.stringify({ error: 'Job search not configured', jobs: [] })
  }

  const country = input.country || (market === 'in' ? 'in' : 'de')
  const city    = (input.location || '').split(',')[0].trim()

  const params = new URLSearchParams({
    app_id:           appId,
    app_key:          appKey,
    results_per_page: '6',
    what:             input.query,
  })
  if (city) params.set('where', city)

  const ctrl  = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)

  try {
    const res = await fetch(
      `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`,
      { signal: ctrl.signal }
    )
    clearTimeout(timer)

    if (!res.ok) {
      console.error('Adzuna error:', res.status)
      return JSON.stringify({ error: 'Job search unavailable', jobs: [] })
    }

    const data = await res.json()
    const jobs = (data.results || [])
      .slice(0, 6)
      .map((j: Record<string, unknown>) => {
        const loc     = j.location as Record<string, unknown> | undefined
        const areas   = loc?.area as string[] | undefined
        const company = j.company as Record<string, unknown> | undefined
        return {
          title:      String(j.title || ''),
          company:    String(company?.display_name || ''),
          location:   areas?.[areas.length - 1] || city || country.toUpperCase(),
          posted:     String(j.created || ''),
          salary_min: (j.salary_min as number) || null,
          salary_max: (j.salary_max as number) || null,
          description: String(j.description || '').slice(0, 250),
          apply_url:  String(j.redirect_url || ''),
        }
      })
      .sort((a: { posted: string }, b: { posted: string }) =>
        new Date(b.posted).getTime() - new Date(a.posted).getTime()
      )

    return JSON.stringify({ jobs, total: data.count || jobs.length })
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
    ? '\n\nMARKET: India. Salaries in INR (LPA). Cities: Bangalore, Hyderabad, Mumbai, Pune, Delhi. Detect language (English/Hindi/Kannada/Telugu) and respond naturally in kind.'
    : '\n\nMARKET: DACH (Germany, Austria, Switzerland). Salaries in EUR/CHF. Respond in German if user writes German, English if English.'

  const cvCtx = cvText
    ? `\n\nUSER CV (use this to personalise job search and advice):\n${cvText.slice(0, 5000)}`
    : ''

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

      // Overall deadline — stream always terminates
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
