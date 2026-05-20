/**
 * Generates DOCUMENTATION.docx from DOCUMENTATION.md
 * Run: node scripts/generate-docs.js
 */
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, WidthType, AlignmentType, ShadingType } = require('docx')
const fs = require('fs')
const path = require('path')

const NAVY  = '0D2137'
const BLUE  = '378ADD'
const GREY  = '6B7C93'
const LIGHT = 'F8FAFC'

function heading1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 120 },
    border: { bottom: { color: BLUE, size: 6, style: BorderStyle.SINGLE } },
    run: { color: NAVY, bold: true, size: 28 },
  })
}

function heading2(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 80 },
    run: { color: NAVY, bold: true, size: 24 },
  })
}

function heading3(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 60 },
    run: { color: BLUE, bold: true, size: 22 },
  })
}

function para(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, color: '374151', ...opts })],
    spacing: { after: 100 },
  })
}

function bullet(text) {
  return new Paragraph({
    children: [new TextRun({ text: '• ' + text, size: 20, color: '374151' })],
    indent: { left: 360 },
    spacing: { after: 80 },
  })
}

function code(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: 'Courier New', size: 18, color: '1e3a5f' })],
    shading: { type: ShadingType.SOLID, color: 'F1F5F9' },
    indent: { left: 360, right: 360 },
    spacing: { before: 60, after: 60 },
  })
}

function makeTable(headers, rows) {
  const headerRow = new TableRow({
    children: headers.map(h => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18, color: 'ffffff' })] })],
      shading: { type: ShadingType.SOLID, color: NAVY },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
    })),
    tableHeader: true,
  })
  const dataRows = rows.map((row, ri) => new TableRow({
    children: row.map(cell => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: String(cell), size: 18, color: '374151' })] })],
      shading: { type: ShadingType.SOLID, color: ri % 2 === 0 ? LIGHT : 'FFFFFF' },
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
    })),
  }))
  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { top: 120, bottom: 120 },
  })
}

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: 'Calibri', size: 20, color: '374151' },
        paragraph: { spacing: { line: 276 } },
      },
    },
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 }, // ~2 cm
      },
    },
    children: [

      // ── Cover ──────────────────────────────────────────────────────────────
      new Paragraph({
        children: [new TextRun({ text: 'JOB-LENS', bold: true, size: 72, color: NAVY })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 800, after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Technical Documentation', size: 36, color: BLUE })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'AI-Powered Job Application Platform', size: 24, color: GREY, italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Version: ', bold: true, size: 20 }),
          new TextRun({ text: '1.0', size: 20 }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Date: ', bold: true, size: 20 }),
          new TextRun({ text: '2026-05-19', size: 20 }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Author: ', bold: true, size: 20 }),
          new TextRun({ text: 'Munira Nandalpad', size: 20 }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Stack: ', bold: true, size: 20 }),
          new TextRun({ text: 'Next.js 16, Supabase, Anthropic Claude, Vercel', size: 20 }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 1200 },
      }),

      // ── 1. Concept ──────────────────────────────────────────────────────────
      heading1('1. Concept & Vision'),
      para('Job-Lens is an AI-powered job application platform built to solve a universal problem: the gap between a candidate\'s raw CV and what recruiters and Applicant Tracking Systems (ATS) actually want to see.'),
      para('The core insight: most job seekers send the same CV to every application and get rejected before a human ever reads it. Job-Lens combines AI career analysis, ATS optimisation, real-time job matching, CV tailoring, cover letter generation, and CV building with one-click PDF export — all in a single cohesive flow.'),

      heading2('Two Markets, One Codebase'),
      para('The platform serves two distinct markets from a single Next.js application:'),
      makeTable(
        ['Market', 'Route prefix', 'Accent colour', 'Payment', 'Credit pool'],
        [
          ['DACH (Germany, Austria, Switzerland)', '/app/*', '#378ADD (Blue)', 'PayPal', 'eu_credits'],
          ['India', '/in/*', '#FF9933 (Saffron)', 'Razorpay (planned)', 'in_credits'],
        ]
      ),
      new Paragraph({ text: '', spacing: { after: 200 } }),

      // ── 2. Architecture ─────────────────────────────────────────────────────
      heading1('2. Architecture Overview'),
      para('The application is deployed on Vercel with Next.js App Router. All AI calls and external API calls are made server-side via API routes. The browser never has access to sensitive keys.'),
      heading2('Key Architectural Decisions'),
      bullet('Server Components where possible — data fetching happens server-side; only interactive UI is client components'),
      bullet('API routes for AI calls — all Anthropic and external API calls go through Next.js API routes to keep keys server-side'),
      bullet('Supabase SSR — session cookies managed by @supabase/ssr, not localStorage, for security'),
      bullet('Service role key — only used in API routes and middleware; never exposed to the browser'),
      bullet('No ORM — direct Supabase JS client with typed queries'),
      bullet('PDF generation server-side — @react-pdf/renderer runs only in API routes to prevent webpack bundling of native Node.js deps'),

      // ── 3. Database ─────────────────────────────────────────────────────────
      heading1('3. Database Schema'),
      heading2('profiles table'),
      makeTable(
        ['Column', 'Type', 'Description'],
        [
          ['id', 'uuid (PK)', 'Matches auth.users.id'],
          ['email', 'text', 'Raw email from OAuth'],
          ['normalized_email', 'text', 'Gmail dot/alias normalised email'],
          ['full_name', 'text', 'From Google OAuth metadata'],
          ['market', 'text', "'de' or 'in' — last login market"],
          ['credits', 'int', 'Free / common credit pool'],
          ['eu_credits', 'int', 'PayPal-purchased EU credits'],
          ['in_credits', 'int', 'Razorpay-purchased India credits'],
          ['status', 'text', "'active', 'blocked', 'duplicate', 'ip_flagged'"],
          ['paypal_payer_email', 'text', 'Stored from PayPal IPN'],
        ]
      ),
      new Paragraph({ text: '', spacing: { after: 160 } }),
      heading2('usage_events table'),
      makeTable(
        ['Column', 'Type', 'Description'],
        [
          ['user_id', 'uuid (FK)', 'References profiles.id'],
          ['action', 'text', "e.g. 'career_scan', 'tailor_cv', 'refund_career_scan'"],
          ['credits_used', 'int', 'Credits consumed (negative for refunds)'],
          ['created_at', 'timestamptz', 'Event time'],
        ]
      ),
      new Paragraph({ text: '', spacing: { after: 160 } }),
      heading2('purchase_events table'),
      makeTable(
        ['Column', 'Type', 'Description'],
        [
          ['paypal_txn_id', 'text', 'PayPal IPN transaction ID — idempotency key'],
          ['paypal_payer_email', 'text', 'Buyer email from PayPal'],
          ['amount_eur', 'numeric', 'Amount paid in EUR'],
          ['credits_added', 'int', 'Credits granted'],
        ]
      ),
      new Paragraph({ text: '', spacing: { after: 200 } }),

      // ── 4. Authentication ────────────────────────────────────────────────────
      heading1('4. Authentication & Security'),
      heading2('OAuth Flow'),
      bullet('User clicks "Sign in with Google" on /login or /in/login'),
      bullet('Login page sets a jl_login_next cookie (the intended destination)'),
      bullet('Supabase redirects to Google OAuth consent screen'),
      bullet('Google redirects to /auth/callback?code=…'),
      bullet('Callback exchanges code for session, runs fraud checks, creates profile'),
      bullet('User is redirected to their intended page'),

      heading2('Fraud Prevention'),
      para('Two checks run on every new account before granting free credits:'),
      bullet('Gmail normalisation — john.doe+alias@gmail.com and johndoe@gmail.com map to the same canonical form. Duplicate normalized_email = 0 credits, status="duplicate"'),
      bullet('IP rate limiting — rolling 30-day window, max 2 free credit grants per IP. Excess accounts get 0 credits, status="ip_flagged"'),

      heading2('Credit System'),
      para('Three pools per user, drained in order:'),
      code('common credits (free)  →  eu_credits (PayPal)  →  in_credits (Razorpay)'),
      para('Admin accounts (ADMIN_EMAILS env var) bypass all credit checks and are never billed.'),

      // ── 5. API Routes ────────────────────────────────────────────────────────
      heading1('5. API Routes Reference'),
      makeTable(
        ['Route', 'Method', 'Auth', 'Cost', 'Purpose'],
        [
          ['/api/extract-pdf', 'POST', 'Required', 'Free', 'Extract text from PDF/DOCX/TXT (10 MB max)'],
          ['/api/career-scan', 'POST', 'Required', '2 credits (EU)', 'DACH career analysis — score, salary, strengths, gaps'],
          ['/api/india/career-scan', 'POST', 'Required', '2 credits (IN)', 'India ATS scan — CV vs job description'],
          ['/api/india/career-scan-pro', 'POST', 'Required', '2 credits (IN)', 'India career analysis with INR salary ranges'],
          ['/api/tailor-cv', 'POST', 'Required', '1 credit', 'AI CV tailoring (JSON or plain text mode)'],
          ['/api/cover-letter', 'POST', 'Required', '1 credit', 'AI cover letter generation with feedback loop'],
          ['/api/visa', 'POST', 'Required', '1 credit (EU)', 'German visa eligibility analysis'],
          ['/api/zeugnis', 'POST', 'Required', '1 credit (EU)', 'German Arbeitszeugnis decoder'],
          ['/api/jobs', 'GET', 'Required', 'Free', 'Adzuna job search with country allowlist'],
          ['/api/analyse-profile', 'POST', 'Required', 'Free', 'Extract job search profile from CV'],
          ['/api/cv/pdf', 'POST', 'Required', 'Free', 'Generate PDF from structured CVData'],
          ['/api/paypal/webhook', 'POST', 'IPN verified', 'N/A', 'PayPal IPN credit top-up with idempotency'],
          ['/api/admin/users', 'GET/PATCH', 'Admin only', 'N/A', 'User management — view, block, adjust credits'],
          ['/api/user/profile', 'GET', 'Required', 'Free', 'Current user credit balance and usage history'],
        ]
      ),
      new Paragraph({ text: '', spacing: { after: 200 } }),

      // ── 6. CV Builder ────────────────────────────────────────────────────────
      heading1('6. CV Builder'),
      heading2('DACH Builder (/app/cv-builder)'),
      bullet('Three templates: Clean, Professional, Executive'),
      bullet('Accent colour: #378ADD (blue)'),
      bullet('Reads job and CV text from sessionStorage'),
      bullet('Feedback loop: type changes → re-submit to AI → instant preview update'),
      bullet('One-click PDF export via /api/cv/pdf'),

      heading2('India Builder (/in/cv-builder)'),
      bullet('Six templates: Clean, Saffron, Classic, Modern, Executive, Executive II'),
      bullet('Photo upload: FileReader → base64 → embedded in preview and PDF'),
      bullet('Accent colour: #FF9933 (saffron)'),

      heading2('Executive Template'),
      bullet('4px gradient top accent bar'),
      bullet('Dot expertise list, inline language levels'),
      bullet('◆ contact prefix, ✦ certification markers'),
      bullet('Career History section with period badges'),

      heading2('Executive II Template'),
      bullet('240px gradient sidebar: linear-gradient(170deg, #0d2137, #1e1208)'),
      bullet('Skill bars with % labels'),
      bullet('5-dot language level indicators'),
      bullet('Timeline experience: saffron dot + vertical connector line'),
      bullet('Core Stack chip row'),
      bullet('Large 32px Outfit heading in right panel'),
      bullet('Stats strip with internal dividers'),

      heading2('PDF Generation'),
      para('The old html2canvas + jsPDF approach caused overlapping text at page boundaries (canvas slice cuts text mid-character). This was replaced with @react-pdf/renderer:'),
      bullet('Pure vector PDF layout — no canvas, no slicing, clean page breaks'),
      bullet('Runs server-side only in /api/cv/pdf (webpack cannot bundle its native deps for browser)'),
      bullet('Client sends CVData JSON → server returns binary PDF'),
      bullet('toBlob().arrayBuffer() used (toBuffer() has incorrect TypeScript types in the library)'),

      // ── 7. Security Model ─────────────────────────────────────────────────────
      heading1('7. Security Model'),
      heading2('Fixes Applied in Production Hardening (2026-05-19)'),
      makeTable(
        ['Issue', 'Severity', 'Fix Applied'],
        [
          ['/api/extract-pdf — no auth', 'Critical', 'Auth required, 10 MB file size limit added'],
          ['/api/analyse-profile — no auth', 'Critical', 'Auth required'],
          ['/api/paypal/webhook — no idempotency', 'Critical', 'txn_id checked against purchase_events before processing'],
          ['/api/jobs — Adzuna keys logged in console', 'High', 'console.log statements removed'],
          ['/api/jobs — no auth', 'High', 'Auth required'],
          ['/api/visa — wrong market (MARKET.in)', 'High', 'Fixed to MARKET.eu'],
          ['/api/admin/users — unchecked credits value', 'Medium', 'Bounded 0–10000, must be finite integer'],
          ['/api/cv/pdf — no photo size limit', 'Medium', '3 MB base64 limit enforced'],
          ['/api/jobs — country param unvalidated', 'Medium', 'Validated against explicit country allowlist'],
          ['/api/paypal/webhook — userId unvalidated', 'Medium', 'UUID regex validation before any DB write'],
        ]
      ),
      new Paragraph({ text: '', spacing: { after: 200 } }),

      heading2('Ongoing Security Controls'),
      bullet('All AI-calling routes require Supabase session authentication'),
      bullet('Admin routes additionally verify authenticated email against ADMIN_EMAILS env var'),
      bullet('Middleware enforces auth at Next.js edge (before serverless function cold start)'),
      bullet('Service role key never exposed to browser'),
      bullet('All AI JSON responses structurally validated and field-clamped before returning to client'),
      bullet('Hardcoded official URLs in visa route — Claude never trusted to generate URLs'),
      bullet('Gmail normalisation prevents dot/alias account farming'),
      bullet('IP-based rate limit on free credit grants (2 per IP per 30 days)'),

      // ── 8. External Services ─────────────────────────────────────────────────
      heading1('8. External Services'),
      makeTable(
        ['Service', 'Purpose', 'Auth method'],
        [
          ['Anthropic Claude Sonnet 4.6', 'Career analysis, CV tailoring, cover letters, visa, zeugnis', 'API key (server-side only)'],
          ['Anthropic Claude Haiku', 'PDF extraction, profile analysis (lightweight tasks)', 'API key (server-side only)'],
          ['Supabase', 'Auth (Google OAuth), database, sessions', 'Anon key (client) + Service role (server)'],
          ['Adzuna', 'Job search — DACH and India', 'App ID + App key (server-side only)'],
          ['PayPal IPN', 'Payment webhooks for EU credits', 'IPN verification against PayPal endpoint'],
          ['NewsAPI', 'India market news insights', 'API key (server-side only)'],
          ['Vercel', 'Hosting, edge, analytics, speed insights', 'Implicit (project linked)'],
        ]
      ),
      new Paragraph({ text: '', spacing: { after: 200 } }),

      // ── 9. Deployment ─────────────────────────────────────────────────────────
      heading1('9. Deployment & Environment'),
      heading2('Environment Variables'),
      makeTable(
        ['Variable', 'Visibility', 'Purpose'],
        [
          ['SUPABASE_SERVICE_ROLE_KEY', 'Server only', 'Admin DB operations'],
          ['NEXT_PUBLIC_SUPABASE_URL', 'Public', 'Supabase project URL'],
          ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Public', 'Safe anon auth key'],
          ['ANTHROPIC_API_KEY', 'Server only', 'Claude AI calls'],
          ['ADZUNA_APP_ID / ADZUNA_APP_KEY', 'Server only', 'Job search API'],
          ['NEWS_API_KEY', 'Server only', 'India news insights'],
          ['ADMIN_EMAILS', 'Server only', 'Comma-separated admin email list'],
          ['PAYPAL_SANDBOX', 'Server only', "'true' for sandbox testing"],
          ['NEXT_PUBLIC_APP_URL', 'Public', 'Canonical app URL'],
          ['NEXT_PUBLIC_AUTO_APPLY_ENABLED', 'Public', 'Local only — Playwright auto-apply'],
        ]
      ),
      new Paragraph({ text: '', spacing: { after: 200 } }),

      heading2('Deployment Notes'),
      bullet('Platform: Vercel — Next.js App Router with serverless functions'),
      bullet('Node.js runtime: 18.x (required for Blob.arrayBuffer() in PDF route)'),
      bullet('Playwright auto-apply exceeds Vercel 50 MB function limit — disabled in production'),
      bullet('@react-pdf/renderer runs server-side only — must not be imported in client components'),

      // ── 10. Known Limitations ─────────────────────────────────────────────────
      heading1('10. Known Limitations & Roadmap'),
      makeTable(
        ['Item', 'Status'],
        [
          ['Razorpay integration for India credits', 'Planned'],
          ['India career-scan navigation entry point', 'In code, not yet linked in navbar'],
          ['Google OAuth shows Supabase domain', 'Requires Supabase Pro custom domain'],
          ['Auto Apply is local-only', 'Playwright too large for Vercel serverless'],
          ['Cover letter lazy generation', 'Deferred — user must trigger manually'],
          ['Rate limiting on API routes', 'Planned (Vercel KV or middleware)'],
        ]
      ),
      new Paragraph({ text: '', spacing: { after: 600 } }),

      new Paragraph({
        children: [new TextRun({ text: 'Job-Lens — Confidential Internal Documentation', size: 18, color: GREY, italics: true })],
        alignment: AlignmentType.CENTER,
      }),
    ],
  }],
})

Packer.toBuffer(doc).then(buffer => {
  const outPath = path.join(__dirname, '..', 'DOCUMENTATION.docx')
  fs.writeFileSync(outPath, buffer)
  console.log('✅ DOCUMENTATION.docx written to project root')
}).catch(err => {
  console.error('❌ Failed to generate docx:', err)
  process.exit(1)
})
