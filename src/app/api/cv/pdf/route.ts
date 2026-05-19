import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import { pdf, DocumentProps } from '@react-pdf/renderer'
import { CVPdfDocument } from '@/lib/CVPdf'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { cv, ac, photo } = await req.json()
  if (!cv) return NextResponse.json({ error: 'cv required' }, { status: 400 })

  const element = React.createElement(
    CVPdfDocument, { cv, ac: ac || '#378ADD', photo }
  ) as React.ReactElement<DocumentProps>

  // @react-pdf types wrongly declare toBuffer() as ReadableStream; at runtime it is a Node.js Buffer.
  // Collect via toStream() to stay type-safe and avoid the mistyped overload.
  const stream = pdf(element).toStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream as unknown as AsyncIterable<Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const uint8 = Buffer.concat(chunks)

  const safeName = (cv.name || 'JobLens').replace(/[^a-zA-Z0-9]/g, '_')

  return new NextResponse(uint8, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="CV_${safeName}.pdf"`,
    },
  })
}
