import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { VISA_GUIDES, type GuideCallout } from '@/lib/visaGuides'
import { GUIDE_SLUGS, GUIDE_SEO } from '@/lib/guideSlugs'
import { theme } from '@/lib/theme'
import { GuideStyles, PublicHeader, PublicFooter, CtaBand, formatVerifiedDate, safeJsonLd } from '../ui'

const { colors: c } = theme
const BASE = 'https://job-lens.de'

export function generateStaticParams() {
  return Object.keys(GUIDE_SLUGS).map(slug => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const id = GUIDE_SLUGS[slug]
  if (!id) return {}
  const seo = GUIDE_SEO[id]
  return {
    title: `${seo.title} | Job-Lens AI`,
    description: seo.description,
    alternates: { canonical: `${BASE}/guides/${slug}` },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `${BASE}/guides/${slug}`,
      siteName: 'Job-Lens AI',
      type: 'article',
    },
  }
}

const CALLOUT_STYLE: Record<GuideCallout['kind'], { border: string; bg: string; label: string }> = {
  requirement: { border: c.accent,  bg: c.primaryLight,  label: 'Requirement' },
  warning:     { border: c.warning, bg: c.warningLight,  label: 'Watch out' },
  tip:         { border: c.success, bg: c.successLight,  label: 'Tip' },
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const id = GUIDE_SLUGS[slug]
  if (!id) notFound()

  const guide = VISA_GUIDES[id]
  const seo = GUIDE_SEO[id]
  const url = `${BASE}/guides/${slug}`

  const howToLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: seo.title,
    description: guide.summary,
    step: guide.steps.map(s => ({
      '@type': 'HowToStep',
      position: s.n,
      name: s.title,
      text: [s.detail, ...(s.subDetails ?? [])].join(' '),
      url: `${url}#step-${s.n}`,
    })),
  }

  const faqLd = guide.faq?.length ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: guide.faq.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  } : null

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Job-Lens AI', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Visa Guides', item: `${BASE}/guides` },
      { '@type': 'ListItem', position: 3, name: guide.officialName.en, item: url },
    ],
  }

  const related = Object.entries(GUIDE_SLUGS).filter(([s]) => s !== slug)

  return (
    <div className="gd-body">
      <GuideStyles />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(howToLd) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqLd) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }} />
      <PublicHeader />

      <div className="gd-wrap" style={{ paddingTop: 36 }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 12, color: c.textFaint, marginBottom: 16 }}>
          <Link href="/guides" style={{ color: c.accent, textDecoration: 'none', fontWeight: 600 }}>Visa Guides</Link>
          {' / '}{guide.officialName.en}
        </div>

        <h1 className="gd-h1" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 32, fontWeight: 800, lineHeight: 1.25, margin: '0 0 10px', color: c.text }}>
          {seo.title.replace(' | Job-Lens AI', '')}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12, color: c.textMuted, marginBottom: 18 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: c.successLight, color: c.success, fontWeight: 700, padding: '3px 10px', borderRadius: 12, border: `1px solid ${c.successBorder}` }}>
            ✓ Verified {formatVerifiedDate(guide.verifiedAsOf)}
          </span>
          <span>
            against{' '}
            <a href={guide.primarySource.url} target="_blank" rel="noopener noreferrer" style={{ color: c.accent, fontWeight: 600 }}>
              {guide.primarySource.label}
            </a>
          </span>
          <span style={{ color: c.textFaint }}>· German name: {guide.officialName.de}</span>
        </div>

        <p style={{ fontSize: 15.5, color: c.text, lineHeight: 1.75, margin: '0 0 22px' }}>{guide.summary}</p>

        {/* Eligibility at a glance */}
        <div style={{ background: c.bgCard, border: `1px solid ${c.borderLight}`, borderRadius: 14, padding: '20px 22px', marginBottom: 8 }}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 700, margin: '0 0 12px', color: c.text }}>Eligibility at a glance</h2>
          {guide.eligibilityAtGlance.map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, fontSize: 14, color: c.text, lineHeight: 1.65, marginBottom: 8 }}>
              <span style={{ color: c.success, fontWeight: 700, flexShrink: 0 }}>✓</span>
              <span>{e}</span>
            </div>
          ))}
        </div>

        <CtaBand compact />

        {/* Steps */}
        <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 700, margin: '30px 0 16px', color: c.text }}>
          How to apply — step by step
        </h2>
        {guide.steps.map(step => (
          <div key={step.n} id={`step-${step.n}`} style={{ background: c.bgCard, border: `1px solid ${c.borderLight}`, borderRadius: 14, padding: '20px 22px', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: c.primaryLight, color: c.navy, fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {step.n}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, margin: '4px 0 8px', color: c.text }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: c.textMuted, lineHeight: 1.7, margin: 0 }}>{step.detail}</p>
                {step.subDetails?.map((sd, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13.5, color: c.textMuted, lineHeight: 1.65, marginTop: 8 }}>
                    <span style={{ color: c.accent, flexShrink: 0 }}>–</span>
                    <span>{sd}</span>
                  </div>
                ))}
                {step.callouts?.map((co, i) => {
                  const s = CALLOUT_STYLE[co.kind]
                  return (
                    <div key={i} style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: s.bg, borderLeft: `3px solid ${s.border}` }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: s.border }}>{s.label}: </span>
                      <span style={{ fontSize: 13, color: c.text, lineHeight: 1.6 }}>{co.text}</span>
                    </div>
                  )
                })}
                {step.source && (
                  <a href={step.source.url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-block', marginTop: 10, fontSize: 12, color: c.accent, fontWeight: 600, textDecoration: 'none' }}>
                    Source: {step.source.label} ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Key figures */}
        <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 700, margin: '30px 0 14px', color: c.text }}>
          Key figures ({new Date(guide.verifiedAsOf).getFullYear()})
        </h2>
        <div style={{ background: c.bgCard, border: `1px solid ${c.borderLight}`, borderRadius: 14, overflow: 'hidden', marginBottom: 8 }}>
          <table className="gd-figures" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {guide.keyFigures.map((kf, i) => (
                <tr key={i} style={{ borderTop: i > 0 ? `1px solid ${c.border}` : 'none' }}>
                  <td style={{ padding: '12px 18px', fontSize: 13.5, color: c.textMuted, verticalAlign: 'top', width: '45%' }}>{kf.label}</td>
                  <td style={{ padding: '12px 18px', fontSize: 13.5, fontWeight: 700, color: c.text, verticalAlign: 'top' }}>
                    {kf.value}
                    <a href={kf.source.url} target="_blank" rel="noopener noreferrer" title={kf.source.label}
                      style={{ marginLeft: 8, fontSize: 11, color: c.accent, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                      source ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 12, color: c.textFaint, marginBottom: 6 }}>
          Figures verified as of {formatVerifiedDate(guide.verifiedAsOf)} against the linked official sources. Thresholds change — always confirm on the source page before relying on them.
        </div>

        {/* FAQ */}
        {guide.faq && guide.faq.length > 0 && (
          <>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 700, margin: '30px 0 14px', color: c.text }}>
              Frequently asked questions
            </h2>
            {guide.faq.map((f, i) => (
              <div key={i} style={{ background: c.bgCard, border: `1px solid ${c.borderLight}`, borderRadius: 14, padding: '18px 22px', marginBottom: 10 }}>
                <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700, margin: '0 0 8px', color: c.text }}>{f.q}</h3>
                <p style={{ fontSize: 14, color: c.textMuted, lineHeight: 1.7, margin: 0 }}>{f.a}</p>
              </div>
            ))}
          </>
        )}

        <CtaBand />

        {/* Related guides */}
        <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 700, margin: '26px 0 12px', color: c.text }}>
          Other routes to Germany
        </h2>
        <div className="gd-grid" style={{ marginBottom: 10 }}>
          {related.map(([s, rid]) => (
            <Link key={s} href={`/guides/${s}`} className="gd-related"
              style={{ display: 'block', background: c.bgCard, border: `1px solid ${c.borderLight}`, borderRadius: 12, padding: '14px 16px', textDecoration: 'none', transition: 'border-color .15s' }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 700, color: c.text, marginBottom: 4 }}>{VISA_GUIDES[rid].officialName.en}</div>
              <div style={{ fontSize: 12, color: c.textMuted, lineHeight: 1.5 }}>{GUIDE_SEO[rid].hubBlurb}</div>
            </Link>
          ))}
        </div>
      </div>

      <PublicFooter />
    </div>
  )
}
