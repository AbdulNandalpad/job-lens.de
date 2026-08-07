import { MetadataRoute } from 'next'
import { GUIDE_SLUGS } from '@/lib/guideSlugs'
import { VISA_GUIDES } from '@/lib/visaGuides'

// Only genuinely PUBLIC pages belong here. Every /app/* and /in/* feature page
// sits behind auth — Googlebot gets redirected to /login and reports the URL
// as "not indexed", which wastes crawl budget and erodes sitemap trust.
// (That was exactly the "39 not indexed" state in Search Console before this
// cleanup.) If a page is ever made public, add it back deliberately.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://job-lens.de'
  const now = new Date()

  const guidePages: MetadataRoute.Sitemap = [
    { url: `${base}/guides`, priority: 0.9, changeFrequency: 'weekly' as const, lastModified: now },
    { url: `${base}/guides/chancenkarte-calculator`, priority: 0.9, changeFrequency: 'monthly' as const, lastModified: now },
    ...Object.entries(GUIDE_SLUGS).map(([slug, id]) => ({
      url: `${base}/guides/${slug}`,
      priority: 0.9,
      changeFrequency: 'monthly' as const,
      lastModified: new Date(VISA_GUIDES[id].verifiedAsOf),
    })),
  ]

  const publicPages = [
    { url: `${base}/`,           priority: 1.0, changeFrequency: 'daily'   as const },
    { url: `${base}/in`,         priority: 1.0, changeFrequency: 'daily'   as const },
    { url: `${base}/login`,      priority: 0.5, changeFrequency: 'monthly' as const },
    { url: `${base}/in/login`,   priority: 0.5, changeFrequency: 'monthly' as const },
    { url: `${base}/contact`,    priority: 0.4, changeFrequency: 'monthly' as const },
    { url: `${base}/impressum`,  priority: 0.3, changeFrequency: 'monthly' as const },
    { url: `${base}/privacy`,    priority: 0.3, changeFrequency: 'monthly' as const },
    { url: `${base}/datenschutz`, priority: 0.3, changeFrequency: 'monthly' as const },
    { url: `${base}/agb`,        priority: 0.3, changeFrequency: 'monthly' as const },
  ]

  return [...publicPages.map(p => ({ ...p, lastModified: now })), ...guidePages]
}
