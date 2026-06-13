import { NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminSupabase()

    const { data: cases } = await admin
      .from('job_cases')
      .select('id, slug, job_title, company_name, match_score, status, view_count, created_at, expires_at')
      .eq('user_id', user.id)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })

    const now = Date.now()
    const rows = (cases ?? []).map(jc => {
      const expiresMs  = new Date(jc.expires_at).getTime()
      const daysLeft   = Math.max(0, Math.round((expiresMs - now) / 86400000))
      const status     = jc.status === 'expired' || expiresMs < now ? 'expired'
                       : jc.view_count > 0 ? 'viewed'
                       : 'active'
      return {
        id:           jc.id,
        slug:         jc.slug,
        jobTitle:     jc.job_title,
        company:      jc.company_name,
        matchScore:   jc.match_score ?? 0,
        status,
        viewCount:    jc.view_count ?? 0,
        createdAt:    new Date(jc.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        daysLeft,
      }
    })

    // Fetch viewer domains for cases that have views
    const viewedIds = rows.filter(r => r.viewCount > 0).map(r => r.id)
    let domainMap: Record<string, string[]> = {}
    if (viewedIds.length > 0) {
      const { data: views } = await admin
        .from('case_views')
        .select('job_case_id, recruiter_domain')
        .in('job_case_id', viewedIds)
        .not('viewed_at', 'is', null)
      for (const v of views ?? []) {
        if (!domainMap[v.job_case_id]) domainMap[v.job_case_id] = []
        if (v.recruiter_domain && !domainMap[v.job_case_id].includes(v.recruiter_domain)) {
          domainMap[v.job_case_id].push(v.recruiter_domain)
        }
      }
    }

    return NextResponse.json({
      cases: rows.map(r => ({ ...r, viewerDomains: domainMap[r.id] ?? [] })),
    })
  } catch (err) {
    console.error('/api/job-case/list error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
