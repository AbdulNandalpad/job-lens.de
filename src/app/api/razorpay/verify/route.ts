import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { razorpayAuthHeader, verifyPaymentSignature, creditRazorpayPurchase } from '@/lib/razorpay'
import { RAZORPAY_PACKS } from '@/lib/constants'

// Called by the checkout success handler. Verifies the signature, re-confirms
// the payment with Razorpay (never trusts client amounts), then credits.
// Idempotent with the webhook via the unique razorpay_payment_id index.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json().catch(() => ({}))
    if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 })
    }

    // Re-fetch the payment from Razorpay — server is the source of truth for amount/status
    const payRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      headers: { 'Authorization': razorpayAuthHeader() },
    })
    if (!payRes.ok) {
      console.error('[razorpay/verify] payment fetch failed:', payRes.status)
      return NextResponse.json({ error: 'Could not confirm payment' }, { status: 502 })
    }
    const payment = await payRes.json()

    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      return NextResponse.json({ error: 'Payment not completed', status: payment.status }, { status: 402 })
    }

    const amountInr = Math.round((payment.amount ?? 0) / 100)
    const credits = RAZORPAY_PACKS[String(amountInr)]
    if (!credits) {
      console.warn('[razorpay/verify] unknown amount:', amountInr)
      return NextResponse.json({ error: 'Unknown amount' }, { status: 400 })
    }

    const result = await creditRazorpayPurchase({
      userId:    user.id,
      paymentId: razorpay_payment_id,
      orderId:   razorpay_order_id,
      amountInr,
      credits,
    })

    if (result === 'error') return NextResponse.json({ error: 'Could not credit' }, { status: 500 })
    return NextResponse.json({ ok: true, credits_added: result === 'added' ? credits : 0, duplicate: result === 'duplicate' })
  } catch (err) {
    console.error('[razorpay/verify]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
