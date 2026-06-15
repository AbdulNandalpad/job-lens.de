import { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

function sseError(message: string): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message })}\n\n`))
      controller.close()
    },
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const body = await req.json() as { sessionId?: string }
  const { sessionId } = body

  if (!sessionId || typeof sessionId !== 'string' || sessionId.length < 10) {
    return sseError('Invalid session. Please go back and re-fill the form.')
  }

  const railwayUrl    = process.env.RAILWAY_BROWSER_URL
  const railwaySecret = process.env.BROWSER_SECRET

  if (railwayUrl && railwaySecret) {
    const upstream = await fetch(`${railwayUrl}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${railwaySecret}` },
      body: JSON.stringify({ sessionId }),
    })
    if (!upstream.ok || !upstream.body) return sseError('Browser service unavailable')
    return new Response(upstream.body, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    })
  }

  // Local dev fallback
  if (process.env.NEXT_PUBLIC_AUTO_APPLY_ENABLED === 'true') {
    const { submitApplyBySession } = await import('@/lib/auto-apply-engine')
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        try {
          for await (const event of submitApplyBySession(sessionId)) send(event)
        } catch (err) {
          send({ type: 'error', message: String(err) })
        } finally {
          controller.close()
        }
      },
    })
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } })
  }

  return sseError('Auto Apply is not configured.')
}
