import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-server'
import { reportError } from '@/lib/error-reporter'

// Credit amounts per purchase price (EUR)
const CREDIT_PACKS: Record<string, number> = {
  '4.99':  20,
  '9.99':  50,
  '13.99': 120,
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const body    = rawBody.trim()
    const params  = new URLSearchParams(body)

    const paymentStatus = params.get('payment_status')
    const userId        = params.get('custom')
    const grossAmount   = params.get('mc_gross') ?? ''
    const currency      = params.get('mc_currency')
    const txnId         = params.get('txn_id') ?? ''
    const payerEmail    = params.get('payer_email') ?? ''

    console.log('[paypal] IPN received — status:', paymentStatus, 'amount:', grossAmount, 'currency:', currency, 'txn:', txnId, 'userId:', userId, 'bodyLen:', rawBody.length)

    // Verify IPN with PayPal — send rawBody (untrimmed) exactly as received
    const verifyUrl = process.env.PAYPAL_SANDBOX === 'true'
      ? 'https://ipnpb.sandbox.paypal.com/cgi-bin/webscr'
      : 'https://ipnpb.paypal.com/cgi-bin/webscr'

    let verifyText = 'FETCH_ERROR'
    let verifyStatus = 0
    try {
      const verifyRes = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'cmd=_notify-validate&' + rawBody,
      })
      verifyStatus = verifyRes.status
      verifyText = await verifyRes.text()
    } catch (fetchErr) {
      console.error('[paypal] verify fetch failed:', fetchErr)
    }

    console.log('[paypal] verify result:', verifyText.trim(), '| httpStatus:', verifyStatus, '| url:', verifyUrl, '| first300:', body.substring(0, 300))

    if (verifyText.trim() !== 'VERIFIED') {
      console.error('[paypal] IPN not verified — body dump:', body)
      return NextResponse.json({ ok: false }, { status: 200 }) // 200 so PayPal stops retrying
    }

    if (paymentStatus !== 'Completed') {
      return NextResponse.json({ ok: true, skipped: true })
    }

    // Verify payment was made to OUR merchant account — critical against IPN replay attacks
    const receiverEmail = (params.get('receiver_email') ?? '').trim()
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!EMAIL_RE.test(receiverEmail)) {
      console.warn('[paypal] receiver_email invalid format:', receiverEmail)
      return NextResponse.json({ ok: false }, { status: 400 })
    }
    const expectedEmail = (process.env.NEXT_PUBLIC_PAYPAL_EMAIL ?? '').toLowerCase()
    if (!expectedEmail) {
      console.error('[paypal] NEXT_PUBLIC_PAYPAL_EMAIL env var not set — all IPN rejected')
      return NextResponse.json({ ok: false }, { status: 400 })
    }
    if (receiverEmail.toLowerCase() !== expectedEmail) {
      console.warn('[paypal] receiver_email mismatch — possible replay attack:', receiverEmail)
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    if (!userId || !currency || currency !== 'EUR') {
      console.warn('[paypal] Missing userId or wrong currency')
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    // Validate userId is a plausible UUID to guard against payload injection
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!UUID_RE.test(userId)) {
      console.warn('[paypal] Invalid userId format:', userId)
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    // Require txn_id — never proceed without it (no idempotency key = unsafe)
    if (!txnId) {
      console.warn('[paypal] Missing txn_id — rejecting')
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const normalised = parseFloat(grossAmount).toFixed(2)
    const creditsToAdd = CREDIT_PACKS[normalised]

    if (!creditsToAdd) {
      console.warn('[paypal] Unknown amount:', normalised)
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const admin = createAdminSupabase()

    // Verify the user actually exists before touching credits
    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (!profile) {
      console.warn('[paypal] No profile found for userId:', userId)
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    // Insert purchase record FIRST — unique txn_id constraint is the deduplication gate.
    // If PayPal retries the IPN, this insert fails before credits are touched.
    const { error: insertErr } = await admin.from('purchase_events').insert({
      user_id:             userId,
      paypal_txn_id:       txnId,
      paypal_payer_email:  payerEmail || null,
      amount_eur:          parseFloat(normalised),
      credits_added:       creditsToAdd,
    })

    if (insertErr) {
      if (insertErr.code === '23505') {
        console.warn(`[paypal] txn_id ${txnId} already processed — skipping duplicate`)
        return NextResponse.json({ ok: true, skipped: true })
      }
      // Any other DB error: reject — never credit without a recorded transaction
      console.error('[paypal] purchase_events insert failed — rejecting credit:', insertErr.message)
      return NextResponse.json({ ok: false }, { status: 500 })
    }

    // Atomic increment — no read-then-write race condition
    await admin.rpc('increment_eu_credits', { user_id: userId, amount: creditsToAdd })

    // Store payer email separately (non-critical, best-effort)
    if (payerEmail) {
      await admin.from('profiles').update({ paypal_payer_email: payerEmail }).eq('id', userId)
    }

    console.log(`[paypal] +${creditsToAdd} eu_credits → user ${userId}`)
    return NextResponse.json({ ok: true, credits_added: creditsToAdd })

  } catch (err) {
    console.error('[paypal] webhook error:', err)
    await reportError({ route: '/api/paypal/webhook', error: err, severity: 'critical' })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
