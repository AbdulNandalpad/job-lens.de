// SEO slugs + per-guide metadata for the public /guides pages.
// Content itself lives in visaGuides.ts — this file only maps it to URLs
// and search-optimised titles/descriptions.

import type { VisaOptionId } from '@/lib/visaGuides'

export const GUIDE_SLUGS: Record<string, VisaOptionId> = {
  'eu-blue-card-germany':          'blue_card',
  'germany-work-visa-academic':    'fachkraft_academic',
  'germany-work-visa-vocational':  'fachkraft_vocational',
  'chancenkarte-opportunity-card': 'chancenkarte',
  'recognition-visa-germany':      'anerkennungsvisum',
}

export const SLUG_BY_ID = Object.fromEntries(
  Object.entries(GUIDE_SLUGS).map(([slug, id]) => [id, slug])
) as Record<VisaOptionId, string>

// Search-optimised page titles and descriptions. The year is deliberate —
// it is what makes these pages beat stale content in results. Bump it when
// re-verifying the guide content each year.
export const GUIDE_SEO: Record<VisaOptionId, { title: string; description: string; hubBlurb: string }> = {
  blue_card: {
    title: 'EU Blue Card Germany 2026: Requirements, Salary Threshold & Application Steps',
    description: 'Current EU Blue Card salary thresholds for 2026, who qualifies, and the exact application steps — verified against Germany’s official make-it-in-germany.com portal.',
    hubBlurb: 'For academics with a qualifying job offer — the fastest route to permanent residence.',
  },
  fachkraft_academic: {
    title: 'Germany Work Visa for Academic Professionals 2026: Step-by-Step Guide (§18b)',
    description: 'How degree-holders get a German work visa in 2026: recognition, job offer rules, and every application step — sourced from the official German government portal.',
    hubBlurb: 'The standard skilled-worker visa for university graduates with a job offer.',
  },
  fachkraft_vocational: {
    title: 'Germany Work Visa with Vocational Training 2026: Requirements & Steps (§18a)',
    description: 'No degree needed: how professionals with vocational training qualify for a German work visa in 2026 — recognition process, requirements and steps, officially sourced.',
    hubBlurb: 'For skilled workers with vocational training instead of a university degree.',
  },
  chancenkarte: {
    title: 'Chancenkarte Germany 2026: Opportunity Card Points & Requirements',
    description: 'The complete Chancenkarte points system for 2026 — who gets the German job-seeker Opportunity Card, how points are counted, and how to apply, step by step.',
    hubBlurb: 'Move to Germany to look for a job — no job offer needed, points-based.',
  },
  anerkennungsvisum: {
    title: 'Recognition Visa Germany 2026: Get Your Foreign Qualification Recognised',
    description: 'How the German recognition visa works in 2026: have your foreign qualification recognised while working part-time in Germany — requirements and steps, officially sourced.',
    hubBlurb: 'Come to Germany while your foreign qualification gets recognised.',
  },
}
