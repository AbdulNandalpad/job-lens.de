import type { Metadata } from 'next'
import { VISA_GUIDES } from '@/lib/visaGuides'
import { GUIDE_SLUGS, GUIDE_SEO } from '@/lib/guideSlugs'
import { theme } from '@/lib/theme'
import { GuideStyles, PublicHeader, PublicFooter, CtaBand, formatVerifiedDate, safeJsonLd, GUIDE_ACCENTS, GuideIcon, GermanFlag, TricolorBar } from './ui'
import TiltCard from './TiltCard'

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
    <div className="gd-body gd-stage">
      <GuideStyles />
      <div className="gd-orb gd-orb-1" aria-hidden />
      <div className="gd-orb gd-orb-2" aria-hidden />
      <div className="gd-orb gd-orb-3" aria-hidden />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <PublicHeader />

      <div className="gd-wrap" style={{ paddingTop: 44, paddingBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <GermanFlag />
          <span style={{ fontSize: 12, fontWeight: 700, color: c.accent, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Free guides · Verified against official sources
          </span>
        </div>
        <h1 className="gd-h1" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 34, fontWeight: 800, lineHeight: 1.2, margin: '0 0 12px', color: c.text }}>
          Every route to working in Germany,<br />explained step by step.
        </h1>
        <div style={{ marginBottom: 16 }}><TricolorBar /></div>
        <p style={{ fontSize: 15, color: c.textMuted, lineHeight: 1.7, maxWidth: 620, margin: '0 0 8px' }}>
          Five official visa routes lead to a job in Germany. These guides cover the current {new Date().getFullYear()} requirements, salary thresholds and the exact application steps — every figure verified against{' '}
          <a href="https://www.make-it-in-germany.com/en/" target="_blank" rel="noopener noreferrer" style={{ color: c.accent, fontWeight: 600 }}>make-it-in-germany.com</a>,
          the German government&apos;s official skilled-migration portal. No consultancy fees. No outdated numbers.
        </p>

        <TiltCard href="/guides/chancenkarte-calculator" accent={c.accent} className="gd-pop"
          style={{ display: 'flex', flexDirection: 'column', gap: 8, background: `${c.accent}0a`, border: `1.5px solid ${c.accent}55`, borderRadius: 14, padding: '20px 20px', textDecoration: 'none', marginTop: 28, animationDelay: '.05s' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: c.accent, letterSpacing: 1, textTransform: 'uppercase' }}>Free tool</div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 17, fontWeight: 700, color: c.text, lineHeight: 1.3 }}>
            Chancenkarte Points Calculator
          </div>
          <div style={{ fontSize: 12.5, color: c.textMuted, lineHeight: 1.6 }}>
            9 questions, instant score against the official 2026 criteria — do you reach the 6 points for Germany&apos;s Opportunity Card?
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: c.accent }}>Calculate my points →</div>
        </TiltCard>

        <div className="gd-grid" style={{ marginTop: 14 }}>
          {entries.map(([slug, id], i) => {
            const guide = VISA_GUIDES[id]
            const seo = GUIDE_SEO[id]
            const accent = GUIDE_ACCENTS[id]
            return (
              <TiltCard key={slug} href={`/guides/${slug}`} accent={accent.color} className="gd-pop"
                style={{ display: 'flex', flexDirection: 'column', gap: 8, background: `linear-gradient(175deg, ${c.bgCard} 60%, ${accent.color}0a 100%)`, border: `1px solid ${c.borderLight}`, borderTop: `3px solid ${accent.color}`, borderRadius: 14, padding: '18px 20px 20px', textDecoration: 'none', animationDelay: `${0.15 + i * 0.08}s` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 34, height: 34, borderRadius: 10, background: `${accent.color}14`, border: `1px solid ${accent.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <GuideIcon id={id} size={17} color={accent.color} />
                  </span>
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: c.text, lineHeight: 1.3 }}>
                    {guide.officialName.en}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: c.textMuted, lineHeight: 1.6, flex: 1 }}>{seo.hubBlurb}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: accent.color }}>Read the guide →</div>
              </TiltCard>
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
