# Job-Lens — Design Progress

## Active TODO — pinned, tracked until all items are done

Numbering is stable — refer to items by number in future chats so we can pick up where we left off.

| # | Item | Status |
|---|------|--------|
| 1 | Tighten CV Builder — better UI/design and better prompts so the tailored CV output is the best possible match for the job | In progress — see below |
| 2 | Inject intent/context into AI prompts without inflating token usage, and ensure the right CV comes out the other end | Not started |
| 3 | Add observability and guardrails (logging, tracing, rate/abuse limits, output validation) across AI routes | Not started |
| 4 | Increase security and data encryption further | Ongoing — app-level AES-256-GCM encryption shipped for `user_memories`, `job_cases`, `proof_items`, `training_feedback`; key rollout + backfill still pending on production |
| 5 | Give Kira more flexibility (broader tool use / less rigid conversation flow) | Not started |
| 6 | Tighten job search with the right search parameters | Not started |
| 7 | Make scanner + CV generation deterministic — same input should give the same output every time, not a different answer per run | Not started |
| 8 | Fix CV generation styles — correct padding/spacing when a line break occurs | ✅ Done — added `whiteSpace: 'pre-wrap'` to all 4 CV templates' summary + bullet text renders (`src/app/app/cv-builder/page.tsx`), which were silently collapsing embedded line breaks from the AI output |
| 9 | Job Case: confetti animation when a case is successfully created | ✅ Done — `src/lib/confetti.ts` (zero-dependency canvas confetti), fired in `src/app/app/job-case/new/page.tsx` on `step === 'done'` |
| 10 | One saved CV across the platform (Account settings) instead of re-uploading on every page | In progress — see below |
| 11 | Job Case: full audit against its documented GDPR design + make the recruiter-facing page a genuinely better CV replacement | In progress — see below |

### Item 11 detail — Job Case audit + recruiter page

Full audit of all 13 Job Case API routes + schema against the GDPR design documented in `004_job_cases.sql`'s comments. Found and fixed 4 real bugs:
- `recruiter-interest` was completely broken — wrote to `case_views` columns (`recruiter_email`, `interest_expressed_at`, `consent_given_at`) and a `job_cases.status` value (`'interested'`) that never existed in the schema. Every call threw a Postgres error. Fixed by migration `014_job_case_recruiter_interest.sql` (adds the columns, extends the status CHECK) — **needs to be run in Supabase**. `recruiter_email` is now also encrypted at rest.
- The 30-day auto-deletion cron (`/api/cron/cleanup-expired-cases`) existed but had no `vercel.json` registering it as scheduled — likely never actually ran. Added `vercel.json` with the documented `0 2 * * *` schedule; route now accepts Vercel's auto-injected `Authorization: Bearer $CRON_SECRET` header. **Needs `CRON_SECRET` confirmed set in Vercel env vars.**
- Candidates could get duplicate/misleading "your case was viewed" emails (one on link *request*, one on link *click*) — removed the premature request-time send.
- The schema's granular 3-part consent design (`consent_video`/`test`/`tracking`) was defeated by a hardcoded `{video:true,test:true,tracking:true}` in both DACH and India create-case calls, ignoring the real checkbox state. Now sends and persists the actual per-item values.

Also shipped: an "at a glance" stat strip (requirements verified X/Y, evidence count, test score) + a one-line trust/methodology note on the recruiter-facing `/case/[slug]` page, so a recruiter skimming for a few seconds gets CV-equivalent headline numbers without reading every requirement row.

**Still open** (deferred per user's own prioritization): matching/pitch prompt quality, a PDF/CV export fallback for ATS systems that require a traditional upload, and clearer on-site positioning of Job Case vs. CV Builder.

- Migration `013_saved_cv.sql`: `profiles.cv_text` (encrypted), `cv_file_name`, `cv_updated_at`, `cv_consent_at`
- `/api/user/cv` (GET/POST/DELETE) — encrypts with the same AES-256-GCM lib as migration 012; POST requires `consent: true`
- `src/lib/useSavedCv.ts` — read hook for any page to consume
- Account page (`src/app/app/account/page.tsx`) — new "Saved CV" card: upload with mandatory consent checkbox, replace, remove
- GDPR text updated: `datenschutz/page.tsx` §2f, `privacy/page.tsx` §2g
- Wired into `career-scan/page.tsx` and `cv-builder/page.tsx` as a "Use my saved CV" quick action when no CV is in the current session
- **Still open**: wire the same quick action into `cover-letter`, `job-case/new`, `smart-apply`, `auto-apply`, `ai` (Kira), and the India equivalents; consider an "update my saved CV" prompt after a fresh upload elsewhere so it doesn't silently go stale
- Migration 013 run in Supabase ✅, `ENCRYPTION_KEY` set on Vercel ✅ and confirmed working live ✅

### Item 1 detail — CV Builder tightening

- Fixed a real anti-hallucination gap in the structured-JSON prompt (`src/app/api/tailor-cv/route.ts`, MODE 1 — what CV Builder actually calls): the old prompt asked for "3-5 impressive metrics" with no requirement they come from the source CV. Now every stat/skill-level/highlight/bullet must be traceable to the source; if there's nothing to quantify, fewer stats rather than a fabricated one.
- Added explicit ATS keyword-matching instruction to MODE 1 (mirror job-description terminology into skills/tools/bullets, but only where the candidate has genuine evidence of that skill — never insert an unearned keyword)
- Added relevance ordering: skills and bullets now ordered by relevance to the target job when one is provided
- Added a 1-page / 2-page length control to the CV Builder sidebar (Style panel, next to Tone) — previously the JSON mode had no length control at all, unlike the older plain-text mode
- Feedback-edit mode (iterative "apply this change") now also carries the no-new-fabricated-metrics rule and holds the length target across edits
- When a job description is given, the prompt now instructs a full revamp (re-derived summary, re-ordered skills, rewritten bullets) instead of a light edit — still 100% grounded in the source CV
- New "matchGaps" field in the CV schema + "Job Match" sidebar panel: for job requirements not evidenced in the source CV, shows what's missing, what the tailored CV did instead, and what the candidate could add to fully close the gap — each flagged with `***` per request
- **Still open**: template/section visual design pass (spacing, hierarchy, template variety) hasn't been touched yet; the "better UI/design" half of item 1 (beyond the new gap panel) is still open



## Done

| Page | Status |
|------|--------|
| Home / Landing (`src/app/page.tsx`) | ✅ Full redesign — mesh gradient hero, glass stats strip, feature cards with gradient hover border, How it works section, Auto Apply marketing, dark CTA block |
| Navbar (`src/app/app/components/Navbar.tsx`) | ✅ Theme tokens, gradient active pill, Auto Apply gated by `NEXT_PUBLIC_AUTO_APPLY_ENABLED` |
| Apply Now (`src/app/app/apply-now/page.tsx`) | ✅ Theme tokens, accent header, gradient buttons, progress tracker |
| Auto Apply (`src/app/app/auto-apply/page.tsx`) | ✅ Theme tokens, accent header, gradient buttons, production guard |
| Tracker (`src/app/app/tracker/page.tsx`) | ✅ Theme tokens, accent header, stat cards with colored top borders |

## Pending — inner app pages redesign

These four pages still use the old style: hard table borders, Excel-like grid layout, hardcoded colors.  
Full redesign planned — use Apply Now as the reference for the new style.

| Page | Path |
|------|------|
| Career Scan | `src/app/app/career-scan/page.tsx` |
| Smart Job Search | `src/app/app/smart-apply/page.tsx` |
| CV Builder | `src/app/app/cv-builder/page.tsx` |
| Cover Letter | `src/app/app/cover-letter/page.tsx` |

## Design system

All tokens in `src/lib/theme.ts`. Never hardcode hex — always import from theme.  
Inner page header convention: `paddingLeft: 14, borderLeft: \`3px solid \${c.accent}\``
