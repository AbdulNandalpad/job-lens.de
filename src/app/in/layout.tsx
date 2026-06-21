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

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is Job-Lens AI for India?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Job-Lens AI is an AI-powered career platform built for Indian job seekers. It searches jobs in India, tailors your CV to specific job descriptions, writes cover letters, auto-applies to jobs, and prepares you for interviews — all powered by Claude AI.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does Job-Lens AI help with ATS scores in India?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Job-Lens AI scans your CV against a job description and gives you an ATS (Applicant Tracking System) score. It identifies missing keywords, skills gaps, and suggests improvements so your CV passes automated screening used by Indian companies and MNCs.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can Job-Lens AI auto-apply to jobs in India?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Job-Lens AI can auto-fill and submit job application forms on Indian job portals using browser automation. You review everything before it submits.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is Job-Lens AI free for Indian users?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Indian users get 5 free credits on signup with no credit card required. Additional credits can be purchased via Razorpay starting from ₹149.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the best AI CV tailoring tool for Indian job seekers?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Job-Lens AI is specifically designed for the Indian job market. It tailors your CV for roles at Indian companies, IT firms, startups and MNCs. It uses Claude AI to rewrite your CV with the right keywords for each job description.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does Job-Lens AI help with career analysis for India?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. The Profile Analysis feature provides a deep AI career analysis for the Indian market — including sector trends, salary benchmarks, top skills in demand, and personalised upskilling advice.',
      },
    },
  ],
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
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
