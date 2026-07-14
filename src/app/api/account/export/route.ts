/**
 * GET /api/account/export
 * GDPR Art. 20 — Right to data portability.
 * Returns all personal data held for the authenticated user as a JSON download.
 */
import { NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'
import { decrypt, decryptJson } from '@/lib/encryption'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminSupabase()
  const uid = user.id

  const [
    { data: profile },
    { data: memories },
    { data: usageEvents },
    { data: purchaseEvents },
    { data: jobCases },
    { data: applications },
    { data: feedback },
  ] = await Promise.all([
    admin.from('profiles').select('id, credits, eu_credits, in_credits, status, created_at').eq('id', uid).maybeSingle(),
    admin.from('user_memories').select('memory_text, created_at').eq('user_id', uid),
    admin.from('usage_events').select('action, credits_used, created_at').eq('user_id', uid),
    admin.from('purchase_events').select('amount, credits_added, currency, created_at').eq('user_id', uid),
    admin.from('job_cases').select('job_title, company_name, match_score, pitch_narrative, status, created_at, expires_at').eq('user_id', uid),
    admin.from('applications').select('company, role, status, applied_at, created_at').eq('user_id', uid),
    admin.from('training_feedback').select('feature, rating, created_at').eq('user_id', uid),
  ])

  const exportData = {
    exported_at: new Date().toISOString(),
    data_subject: { id: uid, email: user.email },
    profile: profile ?? {},
    kira_memories: (memories ?? []).map((m: { memory_text: string; created_at: string }) => ({ ...m, memory_text: decrypt(m.memory_text) })),
    usage_events: usageEvents ?? [],
    purchase_events: purchaseEvents ?? [],
    job_cases: (jobCases ?? []).map((c: { pitch_narrative: string; [k: string]: unknown }) => ({ ...c, pitch_narrative: decrypt(c.pitch_narrative) })),
    applications: applications ?? [],
    feedback: feedback ?? [],
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="job-lens-data-export-${new Date().toISOString().slice(0, 10)}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
