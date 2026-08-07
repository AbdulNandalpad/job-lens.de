import type { Metadata } from 'next'
import Link from 'next/link'
import { VISA_GUIDES } from '@/lib/visaGuides'
import { theme } from '@/lib/theme'
import { GuideStyles, PublicHeader, PublicFooter, formatVerifiedDate, safeJsonLd } from '../ui'
import Calculator from './calculator'

const { colors: c } = theme
const BASE = 'https://job-lens.de'
const URL_ = `${BASE}/guides/chancenkarte-calculator`

export const metadata: Metadata = {
  title: 'Chancenkarte Points Calculator 2026 — Check Your Opportunity Card Score | Job-Lens AI',
  description: 'Free Chancenkarte points calculator with the official 2026 criteria: qualification, language, experience, age. See instantly if you reach the 6 points for Germany’s Opportunity Card.',
  alternates: { canonical: URL_ },
  openGraph: {
    title: 'Chancenkarte Points Calculator 2026 — do you reach 6 points?',
    description: 'Answer 9 questions, see your score against the official German Opportunity Card criteria — free, no signup.',
    url: URL_,
    siteName: 'Job-Lens AI',
    type: 'website',
  },
}

export default function ChancenkarteCalculatorPage() {
  const guide = VISA_GUIDES.chancenkarte

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Chancenkarte Points Calculator 2026',
      url: URL_,
      applicationCategory: 'BrowserApplication',
      operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      description: 'Interactive points calculator for Germany’s Opportunity Card (Chancenkarte), based on the official 2026 criteria.',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
        { '@type': 'ListItem', position: 2, name: 'Visa Guides', item: `${BASE}/guides` },
        { '@type': 'ListItem', position: 3, name: 'Chancenkarte Points Calculator', item: URL_ },
      ],
    },
  ]

  return (
    <div className="gd-body">
      <GuideStyles />
      {jsonLd.map((block, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(block) }} />
      ))}
      <PublicHeader />

      <div className="gd-wrap" style={{ paddingTop: 40, paddingBottom: 20 }}>
        <nav style={{ fontSize: 12, color: c.textFaint, marginBottom: 16 }}>
          <Link href="/guides" style={{ color: c.accent, textDecoration: 'none' }}>Visa Guides</Link>
          {' / '}Chancenkarte Points Calculator
        </nav>

        <div style={{ fontSize: 12, fontWeight: 700, color: c.accent, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
          Free · No signup · Official 2026 criteria
        </div>
        <h1 className="gd-h1" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 32, fontWeight: 800, lineHeight: 1.25, margin: '0 0 12px', color: c.text }}>
          Chancenkarte Points Calculator 2026
        </h1>
        <p style={{ fontSize: 15, color: c.textMuted, lineHeight: 1.7, maxWidth: 640, margin: '0 0 6px' }}>
          Germany&apos;s Opportunity Card lets you move to Germany for up to a year to look for a job — no job offer needed. If your qualification isn&apos;t yet fully recognised in Germany, you need <strong style={{ color: c.text }}>6 points</strong> in the official points system. Answer the 9 questions below and see your score instantly.
        </p>
        <p style={{ fontSize: 13, color: c.textFaint, lineHeight: 1.6, margin: '0 0 26px' }}>
          Every criterion verified against{' '}
          <a href={guide.primarySource.url} target="_blank" rel="noopener noreferrer" style={{ color: c.accent, fontWeight: 600 }}>
            make-it-in-germany.com
          </a>{' '}
          (official German government portal) as of {formatVerifiedDate(guide.verifiedAsOf)}.
        </p>

        <Calculator />
      </div>

      <PublicFooter />
    </div>
  )
}
