import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const location = searchParams.get('location') || ''
  const type = searchParams.get('type') || 'fulltime'

  try {
    const res = await fetch(
      `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(q + ' ' + location)}&num_pages=1&employment_types=${type.toUpperCase()}`,
      {
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY!,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
        },
      }
    )
    const data = await res.json()
    const jobs = (data.data || []).map((j: Record<string, unknown>) => ({
      job_id: j.job_id,
      job_title: j.job_title,
      employer_name: j.employer_name,
      job_city: j.job_city,
      job_country: j.job_country,
      job_employment_type: j.job_employment_type,
      job_description: j.job_description,
      job_apply_link: j.job_apply_link,
      job_posted_at_datetime_utc: j.job_posted_at_datetime_utc,
      job_min_salary: j.job_min_salary,
      job_max_salary: j.job_max_salary,
      job_salary_currency: j.job_salary_currency,
    }))
    return NextResponse.json({ jobs })
  } catch (err) {
    console.error('Jobs API error:', err)
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}