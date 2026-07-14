import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'
import { createServerSupabase, isUserRateLimited } from '@/lib/supabase-server'

const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  // Auth required — this route calls the Anthropic API for PDF extraction
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (await isUserRateLimited(user.id, 'extract_pdf', 20)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10 MB.' }, { status: 413 })
    }

    const name = file.name.toLowerCase()
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Magic-byte validation — reject files whose content doesn't match the declared type
    const isPdf  = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46 // %PDF
    const isZip  = buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04 // PK (DOCX/ZIP)
    const isText = !isPdf && !isZip // plain text has no fixed magic bytes

    if ((name.endsWith('.pdf')) && !isPdf) {
      return NextResponse.json({ error: 'File does not appear to be a valid PDF.' }, { status: 422 })
    }
    if ((name.endsWith('.docx') || name.endsWith('.doc')) && !isZip) {
      return NextResponse.json({ error: 'File does not appear to be a valid Word document.' }, { status: 422 })
    }

    // --- Plain text ---
    if (name.endsWith('.txt') || file.type === 'text/plain') {
      const text = buffer.toString('utf-8').trim()
      if (text.length < 50) {
        return NextResponse.json({ error: 'File appears empty. Please paste your CV text manually.' }, { status: 422 })
      }
      return NextResponse.json({ text })
    }

    // --- DOCX ---
    if (name.endsWith('.docx') || name.endsWith('.doc') ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword') {
      const result = await mammoth.extractRawText({ buffer })
      const text = result.value.trim()
      if (!text || text.length < 50) {
        return NextResponse.json({ error: 'Could not extract text from DOCX. Please paste your CV text manually.' }, { status: 422 })
      }
      return NextResponse.json({ text })
    }

    // --- PDF — send to Claude document API ---
    const base64 = buffer.toString('base64')
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        // 4000 was truncating longer (2+ page) CVs mid-extraction, which then fed
        // a half-CV into every downstream feature (tailoring, career scan, etc).
        max_tokens: 8000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64,
                },
              },
              {
                type: 'text',
                text: 'Extract all text content from this CV/resume document. Return the raw text only, preserving structure. No commentary, no markdown, just the extracted text.',
              },
            ],
          },
        ],
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Claude PDF extract error:', data)
      return NextResponse.json({ error: 'Failed to extract PDF text. Please paste your CV text manually.' }, { status: 500 })
    }

    const text = data.content?.[0]?.text?.trim() || ''

    if (!text || text.length < 50) {
      return NextResponse.json({ error: 'Could not extract text. Please paste your CV text manually.' }, { status: 422 })
    }

    return NextResponse.json({ text })
  } catch (err) {
    console.error('File extract error:', err)
    return NextResponse.json({ error: 'Failed to parse file. Please paste your CV text manually.' }, { status: 500 })
  }
}
