import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase, isUserRateLimited } from '@/lib/supabase-server'

// POST /api/feedback { feature, rating, prompt?, output? }
// Captures a thumbs up/down on an AI output for the future fine-tuning dataset.
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (await isUserRateLimited(user.id, 'feedback', 30)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 })
  }

  const body = await req.json().catch(() => ({}))
  const feature = typeof body.feature === 'string' ? body.feature.slice(0, 64) : ''
  const rating  = body.rating === 1 || body.rating === -1 ? body.rating : 0
  if (!feature || rating === 0) {
    return NextResponse.json({ error: 'feature and rating (1 or -1) required' }, { status: 400 })
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.slice(0, 8000) : null
  const output = typeof body.output === 'string' ? body.output.slice(0, 12000) : null

  const admin = createAdminSupabase()
  const { error } = await admin.from('training_feedback').insert({
    user_id: user.id, feature, prompt, output, rating,
  })
  if (error) {
    console.error('[feedback] insert error:', error.message)
    return NextResponse.json({ error: 'Could not save feedback' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
