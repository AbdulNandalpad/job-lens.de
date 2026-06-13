/**
 * Job Case email helpers.
 * Uses Resend if RESEND_API_KEY is set; logs to console in dev/fallback.
 * All emails sent from RESEND_FROM_EMAIL (default noreply@job-lens.de).
 *
 * GDPR: recruiter full email is never stored — only used to send the magic link,
 * then discarded. Domain is extracted and stored separately.
 */

import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM   = process.env.RESEND_FROM_EMAIL ?? 'noreply@job-lens.de'
const BASE   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://job-lens.de'

export async function sendMagicLink(opts: {
  toEmail: string
  candidateName: string
  jobTitle: string
  company: string
  magicToken: string
}) {
  const { toEmail, candidateName, jobTitle, company, magicToken } = opts
  const link = `${BASE}/api/job-case/access/${magicToken}`

  const subject = `Your access link — Job Case for ${candidateName}`
  const html = `
<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a2332">
  <h2 style="font-size:20px;font-weight:700;margin:0 0 12px">Access the Job Case</h2>
  <p style="color:#6b7c93;font-size:14px;line-height:1.7;margin:0 0 20px">
    ${candidateName} has applied for <strong>${jobTitle}</strong> at <strong>${company}</strong>
    and shared a verified Job Case with you.
  </p>
  <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#378ADD,#185FA5);color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;font-size:14px">
    Open Job Case →
  </a>
  <p style="color:#8fa3b8;font-size:11px;line-height:1.7;margin:24px 0 0">
    This link expires in 24 hours and can only be used once.<br>
    By opening this case you agree to receive a one-time access link.
    Your email domain (e.g. ${toEmail.split('@')[1]}) will be shared with
    the candidate as a view confirmation. Your full email address is never stored.
    We do not add you to any mailing list.
  </p>
</div>`

  if (resend) {
    await resend.emails.send({ from: FROM, to: toEmail, subject, html })
  } else {
    // Dev fallback — log so the flow still works without Resend configured
    console.error(`[job-case-email] RESEND_API_KEY not set. Magic link for ${toEmail}: ${link}`)
  }
}

export async function sendViewNotification(opts: {
  candidateEmail: string
  candidateName: string
  jobTitle: string
  recruiterDomain: string
}) {
  const { candidateEmail, candidateName, jobTitle, recruiterDomain } = opts

  const subject = `Your Job Case was viewed — ${jobTitle}`
  const html = `
<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a2332">
  <h2 style="font-size:20px;font-weight:700;margin:0 0 12px">Your Job Case was viewed 👀</h2>
  <p style="color:#6b7c93;font-size:14px;line-height:1.7;margin:0 0 20px">
    Hi ${candidateName}, someone at <strong>@${recruiterDomain}</strong> just opened your
    Job Case for <strong>${jobTitle}</strong>.
  </p>
  <p style="color:#6b7c93;font-size:13px;line-height:1.7;margin:0">
    You'll continue to receive notifications each time a new recruiter views it.
    The case auto-deletes after 30 days.
  </p>
</div>`

  if (resend) {
    await resend.emails.send({ from: FROM, to: candidateEmail, subject, html })
  } else {
    console.error(`[job-case-email] View notification for ${candidateEmail} from @${recruiterDomain}`)
  }
}

export async function sendCreditRefundNotification(opts: {
  candidateEmail: string
  candidateName: string
  jobTitle: string
  company: string
  creditsRefunded: number
}) {
  const { candidateEmail, candidateName, jobTitle, company, creditsRefunded } = opts

  const subject = `Credits refunded — no views on your Job Case for ${jobTitle}`
  const html = `
<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a2332">
  <h2 style="font-size:20px;font-weight:700;margin:0 0 12px">Credits refunded</h2>
  <p style="color:#6b7c93;font-size:14px;line-height:1.7;margin:0 0 20px">
    Hi ${candidateName}, your Job Case for <strong>${jobTitle}</strong> at
    <strong>${company}</strong> had no recruiter views in the first 14 days.
    We've refunded your <strong>${creditsRefunded} credits</strong> automatically.
  </p>
  <p style="color:#6b7c93;font-size:13px;line-height:1.7;margin:0">
    The case will remain live until its 30-day expiry in case views come in later.
    Your credits never expire.
  </p>
</div>`

  if (resend) {
    await resend.emails.send({ from: FROM, to: candidateEmail, subject, html })
  } else {
    console.error(`[job-case-email] Refund notification for ${candidateEmail}`)
  }
}
