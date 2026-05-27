// Central source of truth for all magic numbers.
// Import from here — never hardcode these values in pages or API routes.

// ── Credit costs ────────────────────────────────────────────────────────────
export const CREDIT_COST = {
  careerScan:      2,  // /api/career-scan + /api/india/career-scan
  tailorCv:        1,  // /api/tailor-cv
  coverLetter:     1,  // /api/cover-letter
  autoApply:       3,  // /api/auto-apply/analyze
  zeugnisDecoder:  1,  // /api/zeugnis — decode Arbeitszeugnis
  visaCheck:       1,  // /api/visa — Fachkräfte eligibility analysis
  aiChat:          1,  // /api/ai/chat — 1 credit per AI_CHAT_FREE_MESSAGES block after free tier
  interviewPrep:   1,  // /api/interview/questions — generate 5 interview questions
  salarySim:       1,  // /api/salary-sim — start a salary negotiation session
} as const

// First N Kira messages are free; 1 credit charged per N messages after that
export const AI_CHAT_FREE_MESSAGES = 20

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

  // Zeugnis + Visa
  zeugnisResult:       'jl_zeugnis_result',
  visaResult:          'jl_visa_result',

  // India-specific
  inSelectedJob:       'jl_in_selected_job',
  atsSuggestions:      'jl_ats_suggestions',
  inCareerScanMode:    'jl_in_career_scan_mode', // 'ats' | 'career'
  inCareerScanResult:  'jl_in_career_scan_result',
  inCareerScanRole:    'jl_in_career_scan_role',

  // AI Assistant
  aiMessages:          'jl_ai_messages',
} as const

// ── localStorage keys ───────────────────────────────────────────────────────
// Persistent preferences (not cleared by "New session"). Add new keys here.
export const LS = {
  dashWidgetsEu: 'jl_dash_widgets_eu',
  dashWidgetsIn: 'jl_dash_widgets_in',
  cvConsent:     'jl_cv_consent',
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
  baJobs:           '/api/ba-jobs',
  zeugnis:          '/api/zeugnis',
  visa:             '/api/visa',
  autoApplyAnalyze: '/api/auto-apply/analyze',
  userProfile:          '/api/user/profile',
  indiaCareerScanPro:   '/api/india/career-scan-pro',
  aiChat:               '/api/ai/chat',
  aiTts:                '/api/ai/tts',
  aiStt:                '/api/ai/stt',
  careerProfile:        '/api/profile/career',
  applications:         '/api/applications',
  interviewQuestions:   '/api/interview/questions',
  interviewFeedback:    '/api/interview/feedback',
  salarySim:            '/api/salary-sim',
} as const
