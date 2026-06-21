import crypto from 'crypto'
import { createAdminSupabase } from '@/lib/supabase-server'

// Basic-auth header for the Razorpay REST API (key_id:key_secret).
export function razorpayAuthHeader(): string {
  const keyId  = process.env.RAZORPAY_KEY_ID || ''
  const secret = process.env.RAZORPAY_KEY_SECRET || ''
  return 'Basic ' + Buffer.from(`${keyId}:${secret}`).toString('base64')
}

// Recover an existing Razorpay customer id by matching email/contact.
// Needed because customer-create returns 400 "already exists" rather than
// honouring fail_existing:0. Razorpay has no filter-by-contact endpoint, so we
// page through the customer list (fine in practice — small customer counts).
export async function findExistingCustomer(email: string, contact: string): Promise<string | null> {
  const digits = (contact || '').replace(/\D/g, '').slice(-10)
  let skip = 0
  for (let page = 0; page < 20; page++) {
    const res = await fetch(`https://api.razorpay.com/v1/customers?count=100&skip=${skip}`, {
      headers: { 'Authorization': razorpayAuthHeader() },
    })
    if (!res.ok) return null
    const data = await res.json()
    const items: Array<{ id: string; email?: string; contact?: string }> = data.items ?? []
    const match = items.find(it =>
      (email && it.email && it.email.toLowerCase() === email.toLowerCase()) ||
      (digits && it.contact && it.contact.replace(/\D/g, '').slice(-10) === digits)
    )
    if (match) return match.id
    if (items.length < 100) return null
    skip += 100
  }
  return null
}

// Fetch an order's server-set notes (trustworthy — never tampered by the client).
// Used by the webhook to resolve the buyer from order_id.
export async function fetchOrderNotes(orderId: string): Promise<Record<string, string> | null> {
  if (!orderId) return null
  const res = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
    headers: { 'Authorization': razorpayAuthHeader() },
  })
  if (!res.ok) {
    console.error('[razorpay] order fetch failed:', res.status)
    return null
  }
  const order = await res.json()
  return (order.notes ?? {}) as Record<string, string>
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

  // Pull billing + invoice number from the (untampered) order notes for the invoice
  const notes = await fetchOrderNotes(orderId)

  const { error: insertErr } = await admin.from('purchase_events').insert({
    user_id:             userId,
    razorpay_payment_id: paymentId,
    razorpay_order_id:   orderId,
    amount_inr:          amountInr,
    credits_added:       credits,
    invoice_number:      notes?.invoice_number ?? null,
    customer_name:       notes?.c_name ?? null,
    customer_address:    notes?.c_address ?? null,
    customer_contact:    notes?.c_contact ?? null,
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
