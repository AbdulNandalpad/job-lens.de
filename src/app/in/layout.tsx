import type { Metadata } from 'next'
import NavbarIndia from './components/NavbarIndia'

export const metadata: Metadata = {
  title: 'Job-Lens India — ATS Score, CV Builder & Job Search',
  description: 'AI-powered ATS optimization for Indian job seekers. Score your CV against any job description, fix keyword gaps, and beat the bots. Built in Germany, made for India.',
  metadataBase: new URL('https://job-lens.de'),
  openGraph: {
    title: 'Job-Lens India — ATS Score, CV Builder & Job Search',
    description: 'AI-powered ATS optimization for Indian job seekers. Score your CV against any job description, fix keyword gaps, and beat the bots.',
    url: 'https://job-lens.de/in',
    siteName: 'Job-Lens India',
    locale: 'en_US',
    type: 'website',
  },
}

export default function IndiaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
      <NavbarIndia />
      {children}
    </div>
  )
}
