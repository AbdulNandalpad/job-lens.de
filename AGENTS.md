# Job-Lens AI — Agent Instructions

## 1. CRITICAL: Do not hallucinate

Before writing ANY code, check that the thing you are referencing actually exists:

- **API routes** — only the routes listed in `src/lib/constants.ts → API` exist. Do not invent new routes. Do not call `/api/something` unless you can find `src/app/api/something/route.ts`.
- **sessionStorage keys** — only the keys in `src/lib/constants.ts → SS` exist. Do not invent new `jl_*` keys. If you need a new key, add it to `SS` first.
- **Components** — check that the component file exists before importing it. Do not import `<SomeComponent>` unless you have confirmed the file exists.
- **Hooks** — same rule. Do not use `useXxx()` unless `src/lib/useXxx.ts` or `src/hooks/useXxx.ts` exists.
- **DB columns** — the `profiles` table has: `id`, `credits`, `eu_credits`, `in_credits`, `status`, `paypal_payer_email`. Do not reference columns that are not in this list.
- **Theme tokens** — always import from `src/lib/theme.ts`. Never hardcode hex colours.

---

## 2. This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

---

## 3. Project structure

Two market routes share the same codebase:

| Market | Route prefix | Theme colour | Payment |
|--------|-------------|-------------|---------|
| DACH (DE/CH/AT) | `/app/*` | Blue `#378ADD` | PayPal → `eu_credits` |
| India | `/in/*` | Orange `#FF9933` | Razorpay → `in_credits` (coming soon) |

### Key files
- `src/lib/constants.ts` — **all magic numbers, keys, and route strings**
- `src/lib/theme.ts` — all colours, gradients, fonts, shadows
- `src/lib/supabase-server.ts` — `checkAndDeductCredits(userId, cost, action, email?, market)`
- `src/lib/useCredits.ts` — client hook: `credits`, `euCredits`, `inCredits`, `commonCredits`, `needsCrossMarket()`, `crossMarketAmount()`
- `src/components/CrossMarketModal.tsx` — shown before cross-market credit deduction
- `src/lib/i18n/translations.ts` — all UI strings for DE/EN. Do not hardcode user-visible strings on DACH pages.

---

## 4. Credit system rules

- Three pools: `credits` (free/common), `eu_credits` (PayPal), `in_credits` (Razorpay)
- Deduction order: common → native paid → cross-market paid
- Cross-market usage always shows `CrossMarketModal` **before** the action
- Credit costs live in `src/lib/constants.ts → CREDIT_COST`. **Never hardcode a number.**
- Low-credit warning threshold: `src/lib/constants.ts → LOW_CREDIT_WARN` (currently 2)
- Server-side deduction is the source of truth. Client-side checks are for UX only.

---

## 5. sessionStorage page-to-page flow

Data passes between pages via `sessionStorage`. All keys are in `src/lib/constants.ts → SS`.

```
DACH flow:
career-scan ──writes──► jl_cv_text, jl_target_role
                                │
                         smart-apply ──writes──► jl_cvb_job, jl_sjs_cv_text
                                                        │
                                              cv-builder ──writes──► jl_cvb_tailored, jl_cvb_data, jl_cvb_job
                                                                              │
                                                                     cover-letter ──writes──► jl_cl_letter
                                                                              │
                                                                          apply-now (reads jl_cl_letter, jl_cvb_job)

India flow:
in/career-scan ──writes──► jl_cv_text, jl_ats_suggestions
in/jobs        ──writes──► jl_in_selected_job
                    └──► in/cv-builder ──writes──► jl_cvb_tailored, jl_cvb_data
                                   └──► in/cover-letter ──writes──► jl_cl_letter
```

Rules:
- Do not read a key that is not written upstream in the flow above
- Do not add a new key without adding it to `SS` in `constants.ts`
- All keys are prefixed `jl_` — never use bare strings
- `clearSession()` in both navbars clears all `jl_*` keys and reloads the page

---

## 6. API routes — what exists

Only these routes exist under `src/app/api/`:

| Route | Method | Purpose | Market | Cost |
|-------|--------|---------|--------|------|
| `/api/extract-pdf` | POST | Extract text from PDF/DOCX | both | free |
| `/api/career-scan` | POST | AI CV scan + score | eu | 2 |
| `/api/india/career-scan` | POST | ATS scan for India | in | 2 |
| `/api/tailor-cv` | POST | AI CV tailoring | body.market | 1 |
| `/api/cover-letter` | POST | AI cover letter | body.market | 1 |
| `/api/analyse-profile` | POST | Extract CV profile for job search | both | free |
| `/api/jobs` | GET | Adzuna job search | DACH only | free |
| `/api/auto-apply/analyze` | POST | Auto apply form analysis | eu | 3 |
| `/api/user/profile` | GET | Fetch credits + usage log | both | free |
| `/api/paypal/webhook` | POST | PayPal IPN → top up eu_credits | — | — |

Do not call any other `/api/*` path. Do not invent new routes without creating the file.

---

## 7. Styling rules

- **No hardcoded hex colours**. Import `theme` from `src/lib/theme.ts`. Key exports: `c` (colors), `g` (gradients), `gl` (glass), `f` (fonts), `sh` (shadow).
- **Sidebar gradient** (all inner app pages): `linear-gradient(180deg, #152233 0%, #0e1a28 100%)`
- **Page header convention**: `paddingLeft: 14, borderLeft: \`3px solid ${c.accent}\``
- **Mobile breakpoint**: `768px`. CSS classes used: `.jl-dsb` (desktop), `.jl-mob` (mobile), `.jl-mbtn` (mobile button), `.jl-hamburger`, `.jl-desktop-nav`

---

## 8. What NOT to do

- Do not add new npm packages without checking if the functionality already exists in the project
- Do not modify `package.json` without confirming the package is actually needed
- Do not change Supabase schema without noting the required SQL migration
- Do not add `console.log` statements — use `console.error` only for genuine errors
- Do not add comments explaining what the code does — only add comments for non-obvious WHY
- Do not create new API routes that duplicate existing ones
- Do not hardcode market strings `'eu'` or `'in'` inline — use `MARKET.eu` / `MARKET.in` from constants
- Do not hardcode credit numbers inline — use `CREDIT_COST.*` from constants
- Do not hardcode sessionStorage key strings inline — use `SS.*` from constants

---

## 9. Environment variables

Required in `.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
ANTHROPIC_API_KEY
ADZUNA_APP_ID
ADZUNA_APP_KEY
ADMIN_EMAILS=sap.rashid@gmail.com,Abdul.nandalpad@servicesphere.de
NEXT_PUBLIC_PAYPAL_EMAIL=sap.rashid@gmail.com
PAYPAL_SANDBOX=false
NEXT_PUBLIC_APP_URL=https://job-lens.de
NEXT_PUBLIC_AUTO_APPLY_ENABLED=true   ← local only, not on Vercel
```

---

## 10. Known limits

- Auto Apply uses Playwright/Chromium — exceeds Vercel 50MB limit. Local only (`NEXT_PUBLIC_AUTO_APPLY_ENABLED=true`).
- `eu_credits` and `in_credits` columns were added via migration on 2026-05-15 and are live.
- Razorpay integration not yet built — `in_credits` cannot be topped up in production yet.
