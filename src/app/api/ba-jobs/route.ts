import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

// Bundesagentur für Arbeit — Jobbörse API
// Official German employment agency job board. Covers Mittelstand companies
// that post exclusively here and don't appear on Adzuna/Indeed.
// Public frontend API — no private key required.

const BA_BASE = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs'
const BA_HEADERS = {
  'X-Auth-Key': 'jobboerse-jobsuche-ui',
  'Accept': 'application/json',
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q    = searchParams.get('q') || ''
  const wo   = searchParams.get('location') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)
  const size = 20

  if (!q.trim()) {
    return NextResponse.json({ jobs: [], total: 0 })
  }

  try {
    const params = new URLSearchParams({
      was:           q,
      angebotsart:   '1',          // 1 = Arbeitsstelle (jobs only, not training)
      page:          String(page - 1), // BA uses 0-based pages
      size:          String(size),
    })
    if (wo.trim()) params.set('wo', wo)

    const res  = await fetch(`${BA_BASE}?${params}`, { headers: BA_HEADERS, next: { revalidate: 300 } })
    const data = await res.json()

    if (!res.ok) {
      console.error('BA API error:', res.status, data)
      return NextResponse.json({ error: 'BA API error' }, { status: res.status })
    }

    const stellenangebote: Record<string, unknown>[] = data.stellenangebote || []
    const total: number = data.maxErgebnisse ?? 0

    const jobs = stellenangebote.map(j => {
      const hashId   = String(j.hashId || j.refnr || '')
      const arbeitsort = j.arbeitsort as Record<string, unknown> | undefined
      const city     = String(arbeitsort?.ort || '')
      const plz      = String(arbeitsort?.plz || '')

      // Employment type from arbeitszeitModelle array
      const modelle  = (j.arbeitszeitModelle as string[] | undefined) ?? []
      const empType  = modelle.includes('VOLLZEIT') ? 'Full-time'
                     : modelle.includes('TEILZEIT') ? 'Part-time'
                     : modelle.length > 0 ? modelle[0] : ''

      // Apply link — use externalUrl if present, otherwise BA detail page
      const applyLink = j.externeUrl
        ? String(j.externeUrl)
        : `https://www.arbeitsagentur.de/jobsuche/jobdetail/${hashId}`

      return {
        job_id:                    `ba_${hashId}`,
        job_title:                 String(j.titel || ''),
        employer_name:             String(j.arbeitgeber || ''),
        job_city:                  city || plz,
        job_country:               'DE',
        job_employment_type:       empType,
        job_description:           String(j.beruf || ''),   // short profession tag
        job_apply_link:            applyLink,
        job_posted_at_datetime_utc: String(j.aktuelleVeroeffentlichungsdatum || j.eintrittsdatum || ''),
        job_min_salary:            null,
        job_max_salary:            null,
        job_salary_currency:       'EUR',
        job_source:                'ba' as const,
      }
    })

    return NextResponse.json({ jobs, total })
  } catch (err) {
    console.error('BA jobs fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch Mittelstand jobs' }, { status: 500 })
  }
}
