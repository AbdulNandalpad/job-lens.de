import { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { text, market } = await req.json()
  if (!text?.trim()) return new Response('No text', { status: 400 })
  if (typeof text !== 'string' || text.length > 1000) return new Response('Text too long', { status: 400 })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return new Response('TTS not configured', { status: 503 })

  // shimmer suits Indian English better; nova for DACH
  const voice = market === 'in' ? 'shimmer' : 'nova'

  try {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text.slice(0, 4096),
        voice,
        response_format: 'mp3',
        speed: 1.0,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('OpenAI TTS error:', err)
      return new Response('TTS failed', { status: 502 })
    }

    return new Response(res.body, {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    console.error('TTS route error:', err)
    return new Response('TTS failed', { status: 500 })
  }
}
