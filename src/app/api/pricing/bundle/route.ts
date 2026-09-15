import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { jobKey, resolveBundle } from '@/lib/pricing'

// Read-only: what would this job cost the user right now? Lets the CV Builder, cover
// letter and Apply flow show "included in your package" before the click, from the same
// ledger the charging routes use. Never deducts.
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const job = body?.job && typeof body.job === 'object' ? body.job : null
  const key = jobKey(job)
  const bundle = await resolveBundle(user.id, key)
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  const admin = !!user.email && adminEmails.includes(user.email.toLowerCase())
  return NextResponse.json({ key, bundle, admin })
}
