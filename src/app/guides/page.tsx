import type { Metadata } from 'next'
import Link from 'next/link'
import { VISA_GUIDES } from '@/lib/visaGuides'
import { GUIDE_SLUGS, GUIDE_SEO } from '@/lib/guideSlugs'
import { theme } from '@/lib/theme'
import { GuideStyles, PublicHeader, PublicFooter, CtaBand, formatVerifiedDate, safeJsonLd } from './ui'

const { colors: c } = theme
const BASE = 'https://job-lens.de'

export const metadata: Metadata = {
  title: 'Germany Work Visa Guides 2026 — Blue Card, Chancenkarte & More | Job-Lens AI',
  description: 'Free step-by-step guides to every German work visa in 2026: EU Blue Card, skilled-worker visas, Chancenkarte and recognition visa — verified against official government sources.',
  alternates: { canonical: `${BASE}/guides` },
  openGraph: {
    title: 'Germany Work Visa Guides 2026 — every route, step by step',
    description: 'EU Blue Card, skilled-worker visas, Chancenkarte, recognition visa — current thresholds and exact steps, verified against make-it-in-germany.com.',
    url: `${BASE}/guides`,
    siteName: 'Job-Lens AI',
    type: 'website',
  },
}

export default function GuidesHubPage() {
  const entries = Object.entries(GUIDE_SLUGS)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Germany Work Visa Guides 2026',
    description: 'Step-by-step guides to every German work visa route, verified against official sources.',
    url: `${BASE}/guides`,
    hasPart: entries.map(([slug, id]) => ({
      '@type': 'Article',
      headline: GUIDE_SEO[id].title,
      url: `${BASE}/guides/${slug}`,
    })),
  }

  return (
    <div className="gd-body">
      <GuideStyles />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <PublicHeader />

      <div className="gd-wrap" style={{ paddingTop: 44, paddingBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: c.accent, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
          Free guides · Verified against official sources
        </div>
        <h1 className="gd-h1" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 34, fontWeight: 800, lineHeight: 1.2, margin: '0 0 14px', color: c.text }}>
          Every route to working in Germany,<br />explained step by step.
        </h1>
        <p style={{ fontSize: 15, color: c.textMuted, lineHeight: 1.7, maxWidth: 620, margin: '0 0 8px' }}>
          Five official visa routes lead to a job in Germany. These guides cover the current {new Date().getFullYear()} requirements, salary thresholds and the exact application steps — every figure verified against{' '}
          <a href="https://www.make-it-in-germany.com/en/" target="_blank" rel="noopener noreferrer" style={{ color: c.accent, fontWeight: 600 }}>make-it-in-germany.com</a>,
          the German government&apos;s official skilled-migration portal. No consultancy fees. No outdated numbers.
        </p>

        <Link href="/guides/chancenkarte-calculator" className="gd-related"
          style={{ display: 'flex', flexDirection: 'column', gap: 8, background: `${c.accent}0a`, border: `1.5px solid ${c.accent}55`, borderRadius: 14, padding: '20px 20px', textDecoration: 'none', transition: 'border-color .15s', marginTop: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: c.accent, letterSpacing: 1, textTransform: 'uppercase' }}>Free tool</div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 17, fontWeight: 700, color: c.text, lineHeight: 1.3 }}>
            Chancenkarte Points Calculator
          </div>
          <div style={{ fontSize: 12.5, color: c.textMuted, lineHeight: 1.6 }}>
            9 questions, instant score against the official 2026 criteria — do you reach the 6 points for Germany&apos;s Opportunity Card?
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: c.accent }}>Calculate my points →</div>
        </Link>

        <div className="gd-grid" style={{ marginTop: 14 }}>
          {entries.map(([slug, id]) => {
            const guide = VISA_GUIDES[id]
            const seo = GUIDE_SEO[id]
            return (
              <Link key={slug} href={`/guides/${slug}`} className="gd-related"
                style={{ display: 'flex', flexDirection: 'column', gap: 8, background: c.bgCard, border: `1px solid ${c.borderLight}`, borderRadius: 14, padding: '20px 20px', textDecoration: 'none', transition: 'border-color .15s' }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: c.text, lineHeight: 1.3 }}>
                  {guide.officialName.en}
                </div>
                <div style={{ fontSize: 12.5, color: c.textMuted, lineHeight: 1.6, flex: 1 }}>{seo.hubBlurb}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: c.accent }}>Read the guide →</div>
              </Link>
            )
          })}
        </div>

        <CtaBand />

        <div style={{ fontSize: 12, color: c.textFaint }}>
          Content verified as of {formatVerifiedDate(VISA_GUIDES.blue_card.verifiedAsOf)}. Immigration rules change — each guide links directly to its official source so you can double-check everything.
        </div>
      </div>

      <PublicFooter />
    </div>
  )
}
