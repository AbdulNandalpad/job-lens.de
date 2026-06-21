import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim()
}

async function fetchJobText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobLens/1.0; +https://job-lens.de)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    })
    clearTimeout(timeout)
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) return null
    const html = await res.text()
    const text = stripHtml(html)
    return text.length > 200 ? text.slice(0, 12000) : null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await req.json()
  if (!url?.trim()) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  const text = await fetchJobText(url.trim())
  if (!text) return NextResponse.json({ blocked: true }, { status: 200 })

  return NextResponse.json({ text })
}
