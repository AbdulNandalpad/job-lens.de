import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const location = searchParams.get('location') || ''

  // JSearch works best with "role in location" natural language query
  const query = location ? `${q} in ${location}` : q

  try {
    const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&num_pages=2&page=1&date_posted=all`

    console.log('JSearch URL:', url)

    const res = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY!,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
      },
    })

    const data = await res.json()

    console.log('JSearch status:', res.status)
    console.log('JSearch count:', data.data?.length ?? 0)

    if (!res.ok) {
      return NextResponse.json({ error: data.message || 'RapidAPI error' }, { status: res.status })
    }

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
