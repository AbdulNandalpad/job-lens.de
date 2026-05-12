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
    const userId        = params.get('custom')          // user id passed in form
    const grossAmount   = params.get('mc_gross') ?? ''
    const currency      = params.get('mc_currency')

    // Verify IPN with PayPal
    const verifyUrl = process.env.PAYPAL_SANDBOX === 'true'
      ? 'https://ipnpb.sandbox.paypal.com/cgi-bin/webscr'
      : 'https://ipnpb.paypal.com/cgi-bin/webscr'

    const verifyBody = 'cmd=_notify-validate&' + body
    const verifyRes = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: verifyBody,
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

    // Normalise amount: trim to 2 decimal places
    const normalised = parseFloat(grossAmount).toFixed(2)
    const creditsToAdd = CREDIT_PACKS[normalised]

    if (!creditsToAdd) {
      console.warn('[paypal] Unknown amount:', normalised)
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const admin = createAdminSupabase()

    // Add credits (upsert so even first-time buyers get a profile)
    const { data: profile } = await admin.from('profiles').select('credits').eq('id', userId).single()
    const current = profile?.credits ?? 5

    await admin.from('profiles').upsert({
      id: userId,
      credits: current + creditsToAdd,
      paypal_payer_email: params.get('payer_email') ?? undefined,
      updated_at: new Date().toISOString(),
    })

    console.log(`[paypal] +${creditsToAdd} credits → user ${userId} (was ${current})`)
    return NextResponse.json({ ok: true, credits_added: creditsToAdd })

  } catch (err) {
    console.error('[paypal] webhook error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
