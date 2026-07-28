// Curated, step-by-step German work-visa guides — sourced directly from the official
// make-it-in-germany.com portal (the German Federal Government's skilled-migration site).
//
// Why this is static data, not AI-generated: the eligibility check in /api/visa already
// treats AI-generated URLs as untrustworthy (see the hardcoded OFFICIAL_LINKS override in
// that route) — the same principle applies here. Immigration guidance has real consequences
// if it's wrong, so every figure and step below was read directly off the cited source page,
// not recalled or summarised by a model. `keyFigures` is kept separate from prose `steps`
// specifically because thresholds are what changes year to year — re-verifying is a scan of
// one small array per guide, not a hunt through paragraphs.
//
// Re-verification: check each guide's `primarySource.url` against the live page and update
// `verifiedAsOf` when you do. No live scraping or scheduled refresh for v1 — this is a normal
// content-maintenance task, same as updating credit prices.

export type VisaOptionId =
  | 'blue_card'
  | 'fachkraft_academic'
  | 'fachkraft_vocational'
  | 'chancenkarte'
  | 'anerkennungsvisum'

export interface GuideSource {
  label: string
  url: string
}

export interface GuideCallout {
  kind: 'requirement' | 'warning' | 'tip'
  text: string
  source?: GuideSource
}

export interface GuideStep {
  n: number
  title: string
  detail: string
  subDetails?: string[]
  callouts?: GuideCallout[]
  source?: GuideSource
}

export interface VisaGuide {
  id: VisaOptionId
  officialName: { en: string; de: string }
  summary: string
  eligibilityAtGlance: string[]
  steps: GuideStep[]
  keyFigures: { label: string; value: string; source: GuideSource }[]
  faq?: { q: string; a: string }[]
  primarySource: GuideSource
  verifiedAsOf: string
}

const CONSULAR_PORTAL: GuideSource = { label: 'Consular Services Portal — Federal Foreign Office', url: 'https://videx.diplo.de/videx/desktop/index.html' }
const BLUE_CARD_SOURCE: GuideSource = { label: 'EU Blue Card — make-it-in-germany.com', url: 'https://www.make-it-in-germany.com/en/visa-residence/types/eu-blue-card' }
const QUALIFIED_PRO_SOURCE: GuideSource = { label: 'Work visa for qualified professionals — make-it-in-germany.com', url: 'https://www.make-it-in-germany.com/en/visa-residence/types/work-qualified-professionals' }
const CHANCENKARTE_SOURCE: GuideSource = { label: 'Job search opportunity card — make-it-in-germany.com', url: 'https://www.make-it-in-germany.com/en/visa-residence/opportunity-card/job-search' }
const RECOGNITION_SOURCE: GuideSource = { label: 'Visa for recognition of foreign qualifications — make-it-in-germany.com', url: 'https://www.make-it-in-germany.com/en/visa-residence/types/recognition' }
const ANABIN_SOURCE: GuideSource = { label: 'Anabin database (degree recognition)', url: 'https://anabin.kmk.org/anabin.html' }

export const VISA_GUIDES: Record<VisaOptionId, VisaGuide> = {

  blue_card: {
    id: 'blue_card',
    officialName: { en: 'EU Blue Card', de: 'Blaue Karte EU' },
    summary: 'A residence title under Section 18g of the Residence Act for academics (or people with a comparable qualification) who already have a qualifying job offer in Germany. It offers the fastest route to a settlement permit of any path here.',
    eligibilityAtGlance: [
      'A German academic degree, or a foreign one that’s comparable (minimum ISCED/EQF level 6 — at least 3 years of tertiary study)',
      'A specific job offer of at least 6 months, matching your qualification',
      'Gross annual salary of at least the relevant threshold (see Key figures)',
    ],
    steps: [
      {
        n: 1,
        title: 'Confirm your degree is recognised or comparable',
        detail: 'Your qualification needs to be a German academic degree, or a foreign one Germany treats as comparable. If it isn’t a traditional degree, you can still qualify with a tertiary-level qualification that took at least 3 years and sits at ISCED/EQF level 6 or above (e.g. a Meister/master craftsman qualification).',
        subDetails: ['Check comparability in the anabin database before applying — this is the standard reference German authorities use.'],
        source: ANABIN_SOURCE,
      },
      {
        n: 2,
        title: 'Secure a qualifying job offer',
        detail: 'You need a specific offer, not just a job search — for at least 6 months, in a role that matches your qualification. If the role is a regulated profession (e.g. medicine), your licence to practise must already be in place or clearly in prospect.',
        callouts: [{ kind: 'requirement', text: 'Shortage-occupation applicants (IT, engineering, healthcare, STEM, teaching and others) qualify at a lower salary threshold — but the Federal Employment Agency (BA) must approve the employment first.' }],
      },
      {
        n: 3,
        title: 'Check the salary threshold applies to you',
        detail: 'Three thresholds exist depending on your situation: the general threshold, a lower shortage-occupation threshold, and the same lower threshold for "young professionals" (graduated within the last 3 years, any profession). See Key figures below for exact amounts.',
      },
      {
        n: 4,
        title: 'Apply online via the Federal Foreign Office',
        detail: 'Submit your application through the Consular Services Portal, or in person at the German embassy/consulate in your home country.',
        source: CONSULAR_PORTAL,
      },
      {
        n: 5,
        title: 'Travel, register, and collect your residence permit',
        detail: 'Once your visa is approved and you’ve entered Germany, register your address (Anmeldung) and collect your EU Blue Card residence permit from your local foreigners authority (Ausländerbehörde).',
      },
    ],
    keyFigures: [
      { label: 'General salary threshold', value: '€50,700 / year gross (2026)', source: BLUE_CARD_SOURCE },
      { label: 'Shortage-occupation threshold', value: '€45,934.20 / year gross (2026), BA approval required', source: BLUE_CARD_SOURCE },
      { label: 'Young professional threshold (degree < 3 years old, any profession)', value: '€45,934.20 / year gross (2026), BA approval required', source: BLUE_CARD_SOURCE },
      { label: 'IT specialist without a formal degree', value: '€45,934.20 / year gross (2026) + 3 of the last 7 years in university-level IT work', source: BLUE_CARD_SOURCE },
      { label: 'Validity', value: 'Contract length + 3 months, up to 4 years', source: BLUE_CARD_SOURCE },
      { label: 'Settlement permit eligible after', value: '27 months (21 months with German B1)', source: BLUE_CARD_SOURCE },
    ],
    faq: [
      { q: 'Can I change employer on an EU Blue Card?', a: 'Yes, but if you switch within your first year, you must notify your local foreigners authority — they’ll re-check that your new job still meets Blue Card conditions.' },
    ],
    primarySource: BLUE_CARD_SOURCE,
    verifiedAsOf: '2026-07-28',
  },

  fachkraft_academic: {
    id: 'fachkraft_academic',
    officialName: { en: 'Work visa for qualified professionals — academic (§18b)', de: 'Fachkraft mit akademischer Ausbildung (§18b)' },
    summary: 'For academically qualified professionals with a job offer in Germany who don’t meet the EU Blue Card’s salary threshold, or whose situation fits better here. Unlike the Blue Card, there’s generally no salary floor — except for first-time entrants over 45.',
    eligibilityAtGlance: [
      'Qualification recognised in Germany, or comparable to a German academic qualification',
      'A specific job offer for a genuinely qualified position (not auxiliary tasks)',
      'The job doesn’t need to match your degree field — but a licence to practise is still required for regulated professions',
    ],
    steps: [
      {
        n: 1,
        title: 'Confirm recognition of your qualification',
        detail: 'Same recognition bar as the Blue Card. If your degree isn’t automatically comparable, start the recognition procedure before applying.',
        source: ANABIN_SOURCE,
      },
      {
        n: 2,
        title: 'Secure a job offer for a genuinely qualified role',
        detail: 'The role must normally require an academic qualification to perform — the site is explicit that "auxiliary tasks will not be sufficient." The job does not have to match your specific degree field.',
      },
      {
        n: 3,
        title: 'Federal Employment Agency approval',
        detail: 'As a rule, the BA must approve the employment first, checking that your salary and working conditions match what a German employee in the same role would get.',
      },
      {
        n: 4,
        title: 'Check the age-45+ threshold, if it applies to you',
        detail: 'If you’re over 45 and this is your first time working in Germany, your job must pay at least the threshold below, or you must prove adequate pension provision.',
      },
      {
        n: 5,
        title: 'Apply online via the Federal Foreign Office',
        detail: 'Two separate application tracks exist on the portal depending on whether your qualification is a university degree or vocational training — pick the one matching your qualification.',
        source: CONSULAR_PORTAL,
      },
      {
        n: 6,
        title: 'Travel, register, and collect your residence permit',
        detail: 'Same as the Blue Card: register your address and collect your permit from your local foreigners authority after entry.',
      },
    ],
    keyFigures: [
      { label: 'Salary threshold (general)', value: 'None — the standard local-conditions check via the BA applies instead', source: QUALIFIED_PRO_SOURCE },
      { label: 'Salary threshold — first-time entrants aged 45+', value: '€55,770 / year gross (2026), or proof of adequate pension provision', source: QUALIFIED_PRO_SOURCE },
      { label: 'Validity', value: 'Contract length + 3 months, up to 4 years', source: QUALIFIED_PRO_SOURCE },
      { label: 'Settlement permit eligible after', value: '3 years of residence on this permit (conditions apply)', source: QUALIFIED_PRO_SOURCE },
    ],
    primarySource: QUALIFIED_PRO_SOURCE,
    verifiedAsOf: '2026-07-28',
  },

  fachkraft_vocational: {
    id: 'fachkraft_vocational',
    officialName: { en: 'Work visa for qualified professionals — vocational (§18a)', de: 'Fachkraft mit Berufsausbildung (§18a)' },
    summary: 'The same official pathway as the academic route above, for people with a recognised vocational qualification (Berufsausbildung) instead of a degree. One official process covers both §18a (vocational) and §18b (academic) — the steps below are identical, only the qualification type and application sub-track differ.',
    eligibilityAtGlance: [
      'A vocational qualification recognised in Germany, or fully comparable to one',
      'A specific job offer for a genuinely qualified position in that occupation',
      'BA approval of the employment, as with the academic route',
    ],
    steps: [
      {
        n: 1,
        title: 'Confirm recognition of your vocational qualification',
        detail: 'Vocational qualifications generally need full recognition (not just comparability) — check via the recognition procedure before applying. If you’re only partially recognised, the Anerkennungsvisum path may fit better first (see that guide).',
        source: ANABIN_SOURCE,
      },
      {
        n: 2,
        title: 'Secure a job offer matching your trained occupation',
        detail: 'The role should be one your vocational qualification actually trained you for — not just any job.',
      },
      {
        n: 3,
        title: 'Federal Employment Agency approval',
        detail: 'As with the academic track, the BA checks your salary and working conditions against domestic standards before the visa can be issued.',
      },
      {
        n: 4,
        title: 'Check the age-45+ threshold, if it applies to you',
        detail: 'Same rule as the academic track: first-time entrants 45+ need the salary threshold below or proof of adequate pension provision.',
      },
      {
        n: 5,
        title: 'Apply online via the Federal Foreign Office',
        detail: 'Use the "qualified professionals with vocational training" track on the Consular Services Portal.',
        source: CONSULAR_PORTAL,
      },
      {
        n: 6,
        title: 'Travel, register, and collect your residence permit',
        detail: 'Register your address and collect your permit from your local foreigners authority after entry.',
      },
    ],
    keyFigures: [
      { label: 'Salary threshold (general)', value: 'None — the BA’s local-conditions check applies instead', source: QUALIFIED_PRO_SOURCE },
      { label: 'Salary threshold — first-time entrants aged 45+', value: '€55,770 / year gross (2026), or proof of adequate pension provision', source: QUALIFIED_PRO_SOURCE },
      { label: 'Validity', value: 'Contract length + 3 months, up to 4 years', source: QUALIFIED_PRO_SOURCE },
    ],
    primarySource: QUALIFIED_PRO_SOURCE,
    verifiedAsOf: '2026-07-28',
  },

  chancenkarte: {
    id: 'chancenkarte',
    officialName: { en: 'Opportunity Card (Chancenkarte)', de: 'Chancenkarte' },
    summary: 'A job-search residence permit (Section 20a) — not a work visa itself. It gives you up to a year in Germany to find qualified employment, with part-time work allowed while you search. Two ways in: automatic if your qualification is already recognised, or by scoring 6+ points if it isn’t.',
    eligibilityAtGlance: [
      'Non-EU/EEA/Swiss citizen',
      'Proof of funds for your stay (blocked account or declaration of commitment)',
      'Either a recognised qualification (Option 1), or 6+ points in the points system plus a qualifying degree/training and language proof (Option 2)',
    ],
    steps: [
      {
        n: 1,
        title: 'Check which option applies to you',
        detail: 'Option 1 ("skilled worker"): your foreign qualification is already fully recognised in Germany, or you obtained your qualification in Germany itself — no points system, no language proof needed (though German still helps your job search). Option 2: everyone else, via the points system below.',
      },
      {
        n: 2,
        title: 'If using Option 2 — gather your recognition/comparability proof',
        detail: 'You need a positive anabin result or a Statement of Comparability (Zeugnisbewertung) for a foreign degree, or a positive "Digital Statement on Professional Qualification" for a vocational qualification. Vocational training must have taken at least 2 years.',
        source: ANABIN_SOURCE,
      },
      {
        n: 3,
        title: 'If using Option 2 — prove language proficiency',
        detail: 'Minimum German A1, or English B2 — this is required in addition to the 6 points, not a substitute for them.',
      },
      {
        n: 4,
        title: 'If using Option 2 — calculate your points (need 6+)',
        detail: 'Add up points from qualification equivalence, shortage occupation, experience, language, age, prior stays in Germany, and your partner’s eligibility. See the full breakdown in Key figures below.',
      },
      {
        n: 5,
        title: 'Prove you can fund your stay',
        detail: 'A blocked bank account or a formal declaration of commitment from someone who’ll support you financially, at the minimum monthly amount below.',
      },
      {
        n: 6,
        title: 'Apply online via the Federal Foreign Office',
        detail: 'The site also offers a free self-check tool to sanity-test your eligibility before you formally apply.',
        source: CONSULAR_PORTAL,
      },
      {
        n: 7,
        title: 'Once in Germany: search, and know the work rules',
        detail: 'You can work part-time up to 20 hours/week while searching, plus job trials up to 2 weeks per employer. Find a qualifying job and you can switch to a proper work permit; if you find qualified work but don’t yet qualify for another permit, your card can be extended up to 2 more years.',
      },
    ],
    keyFigures: [
      { label: 'Points needed (Option 2 only)', value: '6 points minimum', source: CHANCENKARTE_SOURCE },
      { label: 'Qualification partially equivalent', value: '4 points', source: CHANCENKARTE_SOURCE },
      { label: 'Qualification in a shortage occupation', value: '1 point', source: CHANCENKARTE_SOURCE },
      { label: 'Professional experience: 2+ years in the last 5', value: '2 points', source: CHANCENKARTE_SOURCE },
      { label: 'Professional experience: 5+ years in the last 7', value: '3 points', source: CHANCENKARTE_SOURCE },
      { label: 'German language A2 / B1 / B2+', value: '1 / 2 / 3 points respectively', source: CHANCENKARTE_SOURCE },
      { label: 'English C1+ or native speaker', value: '+1 point bonus', source: CHANCENKARTE_SOURCE },
      { label: 'Age ≤35 / age 35–40', value: '2 points / 1 point', source: CHANCENKARTE_SOURCE },
      { label: 'Prior legal stay in Germany, 6+ continuous months in last 5 years', value: '1 point', source: CHANCENKARTE_SOURCE },
      { label: 'Spouse/partner also opportunity-card-eligible', value: '1 point', source: CHANCENKARTE_SOURCE },
      { label: 'Proof of funds', value: 'Blocked account, min €1,091 net/month (2026), or a declaration of commitment', source: CHANCENKARTE_SOURCE },
      { label: 'Validity', value: 'Up to 1 year initially; extendable up to 2 more years in specific cases', source: CHANCENKARTE_SOURCE },
    ],
    faq: [
      { q: 'Is the Chancenkarte a work visa?', a: 'No — it’s a job-search permit. You still need to convert to an actual work permit (e.g. Blue Card or Fachkraft visa) once you have a qualifying job offer.' },
    ],
    primarySource: CHANCENKARTE_SOURCE,
    verifiedAsOf: '2026-07-28',
  },

  anerkennungsvisum: {
    id: 'anerkennungsvisum',
    officialName: { en: 'Visa for recognition of foreign qualifications', de: 'Anerkennungsvisum (§16d)' },
    summary: 'For people whose qualification was assessed and found only partially equivalent — this visa (Section 16d) lets you travel to Germany specifically to complete the training or exams needed for full recognition, not to work a qualified job yet.',
    eligibilityAtGlance: [
      'You already applied for recognition and received a notice of partial equivalence',
      'You’re registered for an approved qualification measure that closes the gap the notice identified',
      'German at least CEFR A2 (higher may be required by the specific measure)',
      'Proof you can cover living costs for the stay',
    ],
    steps: [
      {
        n: 1,
        title: 'Apply for recognition first, from your home country',
        detail: 'This visa only exists for people who already went through the recognition procedure and got a notice that their qualification is partially — not fully — equivalent, listing exactly what’s missing.',
      },
      {
        n: 2,
        title: 'Register for a qualification measure that closes the gap',
        detail: 'In-company training, specialist courses, preparatory courses, and job-related German courses all count. If the measure is mainly on-the-job, the employer must provide a professional development plan (including what they’ll pay you during training) — and the BA must approve it.',
      },
      {
        n: 3,
        title: 'Prove your German level',
        detail: 'Usually CEFR A2 — but check the specific measure, since some require more.',
      },
      {
        n: 4,
        title: 'Prove you can cover your living costs',
        detail: 'The amount depends on the type of measure — company-based training has a different (lower) bar than school-based measures like language courses.',
        callouts: [
          { kind: 'requirement', text: 'Company-based measures (e.g. an internship): at least €1,200 gross / €941 net per month (2026 figures).' },
          { kind: 'requirement', text: 'School-based measures (e.g. a language course): at least €1,091 net/month via blocked account or declaration of commitment (2026 figures).' },
        ],
      },
      {
        n: 5,
        title: 'Apply online via the Federal Foreign Office',
        source: CONSULAR_PORTAL,
        detail: 'Submit your application once you have the partial-equivalence notice and your confirmed place on a qualification measure.',
      },
      {
        n: 6,
        title: 'While in Germany',
        detail: 'Your permit is issued for up to 24 months (renewable by 12 more if e.g. you need to retake an exam). You can work up to 20 hours/week in any part-time job, or unlimited hours in work related to your target occupation, with BA approval.',
      },
      {
        n: 7,
        title: 'After full recognition',
        detail: 'You get up to 12 months as a jobseeker (Section 20) without leaving the country, and can switch directly to a skilled-worker permit, EU Blue Card, vocational training, or study permit once you have an offer or place.',
      },
    ],
    keyFigures: [
      { label: 'German language requirement', value: 'CEFR A2 minimum (higher may apply per measure)', source: RECOGNITION_SOURCE },
      { label: 'Living costs — company-based measure', value: '€1,200 gross / €941 net per month (2026)', source: RECOGNITION_SOURCE },
      { label: 'Living costs — school-based measure', value: '€1,091 net/month, blocked account or declaration of commitment (2026)', source: RECOGNITION_SOURCE },
      { label: 'Initial validity', value: 'Up to 24 months, extendable by 12', source: RECOGNITION_SOURCE },
      { label: 'Part-time work allowance', value: '20 hrs/week any job; unrelated cap lifted for work matching your target occupation (BA approval needed)', source: RECOGNITION_SOURCE },
    ],
    primarySource: RECOGNITION_SOURCE,
    verifiedAsOf: '2026-07-28',
  },
}
