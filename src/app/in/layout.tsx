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

export default function IndiaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavbarIndia />
      {children}
      <AIWidget market="in" />
    </>
  )
}
