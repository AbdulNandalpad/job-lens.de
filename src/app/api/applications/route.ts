import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'

const VALID_STATUSES = new Set(['saved', 'applied', 'interview', 'offer', 'rejected'])

// GET — list all applications for current user
export async function GET(_req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminSupabase()
  const { data, error } = await admin
    .from('applications')
    .select('id, company, role, status, location, job_url, notes, applied_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ applications: data ?? [] })
}

// POST — create a new application
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const company   = typeof body.company  === 'string' ? body.company.trim().slice(0, 200)  : ''
  const role      = typeof body.role     === 'string' ? body.role.trim().slice(0, 200)     : ''
  const status    = typeof body.status   === 'string' && VALID_STATUSES.has(body.status) ? body.status : 'applied'
  const location  = typeof body.location === 'string' ? body.location.trim().slice(0, 200) : null
  const notes     = typeof body.notes    === 'string' ? body.notes.trim().slice(0, 1000)   : null
  const rawAppliedAt = typeof body.applied_at === 'string' ? body.applied_at.slice(0, 10) : ''
  const applied_at = rawAppliedAt && !isNaN(new Date(rawAppliedAt).getTime())
    ? rawAppliedAt
    : new Date().toISOString().slice(0, 10)

  // Only allow https:// job URLs
  const rawUrl = typeof body.job_url === 'string' ? body.job_url.trim() : ''
  const job_url = rawUrl.startsWith('https://') ? rawUrl.slice(0, 500) : null

  if (!company || !role) {
    return NextResponse.json({ error: 'company and role are required' }, { status: 400 })
  }

  const admin = createAdminSupabase()
  const { data, error } = await admin
    .from('applications')
    .insert({ user_id: user.id, company, role, status, location, job_url, notes, applied_at })
    .select('id, company, role, status, location, job_url, notes, applied_at, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ application: data })
}
