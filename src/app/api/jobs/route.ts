import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

// Allowlist of Adzuna-supported country codes we expose
const ALLOWED_COUNTRIES = new Set(['de', 'at', 'ch', 'gb', 'in', 'us', 'au', 'ca', 'fr', 'nl', 'pl', 'sg', 'nz', 'za', 'br', 'ru'])

export async function GET(req: NextRequest) {
  // Auth required — protects Adzuna API quota from anonymous abuse
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const location = searchParams.get('location') || ''
  const countryRaw = searchParams.get('country') || 'de'
  const maxDaysOld = searchParams.get('max_days_old') || ''
  const pageRaw = parseInt(searchParams.get('page') || '1', 10)
  const page = String(Number.isFinite(pageRaw) && pageRaw > 0 ? Math.min(pageRaw, 50) : 1)

  // Validate country against allowlist to prevent unintended Adzuna endpoint usage
  const country = ALLOWED_COUNTRIES.has(countryRaw.toLowerCase()) ? countryRaw.toLowerCase() : 'de'

  const appId = process.env.ADZUNA_APP_ID!
  const appKey = process.env.ADZUNA_APP_KEY!

  const city = location.split(',')[0].trim()

  try {
    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      results_per_page: '20',
      what: q,
      where: city,
    })
    if (maxDaysOld) params.set('max_days_old', maxDaysOld)

    const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?${params}`

    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data.exception || 'Adzuna error' }, { status: res.status })
    }

    const jobs = (data.results || []).map((j: Record<string, unknown>) => {
      const loc = j.location as Record<string, unknown> | undefined
      const areas = loc?.area as string[] | undefined
      const company = j.company as Record<string, unknown> | undefined
      const cat = j.category as Record<string, unknown> | undefined

      return {
        job_id: String(j.id),
        job_title: String(j.title || ''),
        employer_name: String(company?.display_name || ''),
        job_city: areas?.[areas.length - 1] || city,
        job_country: country.toUpperCase(),
        job_employment_type:
          j.contract_time === 'full_time' ? 'Full-time' :
          j.contract_time === 'part_time' ? 'Part-time' :
          String(j.contract_time || ''),
        job_description: String(j.description || ''),
        job_apply_link: String(j.redirect_url || ''),
        job_posted_at_datetime_utc: String(j.created || ''),
        job_min_salary: (j.salary_min as number) || null,
        job_max_salary: (j.salary_max as number) || null,
        job_salary_currency: country === 'ch' ? 'CHF' : country === 'gb' ? 'GBP' : country === 'in' ? 'INR' : 'EUR',
        job_category: String((cat as Record<string, unknown>)?.label || ''),
      }
    })

    return NextResponse.json({ jobs })
  } catch (err) {
    console.error('Adzuna API error:', err)
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}
