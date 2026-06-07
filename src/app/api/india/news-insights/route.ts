import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours

export interface NewsArticle {
  title: string
  description: string | null
  url: string
  source: string
  publishedAt: string
  category: 'ai' | 'hiring' | 'market'
}

export interface NewsInsights {
  articles: NewsArticle[]
  fetchedAt: string
}

let cache: { data: NewsArticle[]; ts: number } | null = null

const QUERIES: { q: string; category: NewsArticle['category'] }[] = [
  { q: 'AI artificial intelligence jobs India employment impact',  category: 'ai' },
  { q: 'India tech layoffs hiring fired jobs workforce 2026',      category: 'hiring' },
  { q: 'India job market salary recruitment technology sector',    category: 'market' },
]

async function fetchQuery(q: string, category: NewsArticle['category']): Promise<NewsArticle[]> {
  const key = process.env.NEWS_API_KEY
  if (!key) return []
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&language=en&sortBy=publishedAt&pageSize=6`
  try {
    const res = await fetch(url, {
      headers: { 'X-Api-Key': key },
      next: { revalidate: 0 },
    })
    if (!res.ok) return []
    const data = await res.json()
    return ((data.articles as any[]) || [])
      .filter(a => a.title && a.title !== '[Removed]' && a.url && !a.url.includes('removed'))
      .slice(0, 5)
      .map(a => ({
        title: a.title as string,
        description: (a.description as string | null) ?? null,
        url: a.url as string,
        source: (a.source?.name as string) ?? 'News',
        publishedAt: a.publishedAt as string,
        category,
      }))
  } catch {
    return []
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json({ articles: cache.data, fetchedAt: new Date(cache.ts).toISOString() })
  }

  const results = await Promise.all(QUERIES.map(q => fetchQuery(q.q, q.category)))

  const seen = new Set<string>()
  const articles: NewsArticle[] = []
  for (const batch of results) {
    for (const a of batch) {
      if (!seen.has(a.url)) {
        seen.add(a.url)
        articles.push(a)
      }
    }
  }

  articles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

  cache = { data: articles, ts: Date.now() }
  return NextResponse.json({ articles, fetchedAt: new Date().toISOString() })
}
