/**
 * /api/user/cv — persistent, cross-session CV storage.
 *
 * GET    → returns the saved CV (decrypted) + metadata, if any.
 * POST   → saves/replaces the CV. Requires { text, fileName, consent: true }.
 *          Consent is mandatory — this is GDPR Art. 6(1)(a) consent-based
 *          storage of the CV beyond the current session, recorded as
 *          cv_consent_at. See datenschutz page §4a for the user-facing text.
 * DELETE → removes the saved CV and consent record.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'
import { encrypt, decrypt } from '@/lib/encryption'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminSupabase()
  const { data: profile } = await admin
    .from('profiles')
    .select('cv_text, cv_file_name, cv_updated_at, cv_consent_at')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.cv_text) {
    return NextResponse.json({ hasCv: false })
  }

  return NextResponse.json({
    hasCv: true,
    cvText: decrypt(profile.cv_text),
    fileName: profile.cv_file_name,
    updatedAt: profile.cv_updated_at,
    consentAt: profile.cv_consent_at,
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  const fileName = typeof body?.fileName === 'string' ? body.fileName.slice(0, 200) : null
  const consent = body?.consent === true

  if (!text || text.length < 50) {
    return NextResponse.json({ error: 'CV text is too short' }, { status: 400 })
  }
  if (!consent) {
    return NextResponse.json({ error: 'Consent is required to save your CV' }, { status: 400 })
  }

  const admin = createAdminSupabase()
  const now = new Date().toISOString()
  const { error } = await admin
    .from('profiles')
    .update({
      cv_text: encrypt(text),
      cv_file_name: fileName,
      cv_updated_at: now,
      cv_consent_at: now,
    })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: 'Failed to save CV' }, { status: 500 })
  return NextResponse.json({ ok: true, updatedAt: now })
}

export async function DELETE() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminSupabase()
  const { error } = await admin
    .from('profiles')
    .update({ cv_text: null, cv_file_name: null, cv_updated_at: null, cv_consent_at: null })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: 'Failed to delete CV' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
