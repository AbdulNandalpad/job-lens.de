import AIWidget from '@/components/AIWidget'
import NavbarIndia from './components/NavbarIndia'

export default function IndiaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavbarIndia />
      {children}
      <AIWidget market="in" />
    </>
  )
}
