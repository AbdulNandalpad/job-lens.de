import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'STT not configured' }, { status: 503 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No audio file' }, { status: 400 })

  // Reject oversized files — OpenAI Whisper limit is 25MB, we cap at 10MB
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Audio file too large' }, { status: 413 })
  }

  // Only accept known audio MIME types that Whisper supports
  const ALLOWED_TYPES = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/flac', 'audio/x-m4a']
  const mimeBase = (file.type || '').split(';')[0].trim().toLowerCase()
  if (mimeBase && !ALLOWED_TYPES.some(t => mimeBase.startsWith(t.split('/')[0] + '/audio') || mimeBase === t)) {
    return NextResponse.json({ error: 'Invalid audio format' }, { status: 415 })
  }

  // Sanitise language — only allow 2-letter ISO codes
  const rawLang = form.get('language') as string | null
  const language = rawLang && /^[a-z]{2}$/.test(rawLang) ? rawLang : null

  const outForm = new FormData()
  outForm.append('file', file, file.name || 'audio.webm')
  outForm.append('model', 'whisper-1')
  if (language) outForm.append('language', language)

  try {
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: outForm,
    })

    if (!res.ok) {
      console.error('[STT]', res.status, await res.text())
      return NextResponse.json({ error: 'Transcription failed' }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json({ text: data.text || '' })
  } catch (err) {
    console.error('[STT]', err)
    return NextResponse.json({ error: 'Transcription error' }, { status: 500 })
  }
}
