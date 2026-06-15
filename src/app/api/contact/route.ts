import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createAdminSupabase } from '@/lib/supabase-server'
import { sendAdminAlert } from '@/lib/job-case-email'
import { Resend } from 'resend'

const resend   = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM     = process.env.RESEND_FROM_EMAIL ?? 'noreply@job-lens.de'
const MAX_RPH  = 3 // requests per IP per hour

function sha256(v: string) {
  return createHash('sha256').update(v).digest('hex')
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message, market } = await req.json()

    if (!name?.trim() || !email?.includes('@') || !message?.trim()) {
      return NextResponse.json({ error: 'name, email and message are required' }, { status: 400 })
    }
    if (message.trim().length > 2000) {
      return NextResponse.json({ error: 'Message too long (max 2000 characters)' }, { status: 400 })
    }

    // Rate limiting
    const ip     = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const ipHash = sha256(ip)
    const admin  = createAdminSupabase()
    const hourAgo = new Date(Date.now() - 3_600_000).toISOString()

    const { count } = await admin
      .from('ip_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .eq('endpoint', 'contact')
      .gte('created_at', hourAgo)

    if ((count ?? 0) >= MAX_RPH) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }
    await admin.from('ip_rate_limits').insert({ ip_hash: ipHash, endpoint: 'contact' })

    const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
    const safeSubject = (subject ?? '(no subject)').slice(0, 200)
    const safeMessage = message.trim().slice(0, 2000)
    const safeMarket  = market === 'in' ? 'India' : 'DACH'

    const html = `
<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:28px 24px;color:#1a2332">
  <h2 style="font-size:18px;font-weight:700;margin:0 0 16px">📬 Contact form submission</h2>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
    <tr><td style="padding:6px 0;color:#6b7c93;width:100px">Name</td><td style="padding:6px 0;font-weight:600">${name}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7c93">Email</td><td style="padding:6px 0"><a href="mailto:${email}">${email}</a></td></tr>
    <tr><td style="padding:6px 0;color:#6b7c93">Subject</td><td style="padding:6px 0">${safeSubject}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7c93">Market</td><td style="padding:6px 0">${safeMarket}</td></tr>
  </table>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;font-size:13px;line-height:1.75;white-space:pre-wrap;word-break:break-word">
${safeMessage}
  </div>
  <p style="font-size:11px;color:#94a3b8;margin-top:16px">${new Date().toISOString()}</p>
</div>`

    if (resend && adminEmails.length) {
      await Promise.allSettled(
        adminEmails.map(to =>
          resend!.emails.send({
            from: FROM,
            to,
            replyTo: email,
            subject: `[Job-Lens Contact] ${safeSubject}`,
            html,
          })
        )
      )
    } else {
      // Fallback: log via admin alert (works even without Resend configured)
      await sendAdminAlert({
        subject: `Contact form: ${safeSubject}`,
        body: `From: ${name} <${email}>\nMarket: ${safeMarket}\n\n${safeMessage}`,
      })
    }

    // Auto-reply to sender
    if (resend) {
      await resend.emails.send({
        from: FROM,
        to: email,
        subject: 'We received your message — Job-Lens',
        html: `
<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:28px 24px;color:#1a2332">
  <h2 style="font-size:18px;font-weight:700;margin:0 0 10px">Thanks, ${name}!</h2>
  <p style="color:#6b7c93;font-size:14px;line-height:1.7;margin:0 0 16px">
    We've received your message and will get back to you within 1–2 business days.
  </p>
  <p style="color:#6b7c93;font-size:13px;line-height:1.7;margin:0">
    — The Job-Lens team
  </p>
</div>`,
      }).catch(() => null)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('/api/contact error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
