import { NextRequest } from 'next/server'
import { executeApply, FieldMapping } from '@/lib/auto-apply-engine'
import { createServerSupabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { jobUrl, mapping, cvText, coverLetter } = (await req.json()) as {
    jobUrl: string
    mapping: FieldMapping[]
    cvText: string
    coverLetter: string
  }

  if (!jobUrl || !jobUrl.startsWith('https://')) {
    return new Response(JSON.stringify({ error: 'Invalid job URL' }), { status: 400 })
  }
  try {
    const parsed = new URL(jobUrl)
    const h = parsed.hostname
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|169\.254\.|::1$|fc[0-9a-f]{2}:|fd)/i.test(h)) {
      return new Response(JSON.stringify({ error: 'Invalid job URL' }), { status: 400 })
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid job URL' }), { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))

      try {
        for await (const event of executeApply(jobUrl, mapping, cvText ?? '', coverLetter ?? '')) {
          send(event)
        }
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : String(err) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}