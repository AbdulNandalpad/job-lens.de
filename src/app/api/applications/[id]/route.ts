import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'

const VALID_STATUSES = new Set(['saved', 'applied', 'interview', 'offer', 'rejected'])

// PATCH — update status or notes on an application the user owns
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (typeof body.status === 'string') {
    if (!VALID_STATUSES.has(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    patch.status = body.status
  }
  if (typeof body.notes === 'string')    patch.notes    = body.notes.trim().slice(0, 1000)
  if (typeof body.company === 'string')  patch.company  = body.company.trim().slice(0, 200)
  if (typeof body.role === 'string')     patch.role     = body.role.trim().slice(0, 200)
  if (typeof body.location === 'string') patch.location = body.location.trim().slice(0, 200)

  const rawUrl = typeof body.job_url === 'string' ? body.job_url.trim() : undefined
  if (rawUrl !== undefined) {
    patch.job_url = rawUrl.startsWith('https://') ? rawUrl.slice(0, 500) : null
  }

  const admin = createAdminSupabase()

  // Verify ownership before update — never trust the id alone
  const { data: existing } = await admin
    .from('applications')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await admin
    .from('applications')
    .update(patch)
    .eq('id', id)
    .select('id, company, role, status, location, job_url, notes, applied_at, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ application: data })
}

// DELETE — remove an application the user owns
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminSupabase()

  // Verify ownership before delete
  const { data: existing } = await admin
    .from('applications')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await admin
    .from('applications')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
