import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

const APP_ID = process.env.ADZUNA_APP_ID!
const APP_KEY = process.env.ADZUNA_APP_KEY!

// Cache result in module memory for 4 hours
let cache: { data: MarketSnapshot; ts: number } | null = null
const CACHE_TTL = 4 * 60 * 60 * 1000

export interface MarketSnapshot {
  categories: { label: string; count: number; color: string }[]
  trendingRoles: { title: string; count: number }[]
  topCities: { city: string; count: number }[]
  fetchedAt: string
}

async function fetchCount(what: string): Promise<number> {
  try {
    const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${APP_ID}&app_key=${APP_KEY}&results_per_page=1&what=${encodeURIComponent(what)}&content-type=application/json`
    const res = await fetch(url, { next: { revalidate: 14400 } })
    if (!res.ok) return 0
    const data = await res.json()
    return data.count ?? 0
  } catch {
    return 0
  }
}

async function fetchTopJobs(what: string): Promise<{ title: string; count: number }[]> {
  try {
    const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${APP_ID}&app_key=${APP_KEY}&results_per_page=10&what=${encodeURIComponent(what)}&sort_by=relevance&content-type=application/json`
    const res = await fetch(url, { next: { revalidate: 14400 } })
    if (!res.ok) return []
    const data = await res.json()
    // Collect unique titles and count occurrences
    const titleMap: Record<string, number> = {}
    for (const job of data.results ?? []) {
      const title = job.title?.split(' - ')[0]?.split(' at ')[0]?.trim()
      if (title) titleMap[title] = (titleMap[title] ?? 0) + 1
    }
    return Object.entries(titleMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([title, count]) => ({ title, count }))
  } catch {
    return []
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Serve from cache if fresh
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data)
  }

  // Parallel Adzuna fetches
  const [itCount, engineeringCount, financeCount, salesCount, healthCount, hrCount, roles, cityBengaluru, cityHyderabad, cityPune, cityMumbai, cityDelhi] = await Promise.all([
    fetchCount('software developer OR software engineer OR IT'),
    fetchCount('mechanical OR civil OR electrical engineer'),
    fetchCount('finance OR accounting OR chartered accountant'),
    fetchCount('sales OR business development OR marketing'),
    fetchCount('healthcare OR nurse OR doctor OR medical'),
    fetchCount('HR OR human resources OR recruiter'),
    fetchTopJobs('software engineer OR data engineer OR product manager OR devops OR machine learning'),
    fetchCount('bangalore OR bengaluru'),
    fetchCount('hyderabad'),
    fetchCount('pune'),
    fetchCount('mumbai'),
    fetchCount('delhi OR noida OR gurgaon'),
  ])

  const snapshot: MarketSnapshot = {
    categories: [
      { label: 'IT & Software', count: itCount, color: '#FF9933' },
      { label: 'Engineering', count: engineeringCount, color: '#378ADD' },
      { label: 'Finance', count: financeCount, color: '#138808' },
      { label: 'Sales & Marketing', count: salesCount, color: '#a855f7' },
      { label: 'Healthcare', count: healthCount, color: '#e11d48' },
      { label: 'HR & Recruitment', count: hrCount, color: '#0891b2' },
    ].sort((a, b) => b.count - a.count),
    trendingRoles: roles.length > 0 ? roles : [
      { title: 'Software Engineer', count: 1 },
      { title: 'Data Engineer', count: 1 },
      { title: 'Product Manager', count: 1 },
      { title: 'DevOps Engineer', count: 1 },
      { title: 'ML Engineer', count: 1 },
      { title: 'Business Analyst', count: 1 },
    ],
    topCities: [
      { city: 'Bengaluru', count: cityBengaluru },
      { city: 'Hyderabad', count: cityHyderabad },
      { city: 'Pune', count: cityPune },
      { city: 'Mumbai', count: cityMumbai },
      { city: 'Delhi NCR', count: cityDelhi },
    ].sort((a, b) => b.count - a.count),
    fetchedAt: new Date().toISOString(),
  }

  cache = { data: snapshot, ts: Date.now() }
  return NextResponse.json(snapshot)
}
