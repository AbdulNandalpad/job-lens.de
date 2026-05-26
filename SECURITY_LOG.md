# Job-Lens AI — Security & Fix Log

---

## 2026-05-23 — PayPal Webhook Hardening

**File:** `src/app/api/paypal/webhook/route.ts`

| Severity | Issue | Fix |
|---|---|---|
| 🔴 CRITICAL | No `receiver_email` validation — IPN replay attack possible | Added check: rejects if `receiver_email` ≠ `NEXT_PUBLIC_PAYPAL_EMAIL` |
| 🔴 HIGH | Race condition: credits updated before purchase recorded | Flipped order — `purchase_events` insert happens first; unique `txn_id` constraint is the deduplication gate |
| 🔴 HIGH | Credit update was read-then-write (`eu_credits = current + X`) | Replaced with atomic SQL RPC `increment_eu_credits(user_id, amount)` |
| 🟡 MEDIUM | Empty `txn_id` skipped idempotency check entirely | Now rejects if `txn_id` is missing |
| 🟡 MEDIUM | `upsert` on profiles could create bare row | Changed to `update` — profile existence verified above |

**SQL migration run:** `increment_eu_credits(user_id uuid, amount integer)` — atomically increments `eu_credits` column.

---

## 2026-05-23 — Kira AI Chat Route Hardening

**File:** `src/app/api/ai/chat/route.ts`

| Severity | Issue | Fix |
|---|---|---|
| 🔴 HIGH | No cap on messages array — context explosion + API cost abuse | Capped at last 40 messages per request |
| 🔴 HIGH | Per-message content uncapped — could send 100k-char messages | Each message content capped at 4,000 chars |
| 🔴 HIGH | `ai_message_count` was read-then-write — billing trigger bypassable via concurrent requests | Replaced with atomic SQL RPC `increment_ai_message_count(p_user_id)` |
| 🟡 MEDIUM | `market` field not validated at runtime — TypeScript only | Validated against `MARKET` constants; defaults to `eu` if invalid |
| 🟡 MEDIUM | `mode` field passed through unvalidated | Allowlisted to `cv_discuss` only; anything else treated as default |
| 🟡 MEDIUM | Message `role` field passed directly to Anthropic — could send `role: 'system'` | Filtered to `user` / `assistant` only before forwarding |
| 🟢 LOW | `apply_url` not protocol-validated before rendering as `<a href>` | Server-side: only `http://` and `https://` URLs pass through; empty string otherwise |

**SQL migration run:** `increment_ai_message_count(p_user_id uuid)` — atomically increments `ai_message_count`, returns new value.

---

## 2026-05-23 — STT Route Hardening

**File:** `src/app/api/ai/stt/route.ts`

| Severity | Issue | Fix |
|---|---|---|
| 🔴 HIGH | No file size limit — attacker could upload 24MB files repeatedly (OpenAI Whisper limit 25MB) | Hard 10MB cap; returns 413 if exceeded |
| 🔴 HIGH | No MIME type validation — any file accepted and forwarded to OpenAI | Allowlist: `audio/webm`, `audio/mp4`, `audio/mpeg`, `audio/ogg`, `audio/wav`, `audio/flac`, `audio/x-m4a` |
| 🟡 MEDIUM | `language` param passed through unsanitised | Validated against `/^[a-z]{2}$/` — 2-letter ISO code only |

---

## 2026-05-23 — TTS Route Hardening

**File:** `src/app/api/ai/tts/route.ts`

| Severity | Issue | Fix |
|---|---|---|
| 🟡 MEDIUM | No server-side text length guard (client capped at 800 but server had none) | Hard 1,000 char limit added server-side |

---

## Known Open Items (not yet built)

| Item | Notes |
|---|---|
| Rate limiting on `/api/ai/*` | Needs Redis / Upstash — no per-minute request cap currently |
| TTS usage tracking | Voice calls not counted toward credit usage — potential cost exposure |
| Conversation history trim (client) | Full history sent each turn; should trim to last 30 client-side |
| `checkAndDeductCredits` read-then-write | Credit deduction in `supabase-server.ts` is still read-then-write — low risk since it's guarded by auth + blocked status check |
