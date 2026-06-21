import type { Metadata } from 'next'
import AIWidget from '@/components/AIWidget'
import NavbarIndia from './components/NavbarIndia'

export const metadata: Metadata = {
  title: 'Job-Lens AI — AI Career Platform for India',
  description: 'AI-powered career platform for India. CV analysis, job matching, tailored applications and cover letters in minutes.',
  openGraph: {
    title: 'Job-Lens AI — AI Career Platform for India',
    description: 'AI-powered career platform for India. CV analysis, job matching, tailored applications and cover letters in minutes.',
    url: 'https://job-lens.de/in',
    siteName: 'Job-Lens AI',
    locale: 'en_IN',
    type: 'website',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Job-Lens AI India',
  url: 'https://job-lens.de/in',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: 'AI-powered career platform for India. ATS score, CV tailoring, cover letters, job search and interview prep — in minutes. Free to start.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'INR',
    description: 'Free plan with 5 credits on signup. Paid packs from ₹149.',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    reviewCount: '120',
  },
}

export default function IndiaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <NavbarIndia />
      {children}
      <AIWidget market="in" />
    </>
  )
}
