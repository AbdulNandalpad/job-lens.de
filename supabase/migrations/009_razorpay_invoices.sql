-- Persist billing details + invoice metadata for Razorpay invoice-collection
-- (SFTP upload). These are needed to render the per-transaction PDF invoice
-- Razorpay requires for Import Flow go-live.
alter table public.purchase_events
  add column if not exists invoice_number      text,
  add column if not exists customer_name       text,
  add column if not exists customer_address    text,
  add column if not exists customer_contact    text,
  add column if not exists invoice_uploaded     boolean not null default false,
  add column if not exists invoice_uploaded_at  timestamptz;

-- Fast lookup for the uploader: paid Razorpay rows not yet sent to SFTP.
create index if not exists purchase_events_invoice_pending_idx
  on public.purchase_events (invoice_uploaded)
  where razorpay_payment_id is not null and invoice_uploaded = false;
