import crypto from 'crypto'
import { createAdminSupabase } from '@/lib/supabase-server'

// Basic-auth header for the Razorpay REST API (key_id:key_secret).
export function razorpayAuthHeader(): string {
  const keyId  = process.env.RAZORPAY_KEY_ID || ''
  const secret = process.env.RAZORPAY_KEY_SECRET || ''
  return 'Basic ' + Buffer.from(`${keyId}:${secret}`).toString('base64')
}

// Verify the checkout callback signature: HMAC_SHA256(order_id|payment_id, secret).
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET || ''
  if (!secret || !orderId || !paymentId || !signature) return false
  const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex')
  return timingSafeEqual(expected, signature)
}

// Verify a webhook payload signature: HMAC_SHA256(rawBody, webhook_secret).
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || ''
  if (!secret || !signature) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return timingSafeEqual(expected, signature)
}

function timingSafeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

// Idempotently record a Razorpay purchase and grant in_credits.
// The unique razorpay_payment_id index is the dedup gate — if verify and the
// webhook both fire for the same payment, only the first credits.
export async function creditRazorpayPurchase(opts: {
  userId: string
  paymentId: string
  orderId: string
  amountInr: number
  credits: number
}): Promise<'added' | 'duplicate' | 'error'> {
  const { userId, paymentId, orderId, amountInr, credits } = opts
  const admin = createAdminSupabase()

  const { data: profile } = await admin.from('profiles').select('id').eq('id', userId).single()
  if (!profile) {
    console.warn('[razorpay] no profile for userId:', userId)
    return 'error'
  }

  const { error: insertErr } = await admin.from('purchase_events').insert({
    user_id:             userId,
    razorpay_payment_id: paymentId,
    razorpay_order_id:   orderId,
    amount_inr:          amountInr,
    credits_added:       credits,
  })

  if (insertErr) {
    if (insertErr.code === '23505') return 'duplicate'
    console.error('[razorpay] purchase_events insert failed:', insertErr.message)
    return 'error'
  }

  await admin.rpc('increment_in_credits', { user_id: userId, amount: credits })
  console.log(`[razorpay] +${credits} in_credits → user ${userId}`)
  return 'added'
}
