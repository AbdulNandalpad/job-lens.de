import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import dns from 'node:dns/promises'

const SSRF_RE = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|169\.254\.|::1$|fc[0-9a-f]{2}:|fd)/i

// Blocks private/loopback/link-local/reserved IPv4 and IPv6 ranges (incl. cloud metadata 169.254.169.254)
function isPrivateIp(ip: string): boolean {
  const v4 = ip.startsWith('::ffff:') ? ip.slice(7) : ip
  const v4Match = v4.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/)
  if (v4Match) {
    const a = Number(v4Match[1])
    const b = Number(v4Match[2])
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0)) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    )
  }
  const lower = ip.toLowerCase()
  return lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') ||
    lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')
}

// Re-resolves DNS at check time so a hostname can't pass the literal blocklist while
// pointing (now or via rebinding) at an internal/metadata IP.
async function isHostnameSafe(hostname: string): Promise<boolean> {
  if (SSRF_RE.test(hostname)) return false
  try {
    const addresses = await dns.lookup(hostname, { all: true })
    return addresses.length > 0 && addresses.every(({ address }) => !isPrivateIp(address))
  } catch {
    return false
  }
}

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
    let currentUrl = url
    const MAX_REDIRECTS = 5
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await fetch(currentUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; JobLens/1.0; +https://job-lens.de)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        redirect: 'manual',
      })

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location')
        if (!location) break
        // Resolve relative redirect
        const next = new URL(location, currentUrl).href
        // Re-validate the redirect destination against SSRF blocklist
        if (!next.startsWith('https://')) break
        const hostname = new URL(next).hostname
        if (!(await isHostnameSafe(hostname))) break
        currentUrl = next
        continue
      }

      clearTimeout(timeout)
      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.includes('text/html')) return null
      const html = await res.text()
      const text = stripHtml(html)
      return text.length > 200 ? text.slice(0, 12000) : null
    }

    clearTimeout(timeout)
    return null
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
    if (!(await isHostnameSafe(h))) return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
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
