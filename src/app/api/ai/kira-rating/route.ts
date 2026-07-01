import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'
import { Resend } from 'resend'

const resend      = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM        = process.env.RESEND_FROM_EMAIL ?? 'noreply@job-lens.de'
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body       = await req.json().catch(() => ({}))
    const session_id = typeof body.session_id === 'string' ? body.session_id : null
    const rating     = body.rating === 1 || body.rating === -1 ? body.rating as 1 | -1 : null
    const comment    = typeof body.comment === 'string' ? body.comment.slice(0, 500) : null

    if (!session_id || rating === null) {
      return NextResponse.json({ error: 'session_id and rating required' }, { status: 400 })
    }

    const admin = createAdminSupabase()
    const { error } = await admin
      .from('kira_sessions')
      .update({ rating, ...(comment ? { rating_comment: comment } : {}) })
      .eq('id', session_id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[kira-rating] update error:', error.message)
      return NextResponse.json({ error: 'Could not save rating' }, { status: 500 })
    }

    // Email admins on thumbs down
    const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

    if (rating === -1 && resend && ADMIN_EMAILS.length) {
      const { data: session } = await admin
        .from('kira_sessions')
        .select('mode, market, duration_s, exit_reason')
        .eq('id', session_id)
        .single()

      const html = `
<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:28px 24px;color:#1a2332">
  <h2 style="font-size:18px;font-weight:700;margin:0 0 16px;color:#e53e3e">👎 Kira session rated negatively</h2>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
    <tr><td style="padding:5px 0;color:#6b7c93;width:120px">Session ID</td><td style="padding:5px 0;font-family:monospace">${session_id}</td></tr>
    <tr><td style="padding:5px 0;color:#6b7c93">User</td><td style="padding:5px 0">${user.email ?? user.id}</td></tr>
    <tr><td style="padding:5px 0;color:#6b7c93">Market</td><td style="padding:5px 0">${session?.market ?? '—'}</td></tr>
    <tr><td style="padding:5px 0;color:#6b7c93">Mode</td><td style="padding:5px 0">${session?.mode ?? '—'}</td></tr>
    <tr><td style="padding:5px 0;color:#6b7c93">Duration</td><td style="padding:5px 0">${session?.duration_s ?? 0}s</td></tr>
    <tr><td style="padding:5px 0;color:#6b7c93">Exit reason</td><td style="padding:5px 0">${session?.exit_reason ?? '—'}</td></tr>
    ${comment ? `<tr><td style="padding:5px 0;color:#6b7c93">Comment</td><td style="padding:5px 0">${escHtml(comment)}</td></tr>` : ''}
  </table>
  <p style="font-size:11px;color:#94a3b8;margin:0">${new Date().toISOString()}</p>
</div>`

      await Promise.allSettled(
        ADMIN_EMAILS.map(to =>
          resend!.emails.send({ from: FROM, to, subject: '👎 Kira voice session — negative rating', html })
        )
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[kira-rating]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
