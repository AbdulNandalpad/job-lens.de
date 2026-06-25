import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

const SSRF_RE = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|169\.254\.|::1$|fc[0-9a-f]{2}:|fd)/i

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
  if (!url.startsWith('https://')) return NextResponse.json({ error: 'URL must use HTTPS' }, { status: 400 })
  try {
    const h = new URL(url).hostname
    if (SSRF_RE.test(h)) return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  const text = await fetchJobText(url.trim())
  if (!text) return NextResponse.json({ blocked: true }, { status: 200 })

  // Detect blocked/CAPTCHA pages — these contain no real JD content
  const lower = text.toLowerCase()
  const blockSignals = [
    'zugriff verweigert', 'access denied', 'are you a robot', 'are you human',
    'captcha', 'cloudflare', 'unusual traffic', 'suspicious activity',
    'select your country', 'verdächtiges verhalten', 'ungewöhnliches verhalten',
    'melde dich an um fortzufahren', 'sign in to continue', 'enable javascript',
    'please enable cookies', 'just a moment', 'checking your browser',
  ]
  const isBlocked = blockSignals.some(s => lower.includes(s))
  if (isBlocked) return NextResponse.json({ blocked: true }, { status: 200 })

  return NextResponse.json({ text })
}
