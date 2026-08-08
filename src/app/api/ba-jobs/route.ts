import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

// Bundesagentur für Arbeit — Jobbörse API
// Official German employment agency job board. Covers Mittelstand companies
// that post exclusively here and don't appear on Adzuna/Indeed.
//
// v6 endpoint + `X-API-Key: jobboerse-jobsuche` (public frontend key).
// The previous v4 endpoint with `X-Auth-Key: jobboerse-jobsuche-ui` started
// returning 403 (verified 2026-08-08) — if BA rotates keys again, test with:
//   curl -H "X-API-Key: jobboerse-jobsuche" "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs?was=test&size=1&page=1"

const BA_BASE = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs'
const BA_HEADERS = {
  'X-API-Key': 'jobboerse-jobsuche',
  'Accept': 'application/json',
}

interface BaLocation { adresse?: { ort?: string; plz?: string } }

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
      was:         q,
      angebotsart: '1',            // 1 = Arbeitsstelle (jobs only, not training)
      page:        String(page),   // v6 pages are 1-based
      size:        String(size),
    })
    if (wo.trim()) params.set('wo', wo)

    const res  = await fetch(`${BA_BASE}?${params}`, { headers: BA_HEADERS, next: { revalidate: 300 } })
    const data = await res.json()

    if (!res.ok) {
      console.error('BA API error:', res.status, data)
      return NextResponse.json({ error: 'BA API error' }, { status: res.status })
    }

    // v6 returns `stellenangebote` on some parameter combinations and
    // `ergebnisliste` on others — accept both, with both field namings.
    const raw: Record<string, unknown>[] = data.stellenangebote || data.ergebnisliste || []
    const total: number = data.maxErgebnisse ?? 0

    const jobs = raw.map(j => {
      const refnr = String(j.refnr || j.referenznummer || j.hashId || '')

      const arbeitsort = j.arbeitsort as { ort?: string; plz?: string } | undefined
      const lokationen = (j.stellenlokationen as BaLocation[] | undefined) ?? []
      const city = String(arbeitsort?.ort || lokationen[0]?.adresse?.ort || '')
      const plz  = String(arbeitsort?.plz || lokationen[0]?.adresse?.plz || '')

      const empType = j.arbeitszeitVollzeit === true ? 'Full-time'
                    : j.arbeitszeitVollzeit === false ? 'Part-time'
                    : ''

      const externalUrl = j.externeUrl || j.externeURL
      const applyLink = externalUrl
        ? String(externalUrl)
        : `https://www.arbeitsagentur.de/jobsuche/jobdetail/${encodeURIComponent(refnr)}`

      return {
        job_id:                    `ba_${refnr}`,
        job_title:                 String(j.titel || j.stellenangebotsTitel || ''),
        employer_name:             String(j.arbeitgeber || j.firma || ''),
        job_city:                  city || plz,
        job_country:               'DE',
        job_employment_type:       empType,
        job_description:           String(j.beruf || j.hauptberuf || ''),   // short profession tag
        job_apply_link:            applyLink,
        job_posted_at_datetime_utc: String(j.aktuelleVeroeffentlichungsdatum || j.datumErsteVeroeffentlichung || j.eintrittsdatum || ''),
        job_min_salary:            null,
        job_max_salary:            null,
        job_salary_currency:       'EUR',
        job_source:                'ba' as const,
      }
    })

    // Sort newest-first — BA's jobsuche-service API has no documented sort
    // param (unlike Adzuna's), so this is done client-side; bad/missing
    // dates sink to the end rather than breaking the sort.
    const parseTs = (s: string) => { const t = new Date(s).getTime(); return Number.isFinite(t) ? t : 0 }
    jobs.sort((a, b) => parseTs(b.job_posted_at_datetime_utc) - parseTs(a.job_posted_at_datetime_utc))

    return NextResponse.json({ jobs, total })
  } catch (err) {
    console.error('BA jobs fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch Mittelstand jobs' }, { status: 500 })
  }
}
