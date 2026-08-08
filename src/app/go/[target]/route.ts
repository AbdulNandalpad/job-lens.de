import { NextRequest, NextResponse } from 'next/server'

// Geo-aware deep links for the public /guides pages. Static pages can't know
// the visitor's market, so CTAs point here and this route picks the right
// market path from the same geo header the middleware uses. Unauthenticated
// visitors are then bounced by the middleware to the correctly branded login
// (/login vs /in/login) with next= preserved; logged-in users go straight in.
export const dynamic = 'force-dynamic'

const TARGETS: Record<string, { de: string; in: string }> = {
  visa: { de: '/app/visa', in: '/in/visa' },
  jobs: { de: '/app/jobs', in: '/in/jobs' },
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ target: string }> }) {
  const { target } = await params
  const dest = TARGETS[target] ?? { de: '/app', in: '/in' }
  const country = req.headers.get('x-vercel-ip-country') ?? ''
  const url = req.nextUrl.clone()
  url.pathname = country === 'IN' ? dest.in : dest.de
  url.search = ''
  return NextResponse.redirect(url)
}
