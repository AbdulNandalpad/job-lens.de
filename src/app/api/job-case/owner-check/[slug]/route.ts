/**
 * GET /api/job-case/owner-check/[slug]
 * Returns { owner: true } if the authenticated user owns this job case.
 * Used by the public case page to bypass the email gate for the candidate's
 * own preview, without exposing any case data.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ owner: false })

    const { slug } = await params
    const admin = createAdminSupabase()

    const { data } = await admin
      .from('job_cases')
      .select('id')
      .eq('slug', slug)
      .eq('user_id', user.id)
      .maybeSingle()

    return NextResponse.json({ owner: !!data })
  } catch {
    return NextResponse.json({ owner: false })
  }
}
