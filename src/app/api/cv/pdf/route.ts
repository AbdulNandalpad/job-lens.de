import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import { pdf, DocumentProps } from '@react-pdf/renderer'
import { CVPdfDocument, ensureCvFonts, FALLBACK_FONTS } from '@/lib/CVPdf'
import { createServerSupabase } from '@/lib/supabase-server'
import { c } from '@/lib/theme'

export const maxDuration = 60

function resolveFontBase(req: NextRequest): string | null {
  try {
    return new URL(req.url).origin
  } catch {
    return process.env.NEXT_PUBLIC_APP_URL || null
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { cv, ac, template, photo } = await req.json()
  if (!cv) return NextResponse.json({ error: 'cv required' }, { status: 400 })

  const MAX_PHOTO_B64 = 3 * 1024 * 1024
  if (photo && typeof photo === 'string') {
    if (photo.length > MAX_PHOTO_B64) {
      return NextResponse.json({ error: 'Photo too large. Please use an image under 2 MB.' }, { status: 413 })
    }
    const allowedMime = ['data:image/jpeg;base64,', 'data:image/png;base64,', 'data:image/webp;base64,']
    if (!allowedMime.some(prefix => photo.startsWith(prefix))) {
      return NextResponse.json({ error: 'Invalid photo format. Use JPEG, PNG or WebP.' }, { status: 415 })
    }
  }

  const fonts = await ensureCvFonts(resolveFontBase(req))
  const props = { cv, ac: ac || c.accent, template: template || 'minimal', photo }

  let uint8: Uint8Array
  try {
    uint8 = await render(props, fonts)
  } catch (err) {
    if (fonts === FALLBACK_FONTS) throw err
    // A font that preloaded fine can still fail at embed time; the PDF must never 500 because of it.
    console.error('[cv/pdf] render with brand fonts failed, retrying with Helvetica:', err)
    uint8 = await render(props, FALLBACK_FONTS)
  }

  const safeName = (cv.name || 'JobLens').replace(/[^a-zA-Z0-9]/g, '_')

  return new NextResponse(Buffer.from(uint8), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="CV_${safeName}.pdf"`,
    },
  })
}

async function render(props: Omit<Parameters<typeof CVPdfDocument>[0], 'fonts'>, fonts: Parameters<typeof CVPdfDocument>[0]['fonts']) {
  const element = React.createElement(CVPdfDocument, { ...props, fonts }) as React.ReactElement<DocumentProps>
  // toBuffer() is mistyped as ReadableStream in @react-pdf types.
  // toBlob() is correctly typed and returns a real Blob in Node 18+.
  const blob = await pdf(element).toBlob()
  return new Uint8Array(await blob.arrayBuffer())
}
