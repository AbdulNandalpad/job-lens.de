import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-server'

// Credit amounts per purchase price (EUR)
const CREDIT_PACKS: Record<string, number> = {
  '4.99':  20,
  '12.99': 60,
  '24.99': 150,
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const params = new URLSearchParams(body)

    const paymentStatus = params.get('payment_status')
    const userId        = params.get('custom')
    const grossAmount   = params.get('mc_gross') ?? ''
    const currency      = params.get('mc_currency')
    const txnId         = params.get('txn_id') ?? ''
    const payerEmail    = params.get('payer_email') ?? ''

    // Verify IPN with PayPal
    const verifyUrl = process.env.PAYPAL_SANDBOX === 'true'
      ? 'https://ipnpb.sandbox.paypal.com/cgi-bin/webscr'
      : 'https://ipnpb.paypal.com/cgi-bin/webscr'

    const verifyRes = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'cmd=_notify-validate&' + body,
    })
    const verifyText = await verifyRes.text()

    if (verifyText !== 'VERIFIED') {
      console.warn('[paypal] IPN not verified:', verifyText)
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    if (paymentStatus !== 'Completed') {
      return NextResponse.json({ ok: true, skipped: true })
    }

    if (!userId || !currency || currency !== 'EUR') {
      console.warn('[paypal] Missing userId or wrong currency')
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const normalised = parseFloat(grossAmount).toFixed(2)
    const creditsToAdd = CREDIT_PACKS[normalised]

    if (!creditsToAdd) {
      console.warn('[paypal] Unknown amount:', normalised)
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const admin = createAdminSupabase()

    // Get current credits
    const { data: profile } = await admin.from('profiles').select('credits').eq('id', userId).single()
    const current = profile?.credits ?? 5

    // Add credits (no updated_at — column does not exist)
    await admin.from('profiles').upsert({
      id: userId,
      credits: current + creditsToAdd,
      paypal_payer_email: payerEmail || undefined,
    })

    // Record purchase for audit (table may not exist yet — fail silently)
    try {
      await admin.from('purchase_events').insert({
        user_id: userId,
        paypal_txn_id: txnId || null,
        paypal_payer_email: payerEmail || null,
        amount_eur: parseFloat(normalised),
        credits_added: creditsToAdd,
      })
    } catch (auditErr) {
      console.warn('[paypal] Could not write purchase_events (table may not exist):', auditErr)
    }

    console.log(`[paypal] +${creditsToAdd} credits → user ${userId} (was ${current})`)
    return NextResponse.json({ ok: true, credits_added: creditsToAdd })

  } catch (err) {
    console.error('[paypal] webhook error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
