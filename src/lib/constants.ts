// Central source of truth for all magic numbers.
// Import from here — never hardcode these values in pages or API routes.

// ── Credit costs ────────────────────────────────────────────────────────────
export const CREDIT_COST = {
  careerScan:  2,  // /api/career-scan + /api/india/career-scan
  tailorCv:    1,  // /api/tailor-cv
  coverLetter: 1,  // /api/cover-letter
  autoApply:   3,  // /api/auto-apply/analyze
} as const

// ── UI threshold — show low-credit warning when credits fall to or below this
export const LOW_CREDIT_WARN = 2

// ── Market identifiers ───────────────────────────────────────────────────────
export const MARKET = {
  eu: 'eu',
  in: 'in',
} as const
export type Market = typeof MARKET[keyof typeof MARKET]

// ── sessionStorage keys ──────────────────────────────────────────────────────
// All jl_* keys used across pages. Add new keys here — never inline.
export const SS = {
  // CV text (shared by all pages)
  cvText:         'jl_cv_text',
  linkedinText:   'jl_linkedin_text',

  // Smart Apply / job search
  sjsCvText:      'jl_sjs_cv_text',
  sjsCvName:      'jl_sjs_cv_name',
  sjsTargetRole:  'jl_sjs_target_role',
  jobs:           'jl_jobs',
  usedQuery:      'jl_used_query',

  // Career Scan
  scanResult:     'jl_scan_result',
  scanRole:       'jl_scan_role',
  scanMarket:     'jl_scan_market',
  scanPhase:      'jl_scan_phase',
  targetRole:     'jl_target_role',

  // CV Builder
  cvbJob:         'jl_cvb_job',
  cvbTailored:    'jl_cvb_tailored',
  cvbData:        'jl_cvb_data',

  // Cover Letter
  clLetter:       'jl_cl_letter',

  // India-specific
  inSelectedJob:  'jl_in_selected_job',
  atsSuggestions: 'jl_ats_suggestions',
} as const

// ── API routes ───────────────────────────────────────────────────────────────
// All internal API routes. Never hardcode strings in fetch() calls.
export const API = {
  extractPdf:       '/api/extract-pdf',
  careerScan:       '/api/career-scan',
  indiaCareerScan:  '/api/india/career-scan',
  tailorCv:         '/api/tailor-cv',
  coverLetter:      '/api/cover-letter',
  analyseProfile:   '/api/analyse-profile',
  jobs:             '/api/jobs',
  autoApplyAnalyze: '/api/auto-apply/analyze',
  userProfile:      '/api/user/profile',
} as const
