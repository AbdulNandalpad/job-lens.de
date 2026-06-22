// Razorpay invoice-collection uploader.
// Polls Supabase for paid Razorpay transactions with no invoice yet, renders a
// PDF invoice per transaction, and SFTPs it to Razorpay. Marks each row uploaded.
//
// Runs on a host with a STATIC outbound IP (whitelisted with Razorpay).
// `npm start` polls forever; `npm run once` does a single pass (for cron).

const { createClient } = require('@supabase/supabase-js')
const ws = require('ws')
const PDFDocument = require('pdfkit')
const SftpClient = require('ssh2-sftp-client')

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  RAZORPAY_MID,
  SFTP_HOST = 'sftp.razorpay.com',
  SFTP_PORT = '22',
  SFTP_USER,
  SFTP_PRIVATE_KEY,            // PEM contents of the private key
  BUSINESS_NAME,
  BUSINESS_ADDRESS,
  INVOICE_TAX_NOTE = 'Tax: INR 0.00 (export of services)',
  POLL_INTERVAL_MS = '600000', // 10 min
} = process.env

const required = { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RAZORPAY_MID, BUSINESS_NAME, BUSINESS_ADDRESS }
for (const [k, v] of Object.entries(required)) {
  if (!v) { console.error(`[invoice] missing env ${k}`); process.exit(1) }
}
if (!SFTP_USER || !SFTP_PRIVATE_KEY) {
  console.log('[invoice] SFTP_USER or SFTP_PRIVATE_KEY not set yet — standing by, will retry on next poll')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
})

const inr = (rupees) => `INR ${Number(rupees || 0).toFixed(2)}`
const ymd = (d) => new Date(d).toISOString().slice(0, 10)

// Render a single invoice to a PDF Buffer.
function renderInvoice(row) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const invNo = row.invoice_number || row.razorpay_order_id || row.razorpay_payment_id
    const date  = ymd(row.created_at)

    doc.fontSize(20).text(BUSINESS_NAME, { continued: false })
    doc.fontSize(9).fillColor('#555').text(BUSINESS_ADDRESS)
    doc.moveDown()

    doc.fillColor('#000').fontSize(16).text('TAX INVOICE')
    doc.moveDown(0.5)
    doc.fontSize(10)
    doc.text(`Invoice number: ${invNo}`)
    doc.text(`Invoice date: ${date}`)
    doc.text(`Razorpay Payment ID: ${row.razorpay_payment_id}`)
    doc.moveDown()

    doc.fontSize(11).text('Bill to:')
    doc.fontSize(10).fillColor('#333')
    doc.text(row.customer_name || '—')
    if (row.customer_address) doc.text(row.customer_address)
    if (row.customer_contact) doc.text(`Phone: ${row.customer_contact}`)
    doc.moveDown()

    // Line item
    doc.fillColor('#000').fontSize(11).text('Description', 50, doc.y, { width: 320, continued: true })
      .text('Qty', 370, doc.y, { width: 70, continued: true })
      .text('Amount', 440, doc.y, { width: 100 })
    doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke('#ccc')
    doc.moveDown(0.5)
    doc.fontSize(10)
      .text(`${row.credits_added} AI credits — Job-Lens`, 50, doc.y, { width: 320, continued: true })
      .text(String(row.credits_added), 370, doc.y, { width: 70, continued: true })
      .text(inr(row.amount_inr), 440, doc.y, { width: 100 })
    doc.moveDown(1.5)

    doc.fontSize(10).text(INVOICE_TAX_NOTE)
    doc.fontSize(12).text(`Total: ${inr(row.amount_inr)}`, { align: 'right' })
    doc.moveDown(2)
    doc.fontSize(8).fillColor('#888').text('This is a computer-generated invoice.', { align: 'center' })

    doc.end()
  })
}

async function processBatch() {
  if (!SFTP_USER || !SFTP_PRIVATE_KEY) { console.log('[invoice] SFTP not configured yet — skipping'); return }
  const { data: rows, error } = await supabase
    .from('purchase_events')
    .select('id, razorpay_payment_id, razorpay_order_id, amount_inr, credits_added, invoice_number, customer_name, customer_address, customer_contact, created_at')
    .not('razorpay_payment_id', 'is', null)
    .eq('invoice_uploaded', false)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) { console.error('[invoice] query failed:', error.message); return }
  if (!rows || rows.length === 0) { console.log('[invoice] nothing to upload'); return }

  const sftp = new SftpClient()
  await sftp.connect({
    host: SFTP_HOST,
    port: parseInt(SFTP_PORT, 10),
    username: SFTP_USER,
    privateKey: SFTP_PRIVATE_KEY,
  })

  try {
    for (const row of rows) {
      try {
        const invNo = row.invoice_number || row.razorpay_order_id || row.razorpay_payment_id
        const dir   = `/invoiceUpload/automated/${RAZORPAY_MID}/${ymd(row.created_at)}`
        const dest  = `${dir}/${invNo}.pdf`

        const pdf = await renderInvoice(row)
        try { await sftp.mkdir(dir, true) } catch (_) { /* dir may exist */ }
        await sftp.put(pdf, dest)

        await supabase
          .from('purchase_events')
          .update({ invoice_uploaded: true, invoice_uploaded_at: new Date().toISOString() })
          .eq('id', row.id)

        console.log(`[invoice] uploaded ${dest}`)
      } catch (rowErr) {
        console.error(`[invoice] row ${row.id} failed:`, rowErr.message)
      }
    }
  } finally {
    await sftp.end()
  }
}

async function main() {
  const once = process.argv.includes('--once')
  if (once) { await processBatch(); return }

  console.log('[invoice] uploader started — polling every', POLL_INTERVAL_MS, 'ms')
  await processBatch()
  setInterval(() => { processBatch().catch(e => console.error('[invoice] batch error:', e.message)) }, parseInt(POLL_INTERVAL_MS, 10))
}

main().catch(e => { console.error('[invoice] fatal:', e); process.exit(1) })
