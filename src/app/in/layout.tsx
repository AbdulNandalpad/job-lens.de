import type { Metadata } from 'next'
import NavbarIndia from './components/NavbarIndia'
import GeoBanner from '@/components/india/GeoBanner'

export const metadata: Metadata = {
  title: 'Job-Lens India — ATS Score, CV Builder & Job Search',
  description: 'AI-powered ATS optimization for Indian job seekers. Score your CV against any job description, fix keyword gaps, and beat the bots. Built in Germany, made for India.',
}

export default function IndiaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
      <NavbarIndia />
      {children}
      <GeoBanner />
    </div>
  )
}
