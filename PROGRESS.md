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

### Item 10 detail — saved CV

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
