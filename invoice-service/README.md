# Job-Lens Invoice Service (Razorpay invoice-collection)

Standalone Node worker. Polls Supabase for paid Razorpay transactions with no
invoice yet, renders a PDF invoice per transaction, and SFTPs it to Razorpay at
`/invoiceUpload/automated/<MID>/YYYY-MM-DD/<invoiceNumber>.pdf`.

**Must run on a host with a static outbound IP** (the IP whitelisted with
Razorpay). Not deployable on Vercel (no static egress).

## Env vars
| Var | Notes |
|---|---|
| `SUPABASE_URL` | same as the app |
| `SUPABASE_SERVICE_ROLE_KEY` | service role (reads/updates purchase_events) |
| `RAZORPAY_MID` | your Razorpay Merchant ID (in the SFTP path) |
| `SFTP_HOST` | default `sftp.razorpay.com` |
| `SFTP_PORT` | default `22` |
| `SFTP_USER` | username Razorpay gives you |
| `SFTP_PRIVATE_KEY` | PEM contents of the private key (public key is shared with Razorpay) |
| `BUSINESS_NAME` | your legal business name (invoice header) |
| `BUSINESS_ADDRESS` | your registered business address |
| `INVOICE_TAX_NOTE` | tax line, default `Tax: INR 0.00 (export of services)` |
| `POLL_INTERVAL_MS` | default `600000` (10 min) |

## Run
- `npm start` — polls forever (deploy as a long-running service)
- `npm run once` — single pass (for an external cron)

## SSH key
Generate locally; give Razorpay the **public** key + your host's static IP(s):
```
ssh-keygen -t ed25519 -C "job-lens-razorpay-sftp" -f razorpay_sftp_key
```
Put the **private** key (contents of `razorpay_sftp_key`) in `SFTP_PRIVATE_KEY`.
