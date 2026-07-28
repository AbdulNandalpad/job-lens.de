// Kira Home data — tiles, mode opening lines, and tool status labels.
// Mode keys match MODE_PROMPTS in src/app/api/ai/chat/route.ts exactly.

// A tile either starts a chat mode (`mode`) or walks the user into a feature
// page (`href`, per market). Phrased as user intents, not feature names.
export interface KiraTile {
  id: string
  mode?: string
  href?: { eu: string; in: string }
  label: Record<string, string>
  desc: Record<string, string>
}

// Mirrors the feature panels on the marketing site (HeroDACH/HeroIndia) —
// same names, same order, same accents — minus the redundant Kira AI tile.
export const KIRA_TILES: KiraTile[] = [
  {
    id: 'career_scan', href: { eu: '/app/career-scan', in: '/in/career-scan' },
    label: { eu_DE: 'Career Scan', eu_EN: 'Career Scan', in_EN: 'ATS Score' },
    desc:  { eu_DE: 'ATS-Score & KI-Feedback', eu_EN: 'ATS score & AI feedback', in_EN: 'Beat the AI filter' },
  },
  {
    id: 'job_search', href: { eu: '/app/jobs', in: '/in/jobs' },
    label: { eu_DE: 'Job-Suche', eu_EN: 'Job Search', in_EN: 'Job Search' },
    desc:  { eu_DE: '186k+ DACH-Stellen', eu_EN: '186k+ DACH roles', in_EN: 'India + DACH roles' },
  },
  {
    id: 'cv_builder', href: { eu: '/app/cv-builder', in: '/in/cv-builder' },
    label: { eu_DE: 'CV Builder', eu_EN: 'CV Builder', in_EN: 'CV Builder' },
    desc:  { eu_DE: 'Auf jede Stelle zugeschnitten', eu_EN: 'Tailored to every role', in_EN: 'Tailored in minutes' },
  },
  {
    id: 'cover_letter', href: { eu: '/app/cv-builder', in: '/in/cover-letter' },
    label: { eu_DE: 'Anschreiben', eu_EN: 'Cover Letter', in_EN: 'Cover Letter' },
    desc:  { eu_DE: 'Überzeugend & persönlich', eu_EN: 'Personal & persuasive', in_EN: 'Personal & sharp' },
  },
  {
    id: 'auto_apply', href: { eu: '/app/auto-apply', in: '/in/auto-apply' },
    label: { eu_DE: 'Auto Apply', eu_EN: 'Auto Apply', in_EN: 'Auto Apply' },
    desc:  { eu_DE: 'Automatisch bewerben', eu_EN: 'Apply on autopilot', in_EN: 'Apply on autopilot' },
  },
  {
    id: 'job_case', href: { eu: '/app/job-case', in: '/in/job-case' },
    label: { eu_DE: 'Job Case', eu_EN: 'Job Case', in_EN: 'Job Case' },
    desc:  { eu_DE: 'Video-Bewerbung & Beweis', eu_EN: 'Video pitch & proof', in_EN: 'Video pitch & proof' },
  },
]

export const MODE_OPENINGS: Record<string, Record<string, string>> = {
  job_search:      { eu_DE: 'Welche Stelle suchst du? Titel und Ort — ich suche live.', eu_EN: "What role are you looking for? Give me the title and location and I'll pull up live listings.", in_EN: "What role are you looking for? Tell me the title and location." },
  market_insights: { eu_DE: 'Welchen Markt soll ich analysieren? Rolle, Skill oder Stadt?', eu_EN: 'What market do you want to know about? A role, a skill, or a city?', in_EN: 'What market do you want to know about? A role, a skill, or a city?' },
  cv_review:       { eu_DE: 'Lass uns deinen Lebenslauf besprechen. Welche Art Stelle suchst du gerade?', eu_EN: "Let's look at your CV. What kind of role are you going for?", in_EN: "Let's look at your CV. What kind of role are you going for?" },
  interview_prep:  { eu_DE: 'Für welche Stelle und welches Unternehmen bereitest du dich vor?', eu_EN: "Which role and company are you preparing for? I'll tailor everything to it.", in_EN: "Which role and company are you preparing for? I'll tailor everything to it." },
  feature_help:    { eu_DE: 'Was möchtest du tun? Ich zeige dir das richtige Tool.', eu_EN: "What are you trying to do? I'll point you to the right tool.", in_EN: "What are you trying to do? I'll point you to the right tool." },
}

export const STATUS_LABELS: Record<string, Record<string, string>> = {
  eu_DE: { search_jobs: 'Suche Jobs...', score_jobs: 'Bewerte Übereinstimmung...' },
  eu_EN: { search_jobs: 'Searching jobs...', score_jobs: 'Scoring match...' },
  in_EN: { search_jobs: 'Searching jobs...', score_jobs: 'Scoring match...' },
}
