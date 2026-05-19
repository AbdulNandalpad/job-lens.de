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

  // toBuffer() is mistyped as ReadableStream in @react-pdf types.
  // toBlob() is correctly typed and returns a real Blob in Node 18+.
  const blob = await pdf(element).toBlob()
  const uint8 = new Uint8Array(await blob.arrayBuffer())

  const safeName = (cv.name || 'JobLens').replace(/[^a-zA-Z0-9]/g, '_')

  return new NextResponse(uint8, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="CV_${safeName}.pdf"`,
    },
  })
}
