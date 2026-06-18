import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { razorpayAuthHeader } from '@/lib/razorpay'
import { RAZORPAY_PACKS } from '@/lib/constants'

// Creates a Razorpay order for a fixed credit pack. The client opens checkout
// with the returned orderId. Credits are granted later by /verify + webhook.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: 'Payments not configured' }, { status: 503 })
    }

    const { amount } = await req.json().catch(() => ({}))
    const amountStr = String(amount)
    const credits = RAZORPAY_PACKS[amountStr]
    if (!credits) return NextResponse.json({ error: 'Invalid pack' }, { status: 400 })

    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Authorization': razorpayAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount:          parseInt(amountStr, 10) * 100, // paise
        currency:        'INR',
        receipt:         `jl_${user.id.slice(0, 8)}_${Date.now()}`,
        notes:           { user_id: user.id, credits: String(credits), amount_inr: amountStr },
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[razorpay/order] create failed:', res.status, errText)
      return NextResponse.json({ error: 'Could not create order' }, { status: 502 })
    }

    const order = await res.json()
    return NextResponse.json({
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      keyId:    process.env.RAZORPAY_KEY_ID,
      credits,
    })
  } catch (err) {
    console.error('[razorpay/order]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
