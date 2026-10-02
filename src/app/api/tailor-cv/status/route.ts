import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { createServerSupabase, createAdminSupabase, checkAndDeductCredits } from '@/lib/supabase-server'
import { resolveBundle } from '@/lib/pricing'
import { saveMemoriesFromInteraction } from '@/lib/memory'

export const maxDuration = 15

interface RailwayJob { status: 'pending' | 'done' | 'error'; cv?: string; error?: string }
interface JobRow {
  id: string; user_id: string; kind: string; cost: number; action: string
  market: 'eu' | 'in'; job_key: string | null; charged: boolean
  result: { cv: string; creditsRemaining: number; pricing: unknown } | null
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const jobId = req.nextUrl.searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ error: 'jobId is required' }, { status: 400 })

  const admin = createAdminSupabase()
  const { data: row } = await admin.from('ai_generation_jobs').select('*').eq('id', jobId).eq('user_id', user.id).single()
  if (!row) return NextResponse.json({ error: 'Unknown job' }, { status: 404 })
  const job = row as JobRow

  // Already charged by a previous poll — serve the cached result, never re-charge.
  if (job.charged) {
    if (job.result) return NextResponse.json({ status: 'done', ...job.result })
    return NextResponse.json({ status: 'error', error: 'Generation failed — nothing was charged.' })
  }

  const railwayUrl = process.env.RAILWAY_BROWSER_URL
  const railwaySecret = process.env.BROWSER_SECRET
  if (!railwayUrl || !railwaySecret) {
    return NextResponse.json({ error: 'CV generation service is not configured.' }, { status: 503 })
  }

  let railwayJob: RailwayJob
  try {
    const res = await fetch(`${railwayUrl}/tailor-cv/status/${jobId}`, {
      headers: { Authorization: `Bearer ${railwaySecret}` },
      signal: AbortSignal.timeout(10_000),
    })
    if (res.status === 404) return NextResponse.json({ status: 'error', error: 'Generation expired — please try again.' })
    if (!res.ok) return NextResponse.json({ status: 'pending' })
    railwayJob = await res.json()
  } catch (err) {
    console.error('[tailor-cv/status] Railway call failed:', err)
    return NextResponse.json({ status: 'pending' })
  }

  if (railwayJob.status === 'pending') return NextResponse.json({ status: 'pending' })

  if (railwayJob.status === 'error' || !railwayJob.cv) {
    return NextResponse.json({ status: 'error', error: railwayJob.error || 'Generation failed — nothing was charged.' })
  }

  // Only charge now that a valid CV actually exists to hand back. The conditional update
  // (charged = false in the WHERE clause) guards against a race between concurrent polls —
  // only the poll that flips the flag gets to deduct; every other poll falls into the
  // job.charged branch above and reads the cached result instead.
  const { data: claimed } = await admin
    .from('ai_generation_jobs')
    .update({ charged: true })
    .eq('id', jobId)
    .eq('charged', false)
    .select('id')
    .single()

  if (!claimed) {
    // Lost the race to another poll — re-read and serve its result.
    const { data: settled } = await admin.from('ai_generation_jobs').select('result').eq('id', jobId).single()
    if (settled?.result) return NextResponse.json({ status: 'done', ...settled.result })
    return NextResponse.json({ status: 'pending' })
  }

  const credits = await checkAndDeductCredits(user.id, job.cost, job.action, user.email ?? '', job.market, job.job_key)
  if (!credits.ok) {
    return NextResponse.json({ status: 'error', error: 'Insufficient credits', credits: credits.remaining, required: job.cost })
  }
  const pricing = { charged: job.cost, bundle: await resolveBundle(user.id, job.job_key ?? ''), admin: !!credits.bypass }
  const result = { cv: railwayJob.cv, creditsRemaining: credits.remaining, pricing }

  await admin.from('ai_generation_jobs').update({ result }).eq('id', jobId)
  after(() => saveMemoriesFromInteraction(user.id, `User tailored their CV.\nCV: ${railwayJob.cv!.slice(0, 1500)}`))

  return NextResponse.json({ status: 'done', ...result })
}
