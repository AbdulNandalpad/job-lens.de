import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // Use Claude to extract text from PDF
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
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
      return NextResponse.json({ error: 'Failed to extract PDF text' }, { status: 500 })
    }

    const text = data.content?.[0]?.text?.trim() || ''

    if (!text || text.length < 50) {
      return NextResponse.json({ error: 'Could not extract text. Please paste your CV text manually.' }, { status: 422 })
    }

    return NextResponse.json({ text })
  } catch (err) {
    console.error('PDF extract error:', err)
    return NextResponse.json({ error: 'Failed to parse PDF. Please paste your CV text manually.' }, { status: 500 })
  }
}
