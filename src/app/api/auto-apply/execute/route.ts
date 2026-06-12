import { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import type { FieldMapping } from '@/lib/auto-apply-engine'

export const dynamic = 'force-dynamic'

const SSRF_RE = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|169\.254\.|::1$|fc[0-9a-f]{2}:|fd)/i

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
    const h = new URL(jobUrl).hostname
    if (SSRF_RE.test(h)) return new Response(JSON.stringify({ error: 'Invalid job URL' }), { status: 400 })
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid job URL' }), { status: 400 })
  }

  const railwayUrl = process.env.RAILWAY_BROWSER_URL
  const railwaySecret = process.env.BROWSER_SECRET

  if (railwayUrl && railwaySecret) {
    // Proxy the SSE stream from the Railway browser service
    const upstream = await fetch(`${railwayUrl}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${railwaySecret}`,
      },
      body: JSON.stringify({ jobUrl, mapping, cvText, coverLetter }),
    })

    if (!upstream.ok || !upstream.body) {
      const encoder = new TextEncoder()
      const errMsg = JSON.stringify({ type: 'error', message: 'Browser service unavailable' })
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${errMsg}\n\n`))
          controller.close()
        },
      })
      return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } })
    }

    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  }

  // Local fallback (dev only)
  if (process.env.NEXT_PUBLIC_AUTO_APPLY_ENABLED === 'true') {
    const { executeApply } = await import('@/lib/auto-apply-engine')
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
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    })
  }

  const encoder = new TextEncoder()
  const errMsg = JSON.stringify({ type: 'error', message: 'Auto Apply is not yet configured.' })
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${errMsg}\n\n`))
      controller.close()
    },
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } })
}
