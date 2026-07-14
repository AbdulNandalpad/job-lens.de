# Job-Lens — Technical Documentation

**Version:** 1.0  
**Last updated:** 2026-05-19  
**Author:** Munira Nandalpad  
**Stack:** Next.js 16, Supabase, Anthropic Claude, Vercel

> **Active TODO list**: see `PROGRESS.md → Active TODO` for the pinned, numbered list of in-flight product/eng work (CV Builder quality, prompt/token discipline, observability, security, Kira flexibility, job search params, deterministic AI output, CV render styling, Job Case confetti).

---

## 1. Concept & Vision

Job-Lens is an AI-powered job application platform built to solve a universal problem: the gap between a candidate's raw CV and what recruiters and Applicant Tracking Systems (ATS) actually want to see.

The core insight driving the product: most job seekers send the same CV to every application and get rejected before a human ever reads it. Job-Lens combines AI career analysis, ATS optimisation, real-time job matching, CV tailoring, cover letter generation, and now CV building with one-click PDF export — all in a single cohesive flow.

### Two Markets, One Codebase

The platform serves two distinct markets from a single Next.js application:

| Market | Route prefix | Accent colour | Payment | Credit pool |
|--------|-------------|---------------|---------|-------------|
| DACH (Germany, Austria, Switzerland) | `/app/*` | Blue `#378ADD` | PayPal | `eu_credits` |
| India | `/in/*` | Saffron `#FF9933` | Razorpay (planned) | `in_credits` |

Both markets share the same authentication system, credit engine, and AI backbone. Market-specific features (visa check for DACH, ATS scan for India) are isolated in their own routes and components.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                        Vercel Edge                       │
│  middleware.ts — geo routing, auth guard, block check    │
└───────────┬─────────────────────────────────────────────┘
            │
┌───────────▼─────────────────────────────────────────────┐
│                   Next.js App Router                     │
│                                                          │
│  /app/*  (DACH)          /in/*  (India)                  │
│  ├── career-scan         ├── career-scan                 │
│  ├── jobs                ├── jobs                        │
│  ├── cv-builder          ├── cv-builder                  │
│  ├── cover-letter        ├── cover-letter                │
│  ├── smart-apply         ├── profile-analysis            │
│  ├── visa                ├── visa                        │
│  ├── zeugnis             └── tracker                     │
│  ├── tracker                                             │
│  └── account                                             │
│                                                          │
│  /api/*  (Server-side API routes)                        │
│  /adminn  (Admin dashboard — email-gated)                │
└───────────┬─────────────────────────────────────────────┘
            │
┌───────────▼───────────┐  ┌──────────────────────────────┐
│  Supabase             │  │  Anthropic Claude API         │
│  • Auth (Google OAuth)│  │  • claude-sonnet-4-6          │
│  • profiles table     │  │  • claude-haiku-4-5-20251001  │
│  • usage_events table │  │                               │
│  • purchase_events    │  └──────────────────────────────┘
│  • ip_credit_grants   │
└───────────────────────┘
```

### Key Architectural Decisions

- **Server Components where possible** — data fetching happens server-side; only interactive UI is client components
- **API routes for AI calls** — all Anthropic and external API calls go through Next.js API routes to keep keys server-side
- **Supabase SSR** — session cookies are managed by `@supabase/ssr`, not localStorage, for security
- **Service role key** — only used in API routes and middleware; never exposed to the browser
- **No ORM** — direct Supabase JS client with typed queries

---

## 3. Database Schema

### `profiles` table
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Matches `auth.users.id` |
| `email` | text | Raw email from OAuth |
| `normalized_email` | text | Gmail dot/alias normalised email |
| `full_name` | text | From Google OAuth metadata |
| `avatar_url` | text | From Google OAuth metadata |
| `market` | text | `'de'` or `'in'` — last login market |
| `credits` | int | Free / common credit pool |
| `eu_credits` | int | PayPal-purchased EU credits |
| `in_credits` | int | Razorpay-purchased India credits |
| `status` | text | `'active'`, `'blocked'`, `'duplicate'`, `'ip_flagged'` |
| `created_at` | timestamptz | Account creation time |
| `paypal_payer_email` | text | Stored from PayPal IPN |

### `usage_events` table
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `user_id` | uuid (FK) | References `profiles.id` |
| `action` | text | e.g. `career_scan`, `tailor_cv`, `refund_career_scan` |
| `credits_used` | int | Credits consumed (negative for refunds) |
| `created_at` | timestamptz | Event time |

### `purchase_events` table
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `user_id` | uuid (FK) | References `profiles.id` |
| `paypal_txn_id` | text | PayPal IPN transaction ID (unique — idempotency key) |
| `paypal_payer_email` | text | Buyer email from PayPal |
| `amount_eur` | numeric | Amount paid in EUR |
| `credits_added` | int | Credits granted |
| `created_at` | timestamptz | Purchase time |

### `ip_credit_grants` table
| Column | Type | Description |
|--------|------|-------------|
| `ip` | text | Client IP address |
| `user_id` | uuid | User who received the grant |
| `granted_at` | timestamptz | When the grant was made |

---

## 4. Authentication & Security

### OAuth Flow
1. User clicks "Sign in with Google" on `/login` or `/in/login`
2. Login page sets a `jl_login_next` cookie (the intended destination)
3. Supabase redirects to Google OAuth
4. Google redirects to `/auth/callback?code=…`
5. Callback exchanges code for session, runs fraud checks, creates profile
6. User is redirected to their intended page

### Fraud Prevention (auth callback)
Two checks run on every new account before granting free credits:

1. **Gmail normalisation** — `john.doe+alias@gmail.com` and `johndoe@gmail.com` map to the same canonical form (`johndoe@gmail.com`). If a profile already exists with the same normalised email, the account is created with `status='duplicate'` and 0 credits.

2. **IP rate limiting** — A rolling 30-day window tracks how many accounts received free credits from a given IP. After 2 grants, subsequent accounts from that IP receive 0 credits and `status='ip_flagged'`.

### Credit System
Three pools exist per user:

```
common credits (free)  →  eu_credits (PayPal)  →  in_credits (Razorpay)
```

Drain order on each AI action: common first, then native-market paid, then cross-market paid.

Admin accounts (defined in `ADMIN_EMAILS` env var) bypass credit checks entirely and are never billed.

### Route Protection
The `middleware.ts` enforces:
- Unauthenticated users hitting `/app/*` or `/in/*` are redirected to the appropriate login page
- Blocked users (`status='blocked'`) are bounced to the login page with an error flag
- IP geo-routing: India IPs (Vercel `x-vercel-ip-country: IN`) are redirected from `/` to `/in`

---

## 5. API Routes Reference

### `/api/extract-pdf` POST
**Auth:** Required  
**Purpose:** Extracts text from PDF, DOCX, or TXT files uploaded by the user  
**Max file size:** 10 MB  
- TXT → UTF-8 decode
- DOCX → mammoth library
- PDF → Claude Haiku via document API (base64)  
**No credit cost** — used as input for other paid features

### `/api/career-scan` POST
**Auth:** Required  
**Cost:** 2 credits (EU market)  
**Purpose:** DACH career analysis — scores CV against a target role using Claude Sonnet  
**Returns:** Score, market fit, keyword score, salary range (EUR/CHF), strengths, gaps, quick wins, career path steps, AI vulnerability score, roast lines, domain mismatch flag  
**Refund policy:** Credits refunded if JSON parse fails or input is empty

### `/api/india/career-scan` POST
**Auth:** Required  
**Cost:** 2 credits (India market)  
**Purpose:** ATS scan — compares CV against a job description  
**Returns:** ATS score, keyword match/gap analysis, format issues, rewrite suggestions, verdict

### `/api/india/career-scan-pro` POST
**Auth:** Required  
**Cost:** 2 credits (India market)  
**Purpose:** Full career analysis for India market (INR salary, Indian job hubs)  
**Returns:** Same schema as DACH career scan but calibrated for India (CTC in INR lakhs)

### `/api/tailor-cv` POST
**Auth:** Required  
**Cost:** 1 credit  
**Two modes:**
- **JSON mode** (`returnJson: true`) — extracts and structures CV into `CVData` schema for visual builder
- **Plain text mode** — rewrites CV text targeting a specific job  
**Parameters:** `cvText`, `job`, `template`, `tone`, `pages`, `lang`, `market`, `systemPrompt` (JSON mode), `feedback`, `currentCv`

### `/api/cover-letter` POST
**Auth:** Required  
**Cost:** 1 credit  
**Purpose:** Generates a personalised cover letter  
**Parameters:** `cvText`, `job`, `tone` (formal/warm/confident), `length` (short/medium/long), `lang` (EN/DE), `market`, `feedback`, `currentLetter`

### `/api/visa` POST
**Auth:** Required  
**Cost:** 1 credit (EU market)  
**Purpose:** Analyses German visa eligibility based on applicant profile  
**Returns:** Visa options (EU Blue Card, Fachkraft, Chancenkarte, Anerkennung), match scores, Chancenkarte points, document checklist  
**Note:** `usefulLinks` is always overridden with hardcoded verified official URLs — Claude is never trusted to generate URLs

### `/api/zeugnis` POST
**Auth:** Required  
**Cost:** 1 credit (EU market)  
**Purpose:** Decodes German Arbeitszeugnisse (coded employment reference letters)  
**Returns:** Grade (1–5), decoded phrase meanings, red flags, missing phrases, legal correction grounds

### `/api/jobs` GET
**Auth:** Required  
**Purpose:** Job search via Adzuna API  
**Parameters:** `q` (query), `location`, `country` (validated against allowlist), `max_days_old`, `page`  
**Country allowlist:** de, at, ch, gb, in, us, au, ca, fr, nl, pl, sg, nz, za, br, ru

### `/api/analyse-profile` POST
**Auth:** Required  
**Purpose:** Extracts job search profile from CV for Adzuna query generation  
**Uses Claude Haiku** — lightweight, fast, no credit cost

### `/api/cv/pdf` POST
**Auth:** Required  
**Purpose:** Generates a downloadable PDF from structured `CVData`  
**Uses:** `@react-pdf/renderer` (server-side, pure vector PDF — no canvas/slicing)  
**Photo limit:** 3 MB base64 string  
**Returns:** Binary PDF stream with `Content-Disposition: attachment`

### `/api/paypal/webhook` POST
**Auth:** None (PayPal IPN — IP not predictable)  
**Security:** IPN verified against PayPal's verification endpoint, UUID format check on userId, idempotency check on `txn_id`  
**Packs:** €4.99 = 20 credits, €12.99 = 60 credits, €24.99 = 150 credits

### `/api/admin/users` GET / PATCH
**Auth:** Admin email check (not just Supabase session — compared against `ADMIN_EMAILS` env var)  
**GET:** Lists all users with credit balances and usage  
**PATCH:** Block/unblock user or adjust free credits (bounded 0–10000)

### `/api/admin/purchases` GET
**Auth:** Admin only  
**Purpose:** Lists PayPal purchase history

### `/api/india/market-snapshot` GET
**Auth:** None (public market data, cached 4 hours)  
**Purpose:** Live India job market breakdown by category and city via Adzuna

### `/api/india/news-insights` GET
**Auth:** None (public news data, cached 6 hours)  
**Purpose:** India tech job market news via NewsAPI

### `/api/user/profile` GET
**Auth:** Required  
**Purpose:** Returns authenticated user's credit balances and usage history

---

## 6. CV Builder

### DACH CV Builder (`/app/cv-builder`)
- Reads `jl_cvb_job` and `jl_sjs_cv_text` from sessionStorage
- Sends CV + job to `/api/tailor-cv` in JSON mode to extract structured `CVData`
- Three visual templates: Clean, Professional, Executive
- Accent colour: Blue `#378ADD`
- Feedback loop: user can type requested changes, re-submits to AI to refine
- Downloads via `/api/cv/pdf` → server-rendered PDF

### India CV Builder (`/in/cv-builder`)
- Six visual templates: Clean, Saffron, Classic, Modern, Executive, Executive II
- Photo upload: FileReader converts to base64 data URL, shown in preview and embedded in PDF
- Accent colour: Saffron `#FF9933`
- **Executive template** — premium design with gradient header accent, career history section, period badges, dot expertise indicators, inline language levels
- **Executive II template** — DACH-inspired; wide 240px gradient sidebar (dark navy/brown), skill bars with % labels, 5-dot language indicators, timeline experience with vertical connector line, Core Stack chip row

### CVData Schema
```typescript
interface CVData {
  name: string
  title: string
  tagline: string
  email: string
  phone: string
  location: string
  linkedin: string
  summary: string
  stats: { label: string; value: string }[]
  skills: { name: string; level: number }[]
  experience: { role: string; company: string; period: string; location: string; type: string; bullets: string[] }[]
  education: { degree: string; school: string; year: string }[]
  certifications: string[]
  languages: { name: string; level: number }[]
  tools: string[]
  highlights: string[]
}
```

### PDF Generation
The old approach (html2canvas + jsPDF) caused overlapping text at page boundaries because it sliced a canvas screenshot. This was replaced with `@react-pdf/renderer`:
- Pure vector PDF layout — no canvas, no slicing
- Runs server-side only in `/api/cv/pdf` to avoid webpack bundling issues with native Node.js dependencies (fontkit, brotli)
- Client sends `CVData` JSON; server returns binary PDF
- `toBlob().arrayBuffer()` used instead of `toBuffer()` (the latter has incorrect TypeScript types in the library)

---

## 7. Session Storage Flow

All inter-page data is passed via `sessionStorage` using constants from `src/lib/constants.ts`:

```
DACH:
career-scan → [jl_cv_text, jl_target_role]
smart-apply → [jl_cvb_job, jl_sjs_cv_text]
cv-builder  → [jl_cvb_tailored, jl_cvb_data, jl_cvb_job]
cover-letter → [jl_cl_letter]
apply-now   reads [jl_cl_letter, jl_cvb_job]

India:
in/jobs     → [jl_in_selected_job]
in/cv-builder → [jl_cvb_tailored, jl_cvb_data]
in/cover-letter → [jl_cl_letter]
```

`clearSession()` in both navbars clears all `jl_*` keys and reloads.

---

## 8. Frontend Structure

### Theming (`src/lib/theme.ts`)
All colours, gradients, fonts, and shadows are exported from a single file. No hardcoded hex values in component files.

```typescript
c.accent     // Market accent colour
c.navy       // Deep navy for headers
g.sidebar    // linear-gradient(180deg, #152233 0%, #0e1a28 100%)
gl.card      // Glass card style
f.heading    // Heading font stack
sh.card      // Box shadow for cards
```

### Internationalisation (`src/lib/i18n/`)
DACH pages support DE/EN toggle. All user-visible strings live in `translations.ts`. India pages are English-only.

### Mobile Responsiveness
- Breakpoint: `768px`
- CSS class conventions: `.jl-dsb` (desktop only), `.jl-mob` (mobile only), `.jl-mbtn` (mobile button)
- CV builder uses `CVScaleWrapper` — `transform: scale()` + `ResizeObserver` to fit preview in any viewport

### Analytics
- `@vercel/analytics` — page view tracking (Next.js native integration)
- `@vercel/speed-insights` — Core Web Vitals monitoring

---

## 9. Admin Dashboard (`/adminn`)

Email-gated behind `ADMIN_EMAILS` environment variable. Features:
- Full user table: email, credits breakdown (common/EU/India), status, total AI calls
- Block/unblock users
- Adjust free credit balance
- Purchase history (PayPal transactions)
- Admin accounts shown with unlimited credits (9999) and never charged

---

## 10. External Services

| Service | Purpose | Auth method |
|---------|---------|-------------|
| Anthropic Claude | AI analysis, CV tailoring, cover letters, PDF extract | API key (server-side only) |
| Supabase | Auth, database, storage | Anon key (client) + Service role key (server) |
| Adzuna | Job search (DACH + India) | App ID + App key (server-side only) |
| PayPal IPN | Payment webhooks | IPN verification (no key required) |
| NewsAPI | India market news insights | API key (server-side only) |
| Vercel | Hosting, edge, analytics, speed insights | Implicit (project linked) |

---

## 11. Security Model

### Authentication & Authorisation
- All AI-calling API routes require a valid Supabase session
- Admin routes additionally verify the authenticated user's email against `ADMIN_EMAILS`
- Middleware enforces auth at the Next.js edge layer
- Service role key never sent to browser; only used server-side

### Input Validation
- File upload: 10 MB max, auth required
- CV photo in PDF: 3 MB base64 max
- Admin credit adjustment: bounded 0–10000, must be finite integer
- PayPal userId: validated as UUID format before any DB write
- Adzuna country parameter: validated against explicit allowlist

### Fraud Prevention
- Gmail normalisation prevents dot/alias account farming
- IP-based rate limit on free credit grants (2 per IP per 30 days)
- User status can be set to `blocked` — checked at middleware and in `checkAndDeductCredits`

### PayPal Security
- IPN verified against PayPal's own verification endpoint (`ipnpb.paypal.com`)
- `txn_id` idempotency check prevents duplicate credit grants from IPN retries
- UUID format validation on `custom` (userId) field
- User existence verified in DB before any credit write

### Prompt Safety
- AI system prompts are server-defined constants, not user-controlled (except `systemPrompt` in tailor-cv JSON mode, which is sent from client but bounded by Claude's own safety layer)
- All AI JSON responses are parsed with structural validation and field clamping — raw model output is never returned directly to the client
- `usefulLinks` in visa responses are hardcoded server-side — Claude is never trusted to generate URLs

---

## 12. Environment Variables

```env
SUPABASE_SERVICE_ROLE_KEY         # Server-only, never exposed to browser
NEXT_PUBLIC_SUPABASE_URL          # Public Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     # Public anon key (safe to expose)
ANTHROPIC_API_KEY                 # Server-only
ADZUNA_APP_ID                     # Server-only
ADZUNA_APP_KEY                    # Server-only
NEWS_API_KEY                      # Server-only (India news insights)
ADMIN_EMAILS                      # Comma-separated admin email list
NEXT_PUBLIC_PAYPAL_EMAIL          # PayPal merchant email (shown in UI)
PAYPAL_SANDBOX                    # 'true' for sandbox, 'false' for production
NEXT_PUBLIC_APP_URL               # Canonical app URL
NEXT_PUBLIC_AUTO_APPLY_ENABLED    # Local only — enables Playwright auto-apply
```

---

## 13. Dependencies

| Package | Purpose |
|---------|---------|
| `next` 16.2.6 | App framework |
| `react` 19.2.4 | UI library |
| `@anthropic-ai/sdk` | Anthropic Claude API client |
| `@supabase/ssr` + `@supabase/supabase-js` | Supabase auth + database |
| `@react-pdf/renderer` | Server-side PDF generation |
| `mammoth` | DOCX text extraction |
| `pdf-parse` | PDF text extraction fallback |
| `playwright` | Auto-apply browser automation (local only) |
| `docx` | Word document generation |
| `html2canvas` + `jspdf` | Legacy (now unused — replaced by react-pdf) |
| `@vercel/analytics` | Page view tracking |
| `@vercel/speed-insights` | Core Web Vitals monitoring |
| `axios` | HTTP client |

---

## 14. Deployment

- **Platform:** Vercel
- **Node.js runtime:** 18.x
- **Build command:** `npm run build`
- **Playwright note:** Auto-apply uses Chromium via Playwright which exceeds Vercel's 50 MB function size limit. This feature is disabled in production (`NEXT_PUBLIC_AUTO_APPLY_ENABLED` must be `true` locally).

---

## 15. Known Limitations & Planned Work

| Item | Status |
|------|--------|
| Razorpay integration for India credits | Planned |
| India career-scan not yet in main navigation | In code, not linked |
| Google OAuth shows Supabase domain (not job-lens.de) | Requires Supabase Pro custom domain |
| Auto Apply is local-only | Playwright too large for Vercel |
| Cover letter lazy generation | Deferred — user must trigger manually |
| DACH German language toggle | Partially implemented |
