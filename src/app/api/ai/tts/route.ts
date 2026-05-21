import { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

const GOOGLE_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize'

// Google Cloud Neural2 voices — natural, warm, multilingual
const VOICE_MAP: Record<string, { languageCode: string; name: string }> = {
  'hi':    { languageCode: 'hi-IN', name: 'hi-IN-Neural2-A' },  // Hindi female
  'de':    { languageCode: 'de-DE', name: 'de-DE-Neural2-F' },  // German female
  'en-IN': { languageCode: 'en-IN', name: 'en-IN-Neural2-A' },  // English (India) female
  'en':    { languageCode: 'en-US', name: 'en-US-Neural2-F' },  // English (US) female
}

function pickVoice(lang: string) {
  if (lang.startsWith('hi'))   return VOICE_MAP['hi']
  if (lang.startsWith('de'))   return VOICE_MAP['de']
  if (lang === 'en-IN')        return VOICE_MAP['en-IN']
  return VOICE_MAP['en']
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { text, lang = 'en' } = await req.json()
  if (!text?.trim()) return new Response('No text', { status: 400 })

  const apiKey = process.env.GOOGLE_TTS_API_KEY
  if (!apiKey) return new Response('TTS not configured', { status: 503 })

  const voice = pickVoice(lang)

  try {
    const res = await fetch(`${GOOGLE_TTS_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: text.slice(0, 4096) },
        voice,
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 1.0,
          pitch: 0.0,
          effectsProfileId: ['headphone-class-device'],
        },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Google TTS error:', err)
      return new Response('TTS failed', { status: 502 })
    }

    const data = await res.json() as { audioContent: string }
    const audio = Buffer.from(data.audioContent, 'base64')

    return new Response(audio, {
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
