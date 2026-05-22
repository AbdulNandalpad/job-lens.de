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

  const outForm = new FormData()
  outForm.append('file', file, file.name || 'audio.webm')
  outForm.append('model', 'whisper-1')

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
