import { NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'

// Hard-deletes the authenticated user and all their personal data (GDPR).
// Child tables referencing auth.users cascade on user delete, but we delete
// explicitly first so it's robust even where a FK isn't ON DELETE CASCADE.
export async function POST() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminSupabase()
  const uid = user.id

  // Best-effort purge of all per-user rows
  const tables = ['user_memories', 'training_feedback', 'usage_events']
  for (const t of tables) {
    const { error } = await admin.from(t).delete().eq('user_id', uid)
    if (error) console.error(`[account/delete] ${t} delete failed:`, error.message)
  }

  // GDPR G9 / §147 AO: purchase_events must be retained 10 years for financial records,
  // but personal identifiers (paypal_payer_email) must be erased per Art.17.
  // Pseudonymize: null out the email, keep transaction metadata.
  const { error: peErr } = await admin
    .from('purchase_events')
    .update({ paypal_payer_email: null })
    .eq('user_id', uid)
  if (peErr) console.error('[account/delete] purchase_events pseudonymize failed:', peErr.message)
  const { error: profErr } = await admin.from('profiles').delete().eq('id', uid)
  if (profErr) console.error('[account/delete] profiles delete failed:', profErr.message)

  // Finally remove the auth user itself
  const { error: authErr } = await admin.auth.admin.deleteUser(uid)
  if (authErr) {
    console.error('[account/delete] auth user delete failed:', authErr.message)
    return NextResponse.json({ error: 'Could not delete account' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
