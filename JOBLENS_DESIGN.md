# JOBLENS_DESIGN.md
# Read this file first before making any changes to Job-Lens AI

---

## PROJECT OVERVIEW
- **App name:** Job-Lens AI
- **Live URL:** job-lens.de
- **Stack:** Next.js, Supabase, Google OAuth, Anthropic API (Claude), Adzuna Jobs API
- **Local path:** C:\Users\Abdul Nandalpad\Documents\job-lens
- **Deployment:** Vercel (auto-deploy on git push to main)

---

## CRITICAL RULES FOR CLAUDE
1. ALWAYS read this file before touching any page or component
2. NEVER change the Navbar logo, colors, or structure — only edit the navItems array
3. NEVER use a dark purple / glassmorphism style — that is wrong for this app
4. ALWAYS match the existing design tokens below exactly
5. ALWAYS use `[System.IO.File]::WriteAllText($path, $content, $enc)` for file writes in PowerShell
6. NEVER use `Copy-Item` for .tsx files — causes encoding issues on Vercel
7. ALWAYS wrap `sessionStorage` and `localStorage` calls inside `useEffect` — Next.js prerenders on server
8. ALWAYS run `npm run build` before `git push` to catch errors early
9. Ask clarifying questions BEFORE writing new pages — check existing pages for design pattern first
10. Use `git restore <file>` to revert mistakes before they are pushed

---

## DESIGN TOKENS

### ColorsPrimary navy:     #042C53
Blue accent:      #378ADD
Blue light:       #185FA5
Green success:    #1D9E75
Amber warning:    #F59E0B
Red error:        #E24B4A
Background:       #f0f4f8
Card background:  #fff
Border:           #edf1f6
Border dark:      #dde4ee
Text primary:     #1a2332
Text secondary:   #6b7c93
Text muted:       #8fa3b8
Sidebar bg:       linear-gradient(180deg, #042C53 0%, #073d6e 100%)
Navy dark:        #073d6e
E6F1FB (light blue tint for active states)

### Fonts
Body:      DM Sans (300, 400, 500, 600)
Headings:  Outfit (400, 600, 700)
Import:    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Outfit:wght@400;600;700&display=swap');

### Layout Pattern (Career Scan, Smart Apply)

Top: Navbar (sticky, #042C53, height 52px)
Left sidebar: 290px, linear-gradient(180deg, #042C53, #073d6e), padding 20px 16px
Right main: flex:1, background #f0f4f8, padding 20px
Cards: background #fff, border 1px solid #edf1f6, borderRadius 14px


### Layout Pattern (CV Builder, Cover Letter, Apply Now, Tracker)

Top: Navbar
Full width: maxWidth 1200, margin 0 auto, padding 24px 20px
Background: #f0f4f8
Cards: background #fff, border 1px solid #edf1f6, borderRadius 14px


---

## NAVBAR
- **File:** src/app/app/components/Navbar.tsx
- **Background:** #042C53
- **Height:** 52px
- **Logo:** Radar/magnifier SVG icon + "Job-Lens AI" text (Outfit font, #E6F1FB + #378ADD)
- **User avatar:** pill with initial + first name from Supabase auth
- **Supabase import:** `import { createClient } from '@/lib/supabase'`
- **DO NOT rewrite the Navbar** — only edit the navItems array

### Nav Items (current)
Career Scan       -> /app/career-scan
Smart Job Search  -> /app/smart-apply      (folder is smart-apply NOT smart-job-search)
CV Builder        -> /app/cv-builder
Cover Letter      -> /app/cover-letter
Apply Now         -> /app/apply-now
Tracker           -> /app/tracker

---

## PAGE INVENTORY & STATUS

### 1. Career Scan — `/app/career-scan` ✅ COMPLETE
- Dark sidebar + light main panel layout
- LinkedIn PDF + CV upload, paste CV text, target role, target market
- AI analysis via `/api/career-scan`
- Score rings, strengths/gaps cards, role suggestions, quick wins, market insight
- Roast mode, Upgrade path mode
- SessionStorage: saves result, role, market, phase

### 2. Smart Job Search — `/app/smart-apply` ✅ COMPLETE
- Dark sidebar + light main panel layout
- CV upload, job search filters, Adzuna API results
- Right panel tabs: Job Description / Build CV / Cover Letter
- Inline CV tailoring via `/api/tailor-cv`
- "Open in CV Builder →" button saves job to sessionStorage and navigates
- SessionStorage: jl_sjs_cv_text, jl_sjs_cv_name, jl_sjs_target_role, jl_jobs, jl_used_query

### 3. CV Builder — `/app/cv-builder` ✅ COMPLETE
- Full width layout
- Template picker: Modern / Executive / Minimal / Technical (visual thumbnails)
- Controls: Language (EN/DE), Tone (Professional/Concise/Detailed), Pages (1/2)
- AI tailoring via `/api/tailor-cv`
- CV preview panel, Download PDF/DOCX, Copy text
- "Go to Cover Letter →" button
- Bottom cards: Keywords injected, Achievements, Suggestions
- SessionStorage: reads jl_cvb_job, jl_sjs_cv_text; writes jl_cvb_tailored

### 4. Cover Letter — `/app/cover-letter` ✅ COMPLETE
- Full width layout
- Controls: Language (EN/DE), Tone (Confident/Formal/Warm), Length (Short/Medium/Long)
- AI generation via `/api/cover-letter`
- Letter preview panel, Download PDF/DOCX, Copy text
- "Applied — log it →" navigates to /app/apply-now
- Bottom cards: Personalization used, Optional additions
- SessionStorage: reads jl_cvb_tailored, jl_cvb_job; writes jl_cl_letter

### 5. Apply Now — `/app/apply-now` ✅ COMPLETE
- Full width layout
- Job header bar (navy, shows company/location/salary/match score)
- Progress bar (3 checkpoints: CV done, CL done, Applied)
- 4-step indicator strip
- CV panel + Cover Letter panel side by side (download PDF/DOCX, email send)
- Checklist with circular checkboxes
- "Apply on company site →" opens job_apply_link in new tab
- "Log this application →" saves to localStorage and navigates to Tracker
- localStorage: writes to jl_tracker (array of applications)

### 6. Tracker — `/app/tracker` ✅ COMPLETE
- Full width layout
- Stat cards: Total applied / Via Job-Lens / Logged manually
- Table: Role / Company / Date Applied / Notes / Source / Delete
- "+ Log manually" form (role, company, notes)
- localStorage: reads/writes jl_tracker
- Source badge: Job-Lens (blue) or Manual (grey)

---

## SESSIONSTORAGE KEYS
jl_cv_text            CV text from Career Scan
jl_target_role        Target role from Career Scan
jl_scan_result        Career Scan JSON result
jl_scan_phase         Career Scan phase (results/upload)
jl_scan_role          Role used in scan
jl_scan_market        Market used in scan
jl_sjs_cv_text        CV text in Smart Job Search
jl_sjs_cv_name        CV filename in Smart Job Search
jl_sjs_target_role    Target role in Smart Job Search
jl_jobs               Job search results JSON
jl_used_query         Search query used
jl_cvb_job            Selected job JSON (set when opening CV Builder)
jl_cvb_tailored       Tailored CV text output
jl_cl_letter          Generated cover letter text

## LOCALSTORAGE KEYS
jl_tracker            Array of application log entries

---

## API ROUTES
/api/extract-pdf      Claude Haiku — extracts text from PDF upload
/api/career-scan      Claude — full career profile analysis, returns JSON
/api/analyse-profile  Claude — extracts profile data from CV text
/api/tailor-cv        Claude — tailors CV for a specific job
/api/cover-letter     Claude — generates cover letter
/api/jobs             Adzuna — job search (DE, CH, AT, GB)

---

## USER FLOW
Career Scan
→ (Take to Smart Job Search) →
Smart Job Search
→ (Open in CV Builder) →
CV Builder
→ (Go to Cover Letter) →
Cover Letter
→ (Applied — log it) →
Apply Now
→ (Log this application) →
Tracker

---

## COMMON BUTTON STYLES
```javascript
// Primary dark button
{ padding: '10px 24px', borderRadius: 8, background: '#042C53', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700 }

// Primary gradient button
{ background: 'linear-gradient(135deg, #042C53, #185FA5)', color: '#fff', ... }

// Green CTA button
{ background: 'linear-gradient(135deg, #1D9E75, #059669)', color: '#fff', ... }

// Secondary outline button
{ background: '#fff', color: '#042C53', border: '1.5px solid #042C53', ... }

// Ghost button
{ background: '#f0f4f8', color: '#6b7c93', border: '1px solid #dde4ee', ... }

// Active toggle
{ background: '#042C53', color: '#fff', border: '1.5px solid #042C53', fontWeight: 700 }

// Inactive toggle
{ background: '#fff', color: '#6b7c93', border: '1.5px solid #dde4ee', fontWeight: 400 }
```

---

## POWERSHELL FILE WRITE RULE
```powershell
# ALWAYS use this pattern — never Copy-Item for tsx files
$enc = [System.Text.Encoding]::UTF8
[System.IO.File]::WriteAllText("C:\Users\Abdul Nandalpad\Documents\job-lens\src\path\to\file.tsx", $content, $enc)
```

---

## GIT WORKFLOW
```powershell
npm run build                          # always build first
git add -A
git commit -m "feat/fix: description"
git push                               # Vercel auto-deploys
git restore src/path/to/file.tsx       # revert a file to last commit
git show HEAD:src/path/to/file.tsx     # view last committed version
```

---

## PROGRESS LOG

### Session — May 2026
- Built Career Scan page (complete with roast/upgrade modes)
- Built Smart Job Search page (Adzuna API, CV tailoring inline)
- Built CV Builder page (template picker, AI tailoring, sessionStorage flow)
- Built Cover Letter page (tone/length/language controls, AI generation)
- Built Apply Now page (4-step flow, email send, checklist, apply link)
- Built Tracker page (localStorage persistence, manual log, stats)
- Fixed Navbar — restored original logo after accidental overwrite
- Fixed sessionStorage prerender error in cv-builder (moved to useEffect)
- Fixed JSX.Element -> React.ReactElement type error in cv-builder
- All 6 pages live on job-lens.de

### Next Session — TODO
- Test full flow: Smart Apply -> CV Builder -> Cover Letter -> Apply Now -> Tracker
- Fix any functional issues found during testing
- Consider: real PDF download (not .txt with .pdf extension)
- Consider: email sending via API route (currently simulated)
- Consider: Supabase persistence for Tracker (replace localStorage)