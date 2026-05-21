import { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

// OpenAI TTS — nova voice sounds the most natural for assistant use
// Supports multilingual: English, German, Hindi all handled well by nova
const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { text } = await req.json()
  if (!text?.trim()) return new Response('No text', { status: 400 })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return new Response('TTS not configured', { status: 503 })

  try {
    const res = await fetch(OPENAI_TTS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text.slice(0, 4096),
        voice: 'nova',       // warm, natural, works well across EN/DE/HI
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
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('TTS route error:', err)
    return new Response('TTS failed', { status: 500 })
  }
}
