import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, creditRazorpayPurchase } from '@/lib/razorpay'
import { RAZORPAY_PACKS } from '@/lib/constants'
import { reportError } from '@/lib/error-reporter'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Razorpay webhook — the reliable source of truth. Fires on payment.captured
// even if the user closes the tab before /verify runs. Idempotent with /verify.
export async function POST(req: NextRequest) {
  try {
    const rawBody   = await req.text()
    const signature = req.headers.get('x-razorpay-signature') ?? ''

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn('[razorpay/webhook] signature verification failed')
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const event = JSON.parse(rawBody)
    if (event.event !== 'payment.captured') {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const payment = event.payload?.payment?.entity
    if (!payment) return NextResponse.json({ ok: false }, { status: 400 })

    const userId    = payment.notes?.user_id
    const amountInr = Math.round((payment.amount ?? 0) / 100)
    const credits   = RAZORPAY_PACKS[String(amountInr)]

    if (!userId || !UUID_RE.test(userId)) {
      console.warn('[razorpay/webhook] missing/invalid user_id in notes')
      return NextResponse.json({ ok: false }, { status: 400 })
    }
    if (!credits) {
      console.warn('[razorpay/webhook] unknown amount:', amountInr)
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const result = await creditRazorpayPurchase({
      userId,
      paymentId: payment.id,
      orderId:   payment.order_id ?? '',
      amountInr,
      credits,
    })

    if (result === 'error') return NextResponse.json({ ok: false }, { status: 500 })
    return NextResponse.json({ ok: true, credits_added: result === 'added' ? credits : 0 })
  } catch (err) {
    console.error('[razorpay/webhook]', err)
    await reportError({ route: '/api/razorpay/webhook', error: err, severity: 'critical' })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
