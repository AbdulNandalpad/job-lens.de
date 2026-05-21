import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase, checkAndDeductCredits } from '@/lib/supabase-server'
import { CREDIT_COST, MARKET } from '@/lib/constants'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are Job-Lens AI, a smart career assistant embedded in the Job-Lens platform. You help users find relevant jobs, understand how well their profile matches roles, and guide them through the application process.

You have access to two tools:
- search_jobs: search for live job listings from Adzuna
- score_jobs: score how well the user's CV matches a specific job

Guidelines:
- Be concise and direct — users are busy job seekers
- When presenting job results, format them clearly with job title, company, location, and a brief why-it-matches explanation
- When a CV is provided, use it to personalise your search queries and scoring
- Always suggest the next action (tailor CV, write cover letter, etc.)
- If asked about something outside job search / career, politely redirect
- Use match scores to help users prioritise which jobs to pursue first`

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface SearchJobsInput {
  query: string
  location?: string
  country?: string
}

interface ScoreJobsInput {
  job_title: string
  job_description: string
  cv_text: string
}

const tools: Anthropic.Messages.Tool[] = [
  {
    name: 'search_jobs',
    description: 'Search for live job listings matching the user\'s query and preferences. Returns up to 10 relevant jobs.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Job search query (e.g. "Senior React Developer", "Marketing Manager fintech")',
        },
        location: {
          type: 'string',
          description: 'Location to search in (e.g. "Stuttgart", "Berlin"). Defaults to Germany.',
        },
        country: {
          type: 'string',
          description: 'Country code: de (Germany), at (Austria), ch (Switzerland). Default: de',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'score_jobs',
    description: 'Score how well the user\'s CV matches a specific job. Returns a match percentage and key matching/missing skills.',
    input_schema: {
      type: 'object' as const,
      properties: {
        job_title: {
          type: 'string',
          description: 'The job title',
        },
        job_description: {
          type: 'string',
          description: 'The full job description text',
        },
        cv_text: {
          type: 'string',
          description: 'The user\'s CV text',
        },
      },
      required: ['job_title', 'job_description', 'cv_text'],
    },
  },
]

async function executeSearchJobs(input: SearchJobsInput): Promise<string> {
  const appId = process.env.ADZUNA_APP_ID!
  const appKey = process.env.ADZUNA_APP_KEY!
  const country = input.country || 'de'
  const location = input.location || ''
  const city = location.split(',')[0].trim()

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: '10',
    what: input.query,
  })
  if (city) params.set('where', city)

  try {
    const res = await fetch(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`)
    if (!res.ok) return JSON.stringify({ error: 'Job search failed', jobs: [] })

    const data = await res.json()
    const jobs = (data.results || []).slice(0, 10).map((j: Record<string, unknown>) => {
      const loc = j.location as Record<string, unknown> | undefined
      const areas = loc?.area as string[] | undefined
      const company = j.company as Record<string, unknown> | undefined
      return {
        id: String(j.id),
        title: String(j.title || ''),
        company: String(company?.display_name || ''),
        location: areas?.[areas.length - 1] || city || country.toUpperCase(),
        description: String(j.description || '').slice(0, 500),
        apply_url: String(j.redirect_url || ''),
        posted: String(j.created || ''),
        salary_min: (j.salary_min as number) || null,
        salary_max: (j.salary_max as number) || null,
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
      messages: [
        {
          role: 'user',
          content: `Score this CV against the job. Return ONLY valid JSON.

Job: ${input.job_title}
Description: ${input.job_description.slice(0, 1500)}

CV: ${input.cv_text.slice(0, 3000)}

Return: {"score": <0-100>, "matching_skills": ["skill1","skill2","skill3"], "missing_skills": ["skill1","skill2"], "verdict": "<1 sentence>"}`,
        },
      ],
    })

    const text = res.content.find(b => b.type === 'text')
    if (!text || text.type !== 'text') return JSON.stringify({ score: 50, matching_skills: [], missing_skills: [], verdict: 'Could not score' })

    const raw = text.text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
    return raw
  } catch {
    return JSON.stringify({ score: 50, matching_skills: [], missing_skills: [], verdict: 'Scoring unavailable' })
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const body = await req.json()
  const messages: ChatMessage[] = body.messages || []
  const cvText: string = body.cvText || ''
  const market: 'eu' | 'in' = body.market || MARKET.eu

  if (!messages.length) {
    return new Response(JSON.stringify({ error: 'No messages' }), { status: 400 })
  }

  const deduct = await checkAndDeductCredits(user.id, CREDIT_COST.aiChat, 'ai_chat', user.email ?? undefined, market)
  if (!deduct.ok) {
    return new Response(JSON.stringify({ error: 'insufficient_credits', remaining: deduct.remaining }), {
      status: 402,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const systemContent = cvText
    ? `${SYSTEM_PROMPT}\n\n---\nUser's CV (use this to personalise job searches and scoring):\n${cvText.slice(0, 6000)}\n---`
    : SYSTEM_PROMPT

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        let currentMessages: Anthropic.Messages.MessageParam[] = messages.map(m => ({
          role: m.role,
          content: m.content,
        }))

        // Agentic loop — max 4 tool call iterations
        for (let i = 0; i < 4; i++) {
          const response = await client.messages.create({
            model: 'claude-opus-4-7',
            max_tokens: 1024,
            system: [
              {
                type: 'text',
                text: systemContent,
                cache_control: { type: 'ephemeral' },
              },
            ],
            tools,
            messages: currentMessages,
          })

          if (response.stop_reason === 'tool_use') {
            const toolBlocks = response.content.filter(b => b.type === 'tool_use') as Anthropic.Messages.ToolUseBlock[]

            // Notify client which tools are being called
            for (const tb of toolBlocks) {
              send({ status: tb.name })
            }

            // Execute all tool calls in parallel
            const toolResults: Anthropic.Messages.ToolResultBlockParam[] = await Promise.all(
              toolBlocks.map(async (tb) => {
                let result: string
                if (tb.name === 'search_jobs') {
                  result = await executeSearchJobs(tb.input as SearchJobsInput)
                } else if (tb.name === 'score_jobs') {
                  result = await executeScoreJobs(tb.input as ScoreJobsInput)
                } else {
                  result = JSON.stringify({ error: 'Unknown tool' })
                }
                return {
                  type: 'tool_result' as const,
                  tool_use_id: tb.id,
                  content: result,
                }
              })
            )

            currentMessages = [
              ...currentMessages,
              { role: 'assistant', content: response.content },
              { role: 'user', content: toolResults },
            ]
          } else {
            // end_turn — stream the text response
            const textBlocks = response.content.filter(b => b.type === 'text') as Anthropic.Messages.TextBlock[]
            const fullText = textBlocks.map(b => b.text).join('')

            // Send in small chunks for streaming effect
            const words = fullText.split(/(\s+)/)
            for (let w = 0; w < words.length; w += 3) {
              const chunk = words.slice(w, w + 3).join('')
              if (chunk) send({ text: chunk })
            }
            break
          }
        }

        send({ done: true, creditsRemaining: deduct.remaining - CREDIT_COST.aiChat })
      } catch (err) {
        console.error('AI chat error:', err)
        send({ error: 'Something went wrong. Please try again.' })
      }

      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
