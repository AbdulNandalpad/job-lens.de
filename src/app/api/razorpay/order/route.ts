import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'
import { razorpayAuthHeader, findExistingCustomer } from '@/lib/razorpay'
import { RAZORPAY_PACKS } from '@/lib/constants'

// Creates a Razorpay Import Flow order for a fixed credit pack.
// Import Flow (international business accepting INR from Indian customers)
// requires a customer_id + customer_details with a mandatory shipping_address.
// Credits are granted later by /verify + webhook.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: 'Payments not configured' }, { status: 503 })
    }

    const { amount, customer } = await req.json().catch(() => ({}))
    const amountStr = String(amount)
    const credits = RAZORPAY_PACKS[amountStr]
    if (!credits) return NextResponse.json({ error: 'Invalid pack' }, { status: 400 })

    // Validate the shipping details required by Import Flow
    const c = customer ?? {}
    const required = ['name', 'contact', 'line1', 'city', 'state', 'zipcode']
    for (const f of required) {
      if (!c[f] || String(c[f]).trim() === '') {
        return NextResponse.json({ error: `Missing ${f}` }, { status: 400 })
      }
    }
    const email = c.email || user.email || ''

    // 1. Reuse the stored Razorpay customer, or create one once and persist it.
    // fail_existing:0 → if a customer with the same contact already exists,
    // Razorpay returns it instead of erroring (handles the first migration).
    const admin = createAdminSupabase()
    const { data: prof } = await admin
      .from('profiles')
      .select('razorpay_customer_id')
      .eq('id', user.id)
      .single()

    let customerId = (prof?.razorpay_customer_id as string | null) || null

    if (!customerId) {
      const custRes = await fetch('https://api.razorpay.com/v1/customers', {
        method: 'POST',
        headers: { 'Authorization': razorpayAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: c.name, contact: c.contact, email, fail_existing: 0 }),
      })

      if (custRes.ok) {
        customerId = (await custRes.json()).id
      } else {
        const errText = await custRes.text()
        // Razorpay returns 400 "already exists" instead of honouring fail_existing:0.
        // Recover the existing customer by matching email/contact in the list.
        if (errText.includes('already exists')) {
          customerId = await findExistingCustomer(email, c.contact)
        }
        if (!customerId) {
          console.error('[razorpay/order] customer create failed:', custRes.status, errText)
          return NextResponse.json({ error: 'Could not create customer' }, { status: 502 })
        }
      }

      // Best-effort persist (no-op if migration 007 not yet applied)
      await admin.from('profiles').update({ razorpay_customer_id: customerId }).eq('id', user.id)
    }

    const invoiceNumber = `INV-${Date.now()}-${user.id.slice(0, 6)}`

    // 2. Create the order with mandatory Import Flow fields
    const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Authorization': razorpayAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount:      parseInt(amountStr, 10) * 100, // paise
        currency:    'INR',
        receipt:     `jl_${user.id.slice(0, 8)}_${Date.now()}`,
        customer_id: customerId,
        customer_details: {
          name:    c.name,
          email,
          contact: c.contact,
          shipping_address: {
            line1:   c.line1,
            line2:   c.line2 || c.line1,
            city:    c.city,
            country: 'IND',
            state:   c.state,
            zipcode: c.zipcode,
          },
        },
        // Server-set notes — the webhook resolves the buyer + billing from here
        // (untampered). Used to render the Razorpay invoice PDF later.
        notes: {
          user_id:        user.id,
          credits:        String(credits),
          amount_inr:     amountStr,
          invoice_number: invoiceNumber,
          c_name:         c.name,
          c_contact:      c.contact,
          c_address:      `${c.line1}${c.line2 ? ', ' + c.line2 : ''}, ${c.city}, ${c.state} ${c.zipcode}, India`,
        },
      }),
    })

    if (!orderRes.ok) {
      console.error('[razorpay/order] order create failed:', orderRes.status, await orderRes.text())
      return NextResponse.json({ error: 'Could not create order' }, { status: 502 })
    }

    const order = await orderRes.json()
    return NextResponse.json({
      orderId:       order.id,
      amount:        order.amount,
      currency:      order.currency,
      keyId:         process.env.RAZORPAY_KEY_ID,
      customerId,
      invoiceNumber,
      credits,
    })
  } catch (err) {
    console.error('[razorpay/order]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
