import { MetadataRoute } from 'next'
import { GUIDE_SLUGS } from '@/lib/guideSlugs'
import { VISA_GUIDES } from '@/lib/visaGuides'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://job-lens.de'
  const now = new Date()

  const guidePages: MetadataRoute.Sitemap = [
    { url: `${base}/guides`, priority: 0.9, changeFrequency: 'weekly' as const, lastModified: now },
    ...Object.entries(GUIDE_SLUGS).map(([slug, id]) => ({
      url: `${base}/guides/${slug}`,
      priority: 0.9,
      changeFrequency: 'monthly' as const,
      lastModified: new Date(VISA_GUIDES[id].verifiedAsOf),
    })),
  ]

  const dachPages = [
    { url: `${base}/`,                       priority: 1.0,  changeFrequency: 'daily'   as const },
    { url: `${base}/app/smart-apply`,        priority: 0.9,  changeFrequency: 'daily'   as const },
    { url: `${base}/app/cv-builder`,         priority: 0.9,  changeFrequency: 'weekly'  as const },
    { url: `${base}/app/cover-letter`,       priority: 0.8,  changeFrequency: 'weekly'  as const },
    { url: `${base}/app/career-scan`,        priority: 0.8,  changeFrequency: 'weekly'  as const },
    { url: `${base}/app/auto-apply`,         priority: 0.8,  changeFrequency: 'weekly'  as const },
    { url: `${base}/app/job-case`,           priority: 0.7,  changeFrequency: 'weekly'  as const },
    { url: `${base}/app/job-case/new`,       priority: 0.7,  changeFrequency: 'weekly'  as const },
    { url: `${base}/app/jobs`,               priority: 0.7,  changeFrequency: 'daily'   as const },
    { url: `${base}/app/interview`,          priority: 0.7,  changeFrequency: 'weekly'  as const },
    { url: `${base}/app/salary-sim`,         priority: 0.6,  changeFrequency: 'weekly'  as const },
    { url: `${base}/app/tracker`,            priority: 0.6,  changeFrequency: 'weekly'  as const },
    { url: `${base}/app/zeugnis`,            priority: 0.6,  changeFrequency: 'weekly'  as const },
    { url: `${base}/app/visa`,               priority: 0.5,  changeFrequency: 'monthly' as const },
    { url: `${base}/app/ai`,                 priority: 0.6,  changeFrequency: 'weekly'  as const },
    { url: `${base}/login`,                  priority: 0.6,  changeFrequency: 'monthly' as const },
    { url: `${base}/contact`,                priority: 0.5,  changeFrequency: 'monthly' as const },
    { url: `${base}/impressum`,              priority: 0.3,  changeFrequency: 'monthly' as const },
    { url: `${base}/privacy`,                priority: 0.3,  changeFrequency: 'monthly' as const },
    { url: `${base}/datenschutz`,            priority: 0.3,  changeFrequency: 'monthly' as const },
    { url: `${base}/agb`,                    priority: 0.3,  changeFrequency: 'monthly' as const },
  ]

  const indiaPages = [
    { url: `${base}/in`,                     priority: 1.0,  changeFrequency: 'daily'   as const },
    { url: `${base}/in/jobs`,                priority: 0.9,  changeFrequency: 'daily'   as const },
    { url: `${base}/in/cv-builder`,          priority: 0.9,  changeFrequency: 'weekly'  as const },
    { url: `${base}/in/cover-letter`,        priority: 0.8,  changeFrequency: 'weekly'  as const },
    { url: `${base}/in/career-scan`,         priority: 0.8,  changeFrequency: 'weekly'  as const },
    { url: `${base}/in/profile-analysis`,    priority: 0.8,  changeFrequency: 'weekly'  as const },
    { url: `${base}/in/auto-apply`,          priority: 0.8,  changeFrequency: 'weekly'  as const },
    { url: `${base}/in/job-case`,            priority: 0.7,  changeFrequency: 'weekly'  as const },
    { url: `${base}/in/job-case/new`,        priority: 0.7,  changeFrequency: 'weekly'  as const },
    { url: `${base}/in/interview`,           priority: 0.7,  changeFrequency: 'weekly'  as const },
    { url: `${base}/in/salary-sim`,          priority: 0.6,  changeFrequency: 'weekly'  as const },
    { url: `${base}/in/tracker`,             priority: 0.6,  changeFrequency: 'weekly'  as const },
    { url: `${base}/in/visa`,                priority: 0.5,  changeFrequency: 'monthly' as const },
    { url: `${base}/in/login`,               priority: 0.6,  changeFrequency: 'monthly' as const },
  ]

  return [...dachPages.map(p => ({ ...p, lastModified: now })), ...indiaPages.map(p => ({ ...p, lastModified: now })), ...guidePages]
}
